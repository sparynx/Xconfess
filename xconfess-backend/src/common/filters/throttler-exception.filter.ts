import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { Request, Response } from 'express';
import { ThrottlerException } from '@nestjs/throttler';
import { ErrorCode } from '../errors/error-codes';
import { AppException } from '../errors/app-exception';

@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  catch(exception: ThrottlerException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const appException = AppException.fromHttpException(exception);
    const body = appException.getResponse() as any;

    response.status(status).json({
      ...body,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: (request as any).requestId || 'unknown',
    });
  }
}
