import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async bootstrapByDevice(deviceId: string): Promise<{ userId: string }> {
    const user = await this.prisma.user.upsert({
      where: { deviceId },
      update: {},
      create: { deviceId },
      select: { id: true },
    });

    return { userId: user.id };
  }
}
