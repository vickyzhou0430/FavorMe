import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { getHeaderValue, type RequestWithContext } from '../request-context';

@Injectable()
export class ApiTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const expectedToken = process.env.API_TOKEN;

    if (!expectedToken) {
      throw new UnauthorizedException('API_TOKEN is not configured');
    }

    const authorization = getHeaderValue(request, 'authorization') ?? '';
    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token || token !== expectedToken) {
      throw new UnauthorizedException('Invalid bearer token');
    }

    const deviceId = getHeaderValue(request, 'x-device-id')?.trim();
    if (!deviceId) {
      throw new BadRequestException('X-Device-Id header is required');
    }

    request.deviceId = deviceId;
    return true;
  }
}
