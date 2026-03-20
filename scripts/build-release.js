#!/usr/bin/env node

/**
 * Build release artifacts for Mega Facebook
 * This script orchestrates the build process for all components
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const VERSION = process.env.VERSION || process.argv[2] || '0.0.1';
const BUILD_DIR = path.join(process.cwd(), 'dist', 'release');

console.log('🚀 Mega Facebook Release Builder');
console.log('================================');
console.log(`📦 Version: ${VERSION}`);
console.log(`📁 Build directory: ${BUILD_DIR}`);
console.log('');

// Helper function to run commands
function run(command, options = {}) {
  console.log(`▶️  ${command}`);
  try {
    execSync(command, {
      stdio: 'inherit',
      ...options
    });
    return true;
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    if (!options.ignoreError) {
      throw error;
    }
    return false;
  }
}

// Helper to check if directory exists
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Update version in package.json files
function updateVersions() {
  console.log('📝 Updating package versions...');

  const packages = [
    'package.json',
    'apps/api/package.json',
    'apps/web/package.json',
    'packages/shared/package.json',
    'packages/ui/package.json',
    'packages/cli/package.json'
  ];

  packages.forEach(pkgPath => {
    const fullPath = path.join(process.cwd(), pkgPath);
    if (fs.existsSync(fullPath)) {
      const pkg = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      pkg.version = VERSION;
      fs.writeFileSync(fullPath, JSON.stringify(pkg, null, 2) + '\n');
      console.log(`   ✅ Updated ${pkgPath}`);
    }
  });
}

// Build all packages
function buildPackages() {
  console.log('\n📦 Building packages...');

  // Install dependencies
  console.log('   Installing dependencies...');
  run('pnpm install --frozen-lockfile');

  // Build shared packages
  console.log('   Building shared packages...');
  run('pnpm --filter @mega/shared build', { ignoreError: true });
  run('pnpm --filter @mega/ui build', { ignoreError: true });

  // Build applications
  console.log('   Building API...');
  run('pnpm --filter api prisma:generate');
  run('pnpm --filter api build');

  console.log('   Building Web...');
  run('pnpm --filter web build');

  // Build CLI
  console.log('   Building CLI...');
  if (fs.existsSync('packages/cli')) {
    run('pnpm --filter @mega/cli build', { ignoreError: true });
  }
}

// Create production bundles
function createBundles() {
  console.log('\n📦 Creating production bundles...');

  ensureDir(BUILD_DIR);

  // API Bundle
  console.log('   Creating API bundle...');
  const apiFiles = [
    'apps/api/dist',
    'apps/api/prisma',
    'apps/api/package.json',
    'apps/api/tsconfig.json',
    'apps/api/.env.example'
  ].filter(f => fs.existsSync(f)).join(' ');

  run(`tar -czf ${BUILD_DIR}/mega-facebook-api-${VERSION}.tar.gz ${apiFiles}`);

  // Web Bundle
  console.log('   Creating Web bundle...');
  const webFiles = [
    'apps/web/.next',
    'apps/web/public',
    'apps/web/package.json',
    'apps/web/next.config.js',
    'apps/web/tsconfig.json'
  ].filter(f => fs.existsSync(f)).join(' ');

  run(`tar -czf ${BUILD_DIR}/mega-facebook-web-${VERSION}.tar.gz ${webFiles}`);

  // Complete source bundle
  console.log('   Creating complete bundle...');
  run(`tar -czf ${BUILD_DIR}/mega-facebook-complete-${VERSION}.tar.gz \
    --exclude=.git \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=.next \
    --exclude=coverage \
    --exclude='*.log' \
    .`);

  // CLI binaries (placeholder)
  console.log('   Creating CLI binaries...');
  const platforms = ['linux-x64', 'darwin-x64', 'darwin-arm64', 'win-x64'];
  platforms.forEach(platform => {
    const ext = platform.includes('win') ? '.exe' : '';
    const cliPath = `${BUILD_DIR}/mega-cli-${platform}${ext}`;

    // Create a simple wrapper script
    const content = platform.includes('win')
      ? `@echo off\nnode "%~dp0\\cli.js" %*`
      : `#!/usr/bin/env node\nrequire('./cli.js');`;

    fs.writeFileSync(cliPath, content);
    if (!platform.includes('win')) {
      fs.chmodSync(cliPath, 0o755);
    }
  });
}

// Generate checksums
function generateChecksums() {
  console.log('\n🔐 Generating checksums...');

  const files = fs.readdirSync(BUILD_DIR);
  const checksums = [];

  files.forEach(file => {
    if (file === 'checksums.sha256') return;

    const filePath = path.join(BUILD_DIR, file);
    if (fs.statSync(filePath).isFile()) {
      const hash = require('crypto')
        .createHash('sha256')
        .update(fs.readFileSync(filePath))
        .digest('hex');
      checksums.push(`${hash}  ${file}`);
    }
  });

  fs.writeFileSync(
    path.join(BUILD_DIR, 'checksums.sha256'),
    checksums.join('\n') + '\n'
  );

  console.log(`   ✅ Generated checksums for ${checksums.length} files`);
}

// Generate manifest
function generateManifest() {
  console.log('\n📋 Generating manifest...');

  const files = fs.readdirSync(BUILD_DIR);
  const manifest = {
    version: VERSION,
    tag: `v${VERSION}`,
    timestamp: new Date().toISOString(),
    commit: process.env.GITHUB_SHA || 'local',
    artifacts: {}
  };

  files.forEach(file => {
    const filePath = path.join(BUILD_DIR, file);
    if (fs.statSync(filePath).isFile() && file !== 'manifest.json') {
      const stats = fs.statSync(filePath);
      manifest.artifacts[file] = {
        size: stats.size,
        modified: stats.mtime.toISOString()
      };
    }
  });

  fs.writeFileSync(
    path.join(BUILD_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  console.log('   ✅ Manifest generated');
}

// Main build process
async function main() {
  try {
    // Update versions
    updateVersions();

    // Build all packages
    buildPackages();

    // Create bundles
    createBundles();

    // Generate checksums
    generateChecksums();

    // Generate manifest
    generateManifest();

    console.log('\n✅ Build completed successfully!');
    console.log(`📦 Artifacts available at: ${BUILD_DIR}`);

    // List created files
    console.log('\n📁 Created artifacts:');
    fs.readdirSync(BUILD_DIR).forEach(file => {
      const filePath = path.join(BUILD_DIR, file);
      const stats = fs.statSync(filePath);
      if (stats.isFile()) {
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        console.log(`   - ${file} (${sizeMB} MB)`);
      }
    });

  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { main, updateVersions, buildPackages, createBundles };