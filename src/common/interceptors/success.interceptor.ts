import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import type { ApiSuccessResponse } from '../../types';

@Injectable()
export class SuccessInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiSuccessResponse<unknown>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse();

    return next.handle().pipe(
      map((data: unknown) => {
        const statusCode = response.statusCode ?? 200;
        const timestamp = new Date().toISOString();

        if (statusCode === 204 || data === undefined) {
          return { statusCode, data: null, timestamp };
        }

        return { statusCode, data, timestamp };
      }),
    );
  }
}
