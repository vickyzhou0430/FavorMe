import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTokenGuard } from '../common/guards/api-token.guard';
import type { RequestWithContext } from '../common/request-context';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService, type UserProfile } from './users.service';

@Controller('users')
@UseGuards(ApiTokenGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post('bootstrap')
  bootstrap(@Req() request: RequestWithContext): Promise<{ userId: string }> {
    const deviceId = this.requireDeviceId(request);
    return this.users.bootstrapByDevice(deviceId);
  }

  @Get('me')
  getMe(@Req() request: RequestWithContext): Promise<UserProfile> {
    const deviceId = this.requireDeviceId(request);
    return this.users.getProfileByDevice(deviceId);
  }

  @Patch('me')
  updateMe(
    @Req() request: RequestWithContext,
    @Body() body: UpdateProfileDto,
  ): Promise<UserProfile> {
    const deviceId = this.requireDeviceId(request);
    return this.users.updateProfileByDevice(deviceId, body);
  }

  private requireDeviceId(request: RequestWithContext): string {
    if (!request.deviceId) {
      throw new BadRequestException('X-Device-Id header is required');
    }
    return request.deviceId;
  }
}
