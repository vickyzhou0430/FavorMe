import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { getHeaderValue, type RequestWithContext } from '../request-context';

interface ResponseWithHeaders {
  setHeader(name: string, value: string): void;
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(
    request: RequestWithContext,
    response: ResponseWithHeaders,
    next: () => void,
  ): void {
    const rawRequestId = getHeaderValue(request, 'x-request-id');
    const requestId = rawRequestId?.trim() || randomUUID();

    request.requestId = requestId;
    response.setHeader('X-Request-Id', requestId);
    next();
  }
}
