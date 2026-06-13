import { IsIn, IsOptional, IsString } from 'class-validator';

export class StartSessionDto {
  @IsOptional()
  @IsString()
  dilemma?: string;

  /** 兼容 snake_case 入参。 */
  @IsOptional()
  @IsString()
  raw_question?: string;

  @IsOptional()
  @IsIn(['text', 'voice_to_text'])
  inputMode?: 'text' | 'voice_to_text';
}
