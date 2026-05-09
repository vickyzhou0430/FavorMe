import { BadRequestException, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTokenGuard } from '../common/guards/api-token.guard';
import type { RequestWithContext } from '../common/request-context';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(ApiTokenGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post('bootstrap')
  bootstrap(@Req() request: RequestWithContext): Promise<{ userId: string }> {
    if (!request.deviceId) {
      throw new BadRequestException('X-Device-Id header is required');
    }

    return this.users.bootstrapByDevice(request.deviceId);
  }
}
