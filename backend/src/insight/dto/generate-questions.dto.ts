import { IsIn, IsOptional, IsString } from 'class-validator';

export class GenerateQuestionsDto {
  @IsOptional()
  @IsString()
  rawQuestion?: string;

  @IsOptional()
  @IsString()
  raw_question?: string;

  @IsOptional()
  @IsIn(['text', 'voice_to_text'])
  inputMode?: 'text' | 'voice_to_text';
}
