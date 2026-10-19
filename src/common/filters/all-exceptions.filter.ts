import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorPayload {
  statusCode: number;
  message: string | string[];
  error?: string;
  path: string;
  timestamp: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const rawResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;

    const payload: ErrorPayload = {
      statusCode: status,
      message: this.extractMessage(rawResponse),
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    if (rawResponse && typeof rawResponse === 'object' && 'error' in rawResponse) {
      payload.error = (rawResponse as { error?: string }).error;
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `Error no controlado en ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `Error ${status} en ${request.method} ${request.url}: ${JSON.stringify(payload.message)}`,
      );
    }

    response.status(status).json(payload);
  }

  private extractMessage(rawResponse: string | object | undefined): string | string[] {
    if (!rawResponse) {
      return 'Error interno del servidor';
    }

    if (typeof rawResponse === 'string') {
      return rawResponse;
    }

    const message = (rawResponse as { message?: string | string[] }).message;
    return message ?? 'Error interno del servidor';
  }
}
