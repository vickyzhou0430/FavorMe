import { IsString, MaxLength, MinLength } from 'class-validator';

/** Prompt 覆盖体上限：足够长以容纳完整系统提示词，又能挡住异常巨大的载荷。 */
export const PROMPT_MAX_CHARS = 40000;

export class UpdatePromptDto {
  @IsString()
  @MinLength(1)
  @MaxLength(PROMPT_MAX_CHARS)
  content!: string;
}
