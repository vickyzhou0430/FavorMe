import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export const INSIGHT_DIMENSIONS = [
  'inner_preference',
  'fear_boundary',
  'active_vs_avoidance',
] as const;

export type InsightDimension = (typeof INSIGHT_DIMENSIONS)[number];

export class QuestionOptionDto {
  @IsString()
  id!: string;

  @IsString()
  label!: string;
}

export class QuestionSnapshotDto {
  @IsString()
  id!: string;

  @IsIn(INSIGHT_DIMENSIONS)
  dimension!: InsightDimension;

  @IsString()
  title!: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options!: QuestionOptionDto[];
}
