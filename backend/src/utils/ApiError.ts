export class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code = 'BAD_REQUEST'): ApiError {
    return new ApiError(400, message, code);
  }

  static notFound(message: string): ApiError {
    return new ApiError(404, message, 'NOT_FOUND');
  }

  static internal(message: string): ApiError {
    return new ApiError(500, message, 'INTERNAL_ERROR');
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, message, 'CONFLICT');
  }

  static unauthorized(message: string): ApiError {
    return new ApiError(401, message, 'UNAUTHORIZED');
  }

  static forbidden(message: string): ApiError {
    return new ApiError(403, message, 'FORBIDDEN');
  }
}
