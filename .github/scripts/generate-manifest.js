#!/usr/bin/env node

import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    version: { type: 'string' },
    buildId: { type: 'string' },
    apiSize: { type: 'string' },
    webSize: { type: 'string' },
    apiChecksum: { type: 'string' },
    webChecksum: { type: 'string' },
  },
});

const baseUrl = process.env.R2_PUBLIC_URL || 'https://maytrix.pub.r2.dev';
const versionPath = values.version === 'latest' ? 'latest' : `v${values.version}`;

const manifest = {
  version: values.version,
  buildId: values.buildId,
  timestamp: new Date().toISOString(),
  artifacts: {
    api: {
      url: `${baseUrl}/releases/${versionPath}/api.tar.gz`,
      size: parseInt(values.apiSize),
      checksum: values.apiChecksum,
    },
    web: {
      url: `${baseUrl}/releases/${versionPath}/web.tar.gz`,
      size: parseInt(values.webSize),
      checksum: values.webChecksum,
    },
  },
  requirements: {
    node: '>=20.0.0',
    docker: '>=24.0.0',
  },
};

writeFileSync('manifest.json', JSON.stringify(manifest, null, 2));
console.log('✅ Generated manifest.json');
console.log(JSON.stringify(manifest, null, 2));