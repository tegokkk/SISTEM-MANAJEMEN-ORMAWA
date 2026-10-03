export class ApiResponse<T> {
  public success: boolean;
  public message: string;
  public data?: T;
  public meta?: unknown;
  public code?: string;

  constructor(success: boolean, message: string, data?: T, meta?: unknown, code?: string) {
    this.success = success;
    this.message = message;
    if (data !== undefined) this.data = data;
    if (meta !== undefined) this.meta = meta;
    if (code !== undefined) this.code = code;
  }

  static success<T>(data: T, message = 'Success', meta?: unknown): ApiResponse<T> {
    return new ApiResponse(true, message, data, meta);
  }

  static error(message: string, meta?: unknown, code = 'REQUEST_FAILED'): ApiResponse<null> {
    return new ApiResponse<null>(false, message, null, meta, code);
  }
}
