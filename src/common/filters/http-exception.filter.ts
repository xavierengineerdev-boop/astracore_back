import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { HTTP_STATUS_MESSAGES } from '../../constants';
import type { ApiErrorResponse } from '../../types';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, body } = this.getErrorResponse(exception, request);

    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(statusCode).json(body);
  }

  private getErrorResponse(
    exception: unknown,
    request: Request,
  ): { statusCode: number; body: ApiErrorResponse } {
    const timestamp = new Date().toISOString();

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const message =
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'message' in exceptionResponse
          ? (exceptionResponse as { message?: string | string[] }).message
          : exception.message;
      const error =
        HTTP_STATUS_MESSAGES[statusCode] ?? exception.name ?? 'Error';

      return {
        statusCode,
        body: {
          statusCode,
          error,
          message: message ?? error,
          timestamp,
        },
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: HTTP_STATUS_MESSAGES[500],
        message: 'Internal server error',
        timestamp,
      },
    };
  }
}
