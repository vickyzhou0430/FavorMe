import { IsBoolean, IsIn, IsISO8601, IsOptional, ValidateIf } from 'class-validator';
import {
  PROFILE_GENDERS,
  PROFILE_MBTI_TYPES,
  PROFILE_ZODIACS,
  type ProfileGender,
  type ProfileMbti,
  type ProfileZodiac,
} from '../profile.constants';

/**
 * PATCH 语义：缺省 = 不变；显式 null = 清空；有值 = 写入。
 * 用 ValidateIf 让 null 跳过白名单校验，保留"清空"能力。
 */
export class UpdateProfileDto {
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsISO8601({ strict: true })
  birthday?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsIn(PROFILE_GENDERS as unknown as string[])
  gender?: ProfileGender | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsIn(PROFILE_ZODIACS as unknown as string[])
  zodiac?: ProfileZodiac | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsIn(PROFILE_MBTI_TYPES as unknown as string[])
  mbti?: ProfileMbti | null;

  @IsOptional()
  @IsBoolean()
  useProfileInPrompt?: boolean;
}
