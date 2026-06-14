import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PROFILE_BIRTHDAY_MIN_ISO } from './profile.constants';
import type { UpdateProfileDto } from './dto/update-profile.dto';

export interface UserProfile {
  birthday: string | null;
  gender: string | null;
  zodiac: string | null;
  mbti: string | null;
  useProfileInPrompt: boolean;
}

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

  async getProfileByDevice(deviceId: string): Promise<UserProfile> {
    const user = await this.prisma.user.upsert({
      where: { deviceId },
      update: {},
      create: { deviceId },
      select: this.profileSelect,
    });
    return this.toProfile(user);
  }

  async updateProfileByDevice(
    deviceId: string,
    dto: UpdateProfileDto,
  ): Promise<UserProfile> {
    const data = this.toUpdateData(dto);
    const user = await this.prisma.user.upsert({
      where: { deviceId },
      update: data,
      create: { deviceId, ...data },
      select: this.profileSelect,
    });
    return this.toProfile(user);
  }

  private readonly profileSelect = {
    birthday: true,
    gender: true,
    zodiac: true,
    mbti: true,
    useProfileInPrompt: true,
  } as const;

  private toProfile(row: {
    birthday: Date | null;
    gender: string | null;
    zodiac: string | null;
    mbti: string | null;
    useProfileInPrompt: boolean;
  }): UserProfile {
    return {
      birthday: row.birthday ? row.birthday.toISOString().slice(0, 10) : null,
      gender: row.gender,
      zodiac: row.zodiac,
      mbti: row.mbti,
      useProfileInPrompt: row.useProfileInPrompt,
    };
  }

  private toUpdateData(dto: UpdateProfileDto): {
    birthday?: Date | null;
    gender?: string | null;
    zodiac?: string | null;
    mbti?: string | null;
    useProfileInPrompt?: boolean;
  } {
    const data: ReturnType<UsersService['toUpdateData']> = {};

    if (dto.birthday !== undefined) {
      data.birthday = dto.birthday === null ? null : this.parseBirthday(dto.birthday);
    }
    if (dto.gender !== undefined) data.gender = dto.gender;
    if (dto.zodiac !== undefined) data.zodiac = dto.zodiac;
    if (dto.mbti !== undefined) data.mbti = dto.mbti;
    if (dto.useProfileInPrompt !== undefined) {
      data.useProfileInPrompt = dto.useProfileInPrompt;
    }

    return data;
  }

  private parseBirthday(iso: string): Date {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException({
        code: 'INVALID_BIRTHDAY',
        message: '生日格式必须为 YYYY-MM-DD。',
      });
    }
    const min = new Date(PROFILE_BIRTHDAY_MIN_ISO);
    const now = new Date();
    if (date < min || date > now) {
      throw new BadRequestException({
        code: 'BIRTHDAY_OUT_OF_RANGE',
        message: `生日必须在 ${PROFILE_BIRTHDAY_MIN_ISO} 到今天之间。`,
      });
    }
    return date;
  }
}
