import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionSnapshotDto } from './question.dto';

export class InsightAnswerDto {
  @IsString()
  questionId!: string;

  @IsString()
  optionId!: string;
}

export class SubmitInsightDto {
  @IsOptional()
  @IsString()
  rawQuestion?: string;

  @IsOptional()
  @IsString()
  raw_question?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuestionSnapshotDto)
  questions!: QuestionSnapshotDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InsightAnswerDto)
  answers!: InsightAnswerDto[];
}
