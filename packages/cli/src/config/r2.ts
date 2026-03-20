export const R2_CONFIG = {
  bucket: 'maytrix',
  projectPrefix: 'mega-facebook',
  baseUrl: 'https://maytrix.r2.cloudflarestorage.com/mega-facebook',
  endpoints: {
    manifest: (version?: string) =>
      version
        ? `https://maytrix.r2.cloudflarestorage.com/mega-facebook/releases/v${version}/manifest.json`
        : `https://maytrix.r2.cloudflarestorage.com/mega-facebook/releases/latest/manifest.json`,
    versions: 'https://maytrix.r2.cloudflarestorage.com/mega-facebook/releases/versions.json',
    artifact: (version: string, artifact: string) =>
      `https://maytrix.r2.cloudflarestorage.com/mega-facebook/releases/v${version}/${artifact}.tar.gz`,
  },
};