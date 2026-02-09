export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
}

export interface ApiSuccessResponse<T = unknown> {
  statusCode: number;
  data: T;
  timestamp?: string;
}
