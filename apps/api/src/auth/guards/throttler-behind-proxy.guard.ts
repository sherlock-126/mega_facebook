import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, unknown>): Promise<string> {
    const forwarded = (req.headers as Record<string, string>)?.['x-forwarded-for'];
    const ip = forwarded
      ? forwarded.split(',')[0].trim()
      : (req.ip as string);
    return Promise.resolve(ip);
  }
}
