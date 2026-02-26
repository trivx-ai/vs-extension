export class TrivxError extends Error {
  public code: string;
  public statusCode?: number;
  public details?: any;

  constructor(message: string, code: string, statusCode?: number, details?: any) {
    super(message);
    this.name = 'TrivxError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class AuthError extends TrivxError {
  constructor(message: string = 'Authentication required', details?: any) {
    super(message, 'AUTH_ERROR', 401, details);
    this.name = 'AuthError';
  }
}

export class ForbiddenError extends TrivxError {
  constructor(message: string = 'Insufficient permissions', details?: any) {
    super(message, 'FORBIDDEN', 403, details);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends TrivxError {
  constructor(message: string = 'Resource not found', details?: any) {
    super(message, 'NOT_FOUND', 404, details);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends TrivxError {
  constructor(message: string = 'Rate limit exceeded', details?: any) {
    super(message, 'RATE_LIMITED', 429, details);
    this.name = 'RateLimitError';
  }
}

export class NetworkError extends TrivxError {
  constructor(message: string = 'Network connection failed', details?: any) {
    super(message, 'NETWORK_ERROR', undefined, details);
    this.name = 'NetworkError';
  }
}

export function handleApiError(error: any): TrivxError {
  if (error instanceof TrivxError) {
    return error;
  }

  if (error?.response) {
    const status = error.response.status;
    const data = error.response.data;
    const message = data?.message || data?.error || error.message;

    switch (status) {
      case 401: return new AuthError(message, data);
      case 403: return new ForbiddenError(message, data);
      case 404: return new NotFoundError(message, data);
      case 429: return new RateLimitError(message, data);
      default:
        return new TrivxError(message, 'API_ERROR', status, data);
    }
  }

  if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND') {
    return new NetworkError('Cannot connect to Trivx API. Is the server running?');
  }

  return new TrivxError(
    error?.message || 'An unexpected error occurred',
    'UNKNOWN_ERROR'
  );
}
