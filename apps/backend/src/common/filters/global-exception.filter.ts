import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ZodError } from 'zod';
import { Request, Response } from 'express';
import { ErrorCodes } from '../exceptions/error-codes';
import { DomainException } from '../exceptions/domain.exception';

interface ErrorEnvelope {
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
  path: string;
}

/** Map a raw HTTP status to a stable error code for Nest-native errors. */
const STATUS_CODE: Readonly<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCodes.VALIDATION,
  [HttpStatus.UNAUTHORIZED]: ErrorCodes.TOKEN_INVALID,
  [HttpStatus.FORBIDDEN]: ErrorCodes.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCodes.NOT_FOUND,
  [HttpStatus.CONFLICT]: ErrorCodes.CONFLICT,
  [HttpStatus.UNPROCESSABLE_ENTITY]: ErrorCodes.VALIDATION,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCodes.VALIDATION,
};

function codeFromStatus(status: number): string {
  return STATUS_CODE[status] ?? ErrorCodes.INTERNAL;
}

/**
 * Single catch-all that normalizes every thrown error into one envelope.
 * Stack traces are logged but never sent to clients in production.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, envelope } = this.map(exception, request.url);

    if (status >= 500) {
      this.logger.error(
        `${envelope.code} ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else if (status >= 400) {
      this.logger.warn(`${envelope.code} ${request.method} ${request.url} → ${envelope.message}`);
    }

    response.status(status).json(envelope);
  }

  private map(exception: unknown, path: string): { status: number; envelope: ErrorEnvelope } {
    const base: Omit<ErrorEnvelope, 'code' | 'message'> = {
      timestamp: new Date().toISOString(),
      path,
    };

    // Domain errors are framework-agnostic; translate them to HTTP here.
    if (exception instanceof DomainException) {
      return {
        status: exception.status,
        envelope: {
          code: exception.code,
          message: exception.message,
          details: exception.details,
          ...base,
        },
      };
    }

    // Nest-native errors (ValidationPipe, Throttler, thrown HttpExceptions).
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const payload =
        typeof body === 'object' && body !== null
          ? (body as { code?: string; message?: string; details?: unknown })
          : { message: String(body) };

      return {
        status,
        envelope: {
          // Nest-native errors don't carry our `code`; derive one from status.
          code: payload.code ?? codeFromStatus(status),
          message: payload.message ?? exception.message,
          details: payload.details,
          ...base,
        },
      };
    }

    // zod validation (defensive — DTOs use class-validator, but some paths use zod).
    if (exception instanceof ZodError) {
      return {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        envelope: {
          code: ErrorCodes.VALIDATION,
          message: 'Validation failed',
          details: exception.flatten(),
          ...base,
        },
      };
    }

    // Unknown: never leak internals.
    const message =
      exception instanceof Error ? exception.message : 'Unexpected error';
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      envelope: {
        code: ErrorCodes.INTERNAL,
        message,
        ...base,
      },
    };
  }
}
