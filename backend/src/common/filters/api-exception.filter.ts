import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { getRequestId, type RequestWithContext } from '../request-context';

interface HttpResponseBody {
  code?: string;
  error?: string;
  message?: string | string[];
}

interface ResponseWriter {
  status(statusCode: number): {
    json(body: { code: string; message: string; requestId: string }): void;
  };
}

const STATUS_CODES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<RequestWithContext>();
    const response = context.getResponse<ResponseWriter>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const body = this.toBody(exception, status);
    response.status(status).json({
      ...body,
      requestId: getRequestId(request),
    });
  }

  private toBody(
    exception: unknown,
    status: number,
  ): { code: string; message: string } {
    if (!(exception instanceof HttpException)) {
      return {
        code: STATUS_CODES[HttpStatus.INTERNAL_SERVER_ERROR],
        message: 'Internal server error',
      };
    }

    const response = exception.getResponse();
    if (typeof response === 'string') {
      return {
        code: STATUS_CODES[status] ?? `HTTP_${status}`,
        message: response,
      };
    }

    const body = response as HttpResponseBody;
    const message = Array.isArray(body.message)
      ? body.message.join('; ')
      : body.message ?? exception.message;

    return {
      code: body.code ?? this.errorToCode(body.error) ?? STATUS_CODES[status] ?? `HTTP_${status}`,
      message,
    };
  }

  private errorToCode(error?: string): string | undefined {
    return error?.toUpperCase().replaceAll(' ', '_');
  }
}
