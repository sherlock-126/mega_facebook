import axios, { AxiosError } from 'axios';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { pipeline } from 'stream/promises';
import { R2_CONFIG, Manifest, VersionInfo } from '../config/r2.js';
import { logger } from '../utils/logger.js';
import { spinner } from '../utils/spinner.js';

export class R2Client {
  private async fetchWithRetry<T>(url: string, attempt: number = 1): Promise<T> {
    try {
      const response = await axios.get<T>(url, {
        timeout: R2_CONFIG.download.timeout,
        validateStatus: (status) => status < 500
      });

      if (response.status === 404) {
        throw new Error(`Resource not found: ${url}`);
      }

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.data;
    } catch (error) {
      if (attempt >= R2_CONFIG.retry.attempts) {
        if (error instanceof AxiosError) {
          if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
          }
        }
        throw error;
      }

      const delay = R2_CONFIG.retry.delay * Math.pow(R2_CONFIG.retry.backoff, attempt - 1);
      logger.debug(`Retry attempt ${attempt} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.fetchWithRetry<T>(url, attempt + 1);
    }
  }

  async fetchManifest(version: string = 'latest'): Promise<Manifest> {
    const url = R2_CONFIG.getManifestUrl(version);
    logger.debug(`Fetching manifest from: ${url}`);

    try {
      return await this.fetchWithRetry<Manifest>(url);
    } catch (error: any) {
      if (error.message.includes('not found')) {
        throw new Error(`Phiên bản ${version} không tồn tại trên cloud.`);
      }
      throw new Error(`Không thể tải manifest: ${error.message}`);
    }
  }

  async fetchVersions(): Promise<VersionInfo[]> {
    const url = R2_CONFIG.getVersionsUrl();
    logger.debug(`Fetching versions from: ${url}`);

    try {
      return await this.fetchWithRetry<VersionInfo[]>(url);
    } catch (error: any) {
      logger.warn('Không thể tải danh sách phiên bản');
      return [];
    }
  }

  async downloadArtifact(
    url: string,
    destination: string,
    expectedChecksum?: string,
    expectedSize?: number
  ): Promise<void> {
    const tempFile = `${destination}.download`;
    let downloadedBytes = 0;

    try {
      // Check if partial download exists
      if (await fs.pathExists(tempFile) && R2_CONFIG.download.resumeEnabled) {
        const stats = await fs.stat(tempFile);
        downloadedBytes = stats.size;
        logger.info(`Tiếp tục tải từ ${this.formatBytes(downloadedBytes)}...`);
      }

      // Create download stream with resume support
      const headers: any = {};
      if (downloadedBytes > 0) {
        headers['Range'] = `bytes=${downloadedBytes}-`;
      }

      const response = await axios({
        method: 'GET',
        url,
        responseType: 'stream',
        timeout: R2_CONFIG.download.timeout,
        headers
      });

      const totalSize = expectedSize || parseInt(response.headers['content-length'] || '0');
      const writeStream = fs.createWriteStream(tempFile, {
        flags: downloadedBytes > 0 ? 'a' : 'w'
      });

      // Progress tracking
      let progressBar: any;
      if (totalSize > 0) {
        progressBar = spinner.start(`Đang tải: 0%`);
        response.data.on('data', (chunk: Buffer) => {
          downloadedBytes += chunk.length;
          const percentage = Math.round((downloadedBytes / totalSize) * 100);
          progressBar.text = `Đang tải: ${percentage}% (${this.formatBytes(downloadedBytes)}/${this.formatBytes(totalSize)})`;
        });
      }

      // Download
      await pipeline(response.data, writeStream);

      if (progressBar) {
        progressBar.succeed('Tải xuống hoàn tất');
      }

      // Verify checksum if provided
      if (expectedChecksum) {
        await this.verifyChecksum(tempFile, expectedChecksum);
      }

      // Move temp file to final destination
      await fs.move(tempFile, destination, { overwrite: true });

    } catch (error: any) {
      // Clean up on error
      if (!R2_CONFIG.download.resumeEnabled) {
        await fs.remove(tempFile);
      }

      if (error instanceof AxiosError) {
        if (error.code === 'ECONNRESET') {
          throw new Error('Kết nối bị ngắt. Vui lòng thử lại.');
        }
      }

      throw new Error(`Tải xuống thất bại: ${error.message}`);
    }
  }

  private async verifyChecksum(filePath: string, expectedChecksum: string): Promise<void> {
    spinner.start('Đang xác minh tính toàn vẹn...');

    try {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      for await (const chunk of stream) {
        hash.update(chunk);
      }

      const actualChecksum = hash.digest('hex');

      if (actualChecksum !== expectedChecksum) {
        spinner.fail('Checksum không khớp!');
        throw new Error('File tải xuống bị hỏng. Vui lòng thử lại.');
      }

      spinner.succeed('Xác minh thành công');
    } catch (error) {
      spinner.fail('Lỗi khi xác minh file');
      throw error;
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }

  async checkDiskSpace(requiredBytes: number, targetPath: string): Promise<boolean> {
    try {
      // Simple check - ensure parent directory exists
      const parentDir = path.dirname(targetPath);
      await fs.ensureDir(parentDir);

      // For now, we'll just return true
      // In production, we'd use a library like 'check-disk-space'
      return true;
    } catch (error) {
      logger.warn('Không thể kiểm tra dung lượng đĩa');
      return true; // Continue anyway
    }
  }
}