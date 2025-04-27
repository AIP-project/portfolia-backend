// exceptions/base.exception.ts
import { HttpException, HttpStatus } from "@nestjs/common"

export class BaseException extends HttpException {
  constructor(message: string, error: string, code: string, status: HttpStatus) {
    super(
      {
        statusCode: status,
        message,
        error,
        code,
      },
      status,
    )
  }
}

export class TokenExpiredException extends BaseException {
  constructor(message: string) {
    super(message, "Token Expired", "TOKEN_EXPIRED", HttpStatus.UNAUTHORIZED)
  }
}

export class InvalidTokenException extends BaseException {
  constructor(message: string) {
    super(message, "Invalid Token", "INVALID_TOKEN", HttpStatus.UNAUTHORIZED)
  }
}

// exceptions/auth.exception.ts
export class UnauthorizedException extends BaseException {
  constructor(message: string) {
    super(message, "Unauthorized", "UNAUTHORIZED", HttpStatus.UNAUTHORIZED)
  }
}

export class ForbiddenException extends BaseException {
  constructor(message: string) {
    super(message, "Forbidden", "FORBIDDEN", HttpStatus.FORBIDDEN)
  }
}

// exceptions/validation.exception.ts
export class ValidationException extends BaseException {
  constructor(message: string) {
    super(message, "Validation Error", "VALIDATION_ERROR", HttpStatus.BAD_REQUEST)
  }
}

// exceptions/notfound.exception.ts
export class NotFoundException extends BaseException {
  constructor(resource: string) {
    super(`${resource} not found`, "Not Found", "NOT_FOUND", HttpStatus.NOT_FOUND)
  }
}

// exceptions/conflict.exception.ts
export class ConflictException extends BaseException {
  constructor(message: string) {
    super(message, "Conflict", "CONFLICT", HttpStatus.CONFLICT)
  }
}

// exceptions/badrequest.exception.ts
export class BadRequestException extends BaseException {
  constructor(message: string) {
    super(message, "Bad Request", "BAD_REQUEST", HttpStatus.BAD_REQUEST)
  }
}

// exceptions/external.exception.ts
export class ExternalServiceException extends BaseException {
  constructor(message: string) {
    super(message, "External Service Error", "EXTERNAL_SERVICE_ERROR", HttpStatus.INTERNAL_SERVER_ERROR)
  }
}

// exceptions/internal.exception.ts
export class InternalServerException extends BaseException {
  constructor(message: string = "Internal server error") {
    super(message, "Internal Server Error", "INTERNAL_SERVER_ERROR", HttpStatus.INTERNAL_SERVER_ERROR)
  }
}

// exceptions/toomany.exception.ts
export class TooManyRequestsException extends BaseException {
  constructor(message: string = "Too many requests") {
    super(message, "Too Many Requests", "TOO_MANY_REQUESTS", HttpStatus.TOO_MANY_REQUESTS)
  }
}

// exceptions/service.exception.ts
export class ServiceUnavailableException extends BaseException {
  constructor(message: string = "Service temporarily unavailable") {
    super(message, "Service Unavailable", "SERVICE_UNAVAILABLE", HttpStatus.SERVICE_UNAVAILABLE)
  }
}

// exceptions/database.exception.ts
export class DatabaseException extends BaseException {
  constructor(message: string) {
    super(message, "Database Error", "DATABASE_ERROR", HttpStatus.INTERNAL_SERVER_ERROR)
  }
}
