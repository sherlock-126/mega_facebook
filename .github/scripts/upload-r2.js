#!/usr/bin/env node

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import path from 'node:path';

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    version: { type: 'string' },
    artifacts: { type: 'string' }, // comma-separated list
  },
});

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function uploadFile(filePath, key) {
  const fileContent = readFileSync(filePath);
  const contentType = getContentType(filePath);

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME || 'maytrix',
    Key: key,
    Body: fileContent,
    ContentType: contentType,
    CacheControl: 'public, max-age=3600',
  });

  try {
    await s3Client.send(command);
    console.log(`✅ Uploaded ${filePath} to ${key}`);
  } catch (error) {
    console.error(`❌ Failed to upload ${filePath}:`, error);
    throw error;
  }
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.json':
      return 'application/json';
    case '.tar':
    case '.gz':
    case '.tar.gz':
      return 'application/gzip';
    default:
      return 'application/octet-stream';
  }
}

async function main() {
  const version = values.version;
  const artifacts = values.artifacts.split(',').map(a => a.trim());

  // Determine version path
  const versionPath = version === 'latest' ? 'latest' : `v${version}`;

  // Upload artifacts
  for (const artifact of artifacts) {
    const fileName = path.basename(artifact);
    const key = `releases/${versionPath}/${fileName}`;
    await uploadFile(artifact, key);
  }

  // Also upload to 'latest' if this is not a pre-release
  if (!version.includes('-') && version !== 'latest') {
    console.log('📦 Also updating latest...');
    for (const artifact of artifacts) {
      const fileName = path.basename(artifact);
      const key = `releases/latest/${fileName}`;
      await uploadFile(artifact, key);
    }
  }

  console.log('🎉 All artifacts uploaded successfully!');
}

main().catch(error => {
  console.error('Upload failed:', error);
  process.exit(1);
});