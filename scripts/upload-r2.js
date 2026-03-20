#!/usr/bin/env node

/**
 * Upload release artifacts to Cloudflare R2
 * Requires environment variables:
 * - R2_ACCOUNT_ID
 * - R2_ACCESS_KEY_ID
 * - R2_SECRET_ACCESS_KEY
 */

const { S3Client, PutObjectCommand, HeadObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const R2_BUCKET = process.env.R2_BUCKET || 'maytrix';
const VERSION = process.env.VERSION || process.argv[2] || '0.0.1';
const VERSION_TAG = VERSION.startsWith('v') ? VERSION : `v${VERSION}`;
const BUILD_DIR = path.join(process.cwd(), 'dist', 'release');
const FORCE_UPLOAD = process.env.FORCE_UPLOAD === 'true';

// R2 credentials from environment
const R2_CONFIG = {
  accountId: process.env.R2_ACCOUNT_ID,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
};

// Validate configuration
if (!R2_CONFIG.accountId || !R2_CONFIG.accessKeyId || !R2_CONFIG.secretAccessKey) {
  console.error('❌ Missing R2 credentials. Required environment variables:');
  console.error('   - R2_ACCOUNT_ID');
  console.error('   - R2_ACCESS_KEY_ID');
  console.error('   - R2_SECRET_ACCESS_KEY');
  process.exit(1);
}

// Initialize S3 client for R2
const client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_CONFIG.accessKeyId,
    secretAccessKey: R2_CONFIG.secretAccessKey
  },
  forcePathStyle: false
});

console.log('🚀 Cloudflare R2 Upload Tool');
console.log('============================');
console.log(`📦 Version: ${VERSION_TAG}`);
console.log(`🪣 Bucket: ${R2_BUCKET}`);
console.log(`📁 Source: ${BUILD_DIR}`);
console.log('');

// Helper to calculate SHA256 hash
function calculateHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha256');
  hash.update(fileBuffer);
  return hash.digest('hex');
}

// Determine content type
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    '.tar.gz': 'application/gzip',
    '.gz': 'application/gzip',
    '.json': 'application/json',
    '.yml': 'text/yaml',
    '.yaml': 'text/yaml',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.sha256': 'text/plain',
    '.exe': 'application/x-msdownload',
    '.sh': 'application/x-sh',
    '': 'application/octet-stream' // Default for no extension (CLI binaries)
  };
  return contentTypes[ext] || 'application/octet-stream';
}

// Check if object exists
async function objectExists(key) {
  try {
    await client.send(new HeadObjectCommand({
      Bucket: R2_BUCKET,
      Key: key
    }));
    return true;
  } catch (error) {
    return false;
  }
}

// Upload a single file
async function uploadFile(filePath, key) {
  const fileStats = fs.statSync(filePath);
  const fileName = path.basename(filePath);

  // Set cache headers
  let cacheControl = 'public, max-age=31536000, immutable'; // 1 year for versioned
  if (key.includes('/latest/')) {
    cacheControl = 'public, max-age=300, must-revalidate'; // 5 min for latest
  }

  const metadata = {
    version: VERSION_TAG,
    uploadTime: new Date().toISOString(),
    sha256: calculateHash(filePath)
  };

  try {
    // Use multipart upload for large files
    if (fileStats.size > 50 * 1024 * 1024) { // > 50MB
      console.log(`   📤 Uploading ${fileName} (${(fileStats.size / 1024 / 1024).toFixed(2)} MB) [multipart]...`);

      const upload = new Upload({
        client,
        params: {
          Bucket: R2_BUCKET,
          Key: key,
          Body: fs.createReadStream(filePath),
          ContentType: getContentType(filePath),
          CacheControl: cacheControl,
          Metadata: metadata
        },
        partSize: 10 * 1024 * 1024, // 10MB parts
        queueSize: 4,
        leavePartsOnError: false
      });

      upload.on('httpUploadProgress', (progress) => {
        if (progress.loaded && progress.total) {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          process.stdout.write(`\r      Progress: ${percent}%`);
        }
      });

      await upload.done();
      console.log('\r      ✅ Uploaded successfully');
    } else {
      // Simple upload for smaller files
      console.log(`   📤 Uploading ${fileName} (${(fileStats.size / 1024 / 1024).toFixed(2)} MB)...`);

      await client.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: fs.readFileSync(filePath),
        ContentType: getContentType(filePath),
        CacheControl: cacheControl,
        Metadata: metadata
      }));

      console.log(`      ✅ Uploaded successfully`);
    }

    return {
      key,
      size: fileStats.size,
      hash: metadata.sha256,
      url: `https://r2.maytrix.io/${key}`
    };
  } catch (error) {
    console.error(`      ❌ Failed to upload: ${error.message}`);
    throw error;
  }
}

// Upload all files in a directory
async function uploadDirectory(localDir, remotePrefix) {
  const files = fs.readdirSync(localDir);
  const uploaded = [];

  for (const file of files) {
    const filePath = path.join(localDir, file);

    if (fs.statSync(filePath).isFile()) {
      const key = `${remotePrefix}/${file}`;
      const result = await uploadFile(filePath, key);
      uploaded.push(result);
    }
  }

  return uploaded;
}

// Create metadata files
async function createMetadata(uploadedFiles) {
  console.log('\n📝 Creating metadata files...');

  // Create latest-version.txt
  const versionFile = path.join(BUILD_DIR, 'latest-version.txt');
  fs.writeFileSync(versionFile, VERSION_TAG.replace('v', ''));
  await uploadFile(versionFile, 'metadata/latest-version.txt');

  // Create versions.json
  const versionsData = {
    latest: VERSION_TAG.replace('v', ''),
    latestTag: VERSION_TAG,
    versions: [VERSION_TAG], // In production, this would append to existing
    updated: new Date().toISOString(),
    files: uploadedFiles.reduce((acc, file) => {
      const name = path.basename(file.key);
      acc[name] = {
        size: file.size,
        sha256: file.hash,
        url: file.url
      };
      return acc;
    }, {})
  };

  const versionsFile = path.join(BUILD_DIR, 'versions.json');
  fs.writeFileSync(versionsFile, JSON.stringify(versionsData, null, 2));
  await uploadFile(versionsFile, 'metadata/versions.json');

  console.log('   ✅ Metadata files created');
}

// Main upload process
async function main() {
  try {
    // Check if build directory exists
    if (!fs.existsSync(BUILD_DIR)) {
      throw new Error(`Build directory not found: ${BUILD_DIR}`);
    }

    // Check if version already exists
    const versionKey = `releases/${VERSION_TAG}/manifest.json`;
    if (await objectExists(versionKey)) {
      if (!FORCE_UPLOAD) {
        throw new Error(
          `Version ${VERSION_TAG} already exists in R2.\n` +
          `Use FORCE_UPLOAD=true to overwrite.`
        );
      }
      console.warn('⚠️  Warning: Overwriting existing version');
    }

    // Upload to version-specific directory
    console.log(`\n📤 Uploading to releases/${VERSION_TAG}/...`);
    const versionFiles = await uploadDirectory(BUILD_DIR, `releases/${VERSION_TAG}`);

    // Upload to latest directory
    console.log(`\n📤 Updating releases/latest/...`);
    const latestFiles = await uploadDirectory(BUILD_DIR, `releases/latest`);

    // Create metadata
    await createMetadata(versionFiles);

    // Generate download URLs
    console.log('\n' + '='.repeat(70));
    console.log('✅ Upload completed successfully!');
    console.log('='.repeat(70));
    console.log('\n📥 Download URLs:');
    console.log(`   Complete: https://r2.maytrix.io/releases/${VERSION_TAG}/mega-facebook-complete-${VERSION}.tar.gz`);
    console.log(`   API:      https://r2.maytrix.io/releases/${VERSION_TAG}/mega-facebook-api-${VERSION}.tar.gz`);
    console.log(`   Web:      https://r2.maytrix.io/releases/${VERSION_TAG}/mega-facebook-web-${VERSION}.tar.gz`);
    console.log(`   Manifest: https://r2.maytrix.io/releases/${VERSION_TAG}/manifest.json`);
    console.log('\n🔗 Latest version:');
    console.log(`   https://r2.maytrix.io/releases/latest/`);
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n❌ Upload failed:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { uploadFile, uploadDirectory, createMetadata };