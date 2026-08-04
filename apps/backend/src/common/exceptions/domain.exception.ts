import { HttpStatus } from '@nestjs/common';

export type ExceptionDetails = Record<string, unknown>;

/**
 * Base for all domain-level errors. Carries a stable machine-readable `code`
 * so clients can switch on it, a human-facing `message`, and an HTTP `status`
 * the global filter translates into a response.
 *
 * Deliberately does NOT extend Nest's HttpException: domain rules must stay
 * independent of the HTTP framework. The translation to an HTTP response
 * happens in exactly one place — the global exception filter.
 *
 * `Object.setPrototypeOf(..., new.target.prototype)` restores the prototype
 * chain so `instanceof` works even when a target downlevels `extends Error`.
 */
export class DomainException extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: HttpStatus,
    public readonly details?: ExceptionDetails,
  ) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends DomainException {
  constructor(code: string, message: string, details?: ExceptionDetails) {
    super(code, message, HttpStatus.NOT_FOUND, details);
  }
}

export class ConflictError extends DomainException {
  constructor(code: string, message: string, details?: ExceptionDetails) {
    super(code, message, HttpStatus.CONFLICT, details);
  }
}

export class UnauthorizedError extends DomainException {
  constructor(code: string, message: string, details?: ExceptionDetails) {
    super(code, message, HttpStatus.UNAUTHORIZED, details);
  }
}

export class ForbiddenError extends DomainException {
  constructor(code: string, message: string, details?: ExceptionDetails) {
    super(code, message, HttpStatus.FORBIDDEN, details);
  }
}

export class ValidationError extends DomainException {
  constructor(code: string, message: string, details?: ExceptionDetails) {
    super(code, message, HttpStatus.UNPROCESSABLE_ENTITY, details);
  }
}
