export const R2_CONFIG = {
  accountId: 'f7dfac1ca34f6e838fb035fd562bcff3',
  bucketName: 'maytrix',

  // Public R2 URL - can be overridden by environment variable
  baseUrl: process.env.R2_PUBLIC_URL || 'https://maytrix.pub.r2.dev',

  // Paths
  paths: {
    releases: '/releases',
    latest: '/releases/latest',
    versioned: (version: string) => `/releases/v${version}`,
    manifest: '/manifest.json',
    versions: '/releases/versions.json',
    apiArtifact: '/api.tar.gz',
    webArtifact: '/web.tar.gz'
  },

  // URLs
  getManifestUrl(version: string = 'latest'): string {
    const base = version === 'latest'
      ? this.paths.latest
      : this.paths.versioned(version);
    return `${this.baseUrl}${base}${this.paths.manifest}`;
  },

  getArtifactUrl(type: 'api' | 'web', version: string = 'latest'): string {
    const base = version === 'latest'
      ? this.paths.latest
      : this.paths.versioned(version);
    const artifact = type === 'api' ? this.paths.apiArtifact : this.paths.webArtifact;
    return `${this.baseUrl}${base}${artifact}`;
  },

  getVersionsUrl(): string {
    return `${this.baseUrl}${this.paths.versions}`;
  },

  // Retry configuration
  retry: {
    attempts: 3,
    delay: 1000, // ms
    backoff: 2 // exponential backoff multiplier
  },

  // Download configuration
  download: {
    timeout: 300000, // 5 minutes
    chunkSize: 1024 * 1024, // 1MB chunks
    resumeEnabled: true
  }
};

export interface Manifest {
  version: string;
  buildId: string;
  timestamp: string;
  artifacts: {
    api: ArtifactInfo;
    web: ArtifactInfo;
  };
  requirements?: {
    node?: string;
    docker?: string;
  };
}

export interface ArtifactInfo {
  url: string;
  size: number;
  checksum: string; // sha256
}

export interface VersionInfo {
  version: string;
  releaseDate: string;
  stable: boolean;
}