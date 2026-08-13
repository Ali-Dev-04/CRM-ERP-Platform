import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketCorsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomBytes } from 'crypto';
import { ConfigService } from '../../config/config.service';
import { ValidationError } from '../../common/exceptions/domain.exception';
import { ErrorCodes } from '../../common/exceptions/error-codes';

const UPLOAD_TTL_SECONDS = 300;
const DOWNLOAD_TTL_SECONDS = 300;

/**
 * S3-compatible object storage (MinIO in dev). Clients upload/download blobs
 * directly via short-lived presigned URLs — file bytes never traverse the API,
 * which keeps the API stateless and the upload path scalable.
 *
 * On startup, the service auto-creates the bucket if it doesn't exist and sets
 * a permissive CORS policy so browser uploads (cross-origin presigned PUTs)
 * work without extra configuration.
 */
@Injectable()
export class S3Service implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.value.S3_BUCKET;
    this.enabled = Boolean(config.value.S3_ENDPOINT && config.value.S3_ACCESS_KEY_ID && config.value.S3_SECRET_ACCESS_KEY);
    this.client = this.enabled
      ? new S3Client({
          region: config.value.S3_REGION,
          endpoint: config.value.S3_ENDPOINT,
          forcePathStyle: true, // required for MinIO; harmless for real S3
          credentials: {
            accessKeyId: config.value.S3_ACCESS_KEY_ID!,
            secretAccessKey: config.value.S3_SECRET_ACCESS_KEY!,
          },
        })
      : null;
  }

  async onModuleInit(): Promise<void> {
    if (!this.client) return;
    await this.ensureBucket();
    await this.ensureCors();
  }

  /** Mint a unique object key scoped to the workspace. */
  createKey(workspaceId: string, fileName: string): string {
    const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : '';
    return `${workspaceId}/${randomBytes(12).toString('hex')}${ext}`;
  }

  /** Presign a PUT URL the client uploads the bytes to. */
  async presignUpload(key: string, contentType: string): Promise<string> {
    this.requireEnabled();
    return getSignedUrl(
      this.client!,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
      { expiresIn: UPLOAD_TTL_SECONDS },
    );
  }

  /** Presign a GET URL for downloading an object. */
  async presignDownload(key: string): Promise<string> {
    this.requireEnabled();
    return getSignedUrl(
      this.client!,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: DOWNLOAD_TTL_SECONDS },
    );
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  onModuleDestroy(): void {
    this.client?.destroy();
  }

  private requireEnabled(): void {
    if (!this.client) {
      throw new ValidationError(
        ErrorCodes.VALIDATION,
        'Object storage is not configured (set S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY)',
      );
    }
  }

  /** Create the bucket if it doesn't exist (self-healing on startup). */
  private async ensureBucket(): Promise<void> {
    try {
      await this.client!.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket '${this.bucket}' exists`);
    } catch {
      try {
        await this.client!.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Bucket '${this.bucket}' created`);
      } catch (err) {
        this.logger.warn(`Could not create bucket: ${(err as Error).message}`);
      }
    }
  }

  /** Set a permissive CORS policy so browsers can upload via presigned URLs. */
  private async ensureCors(): Promise<void> {
    try {
      await this.client!.send(
        new PutBucketCorsCommand({
          Bucket: this.bucket,
          CORSConfiguration: {
            CORSRules: [
              {
                AllowedOrigins: ['*'],
                AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
                AllowedHeaders: ['*'],
                ExposeHeaders: ['ETag'],
                MaxAgeSeconds: 3600,
              },
            ],
          },
        }),
      );
      this.logger.log(`CORS policy set on '${this.bucket}'`);
    } catch (err) {
      this.logger.warn(`Could not set CORS: ${(err as Error).message}`);
    }
  }
}
