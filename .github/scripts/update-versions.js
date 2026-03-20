#!/usr/bin/env node

import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    version: { type: 'string' },
    stable: { type: 'string' }, // "true" or "false"
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

const bucketName = process.env.R2_BUCKET_NAME || 'maytrix';

async function getVersions() {
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: 'releases/versions.json',
    });

    const response = await s3Client.send(command);
    const content = await streamToString(response.Body);
    return JSON.parse(content);
  } catch (error) {
    // If file doesn't exist, return empty array
    if (error.name === 'NoSuchKey') {
      return [];
    }
    throw error;
  }
}

async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

async function updateVersions(versions) {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: 'releases/versions.json',
    Body: JSON.stringify(versions, null, 2),
    ContentType: 'application/json',
    CacheControl: 'public, max-age=300', // 5 minutes cache
  });

  await s3Client.send(command);
}

async function main() {
  const version = values.version;
  const isStable = values.stable === 'true';

  console.log(`📝 Updating versions.json with ${version} (stable: ${isStable})`);

  // Get existing versions
  let versions = await getVersions();

  // Remove existing entry if present
  versions = versions.filter(v => v.version !== version);

  // Add new version at the beginning
  versions.unshift({
    version: version,
    releaseDate: new Date().toISOString(),
    stable: isStable,
  });

  // Keep only last 50 versions
  versions = versions.slice(0, 50);

  // Update versions.json
  await updateVersions(versions);

  console.log(`✅ Updated versions.json with ${versions.length} versions`);
}

main().catch(error => {
  console.error('Failed to update versions:', error);
  process.exit(1);
});