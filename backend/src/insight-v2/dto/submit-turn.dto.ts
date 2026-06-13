import { IsIn, IsOptional, IsString } from 'class-validator';
import { INSIGHT_V2_LEVELS, type InsightV2Level } from '../prompts/insight-v2.prompt';

export type SubmitTurnAction = 'answer' | 'reply' | 'regenerate';

export class SubmitTurnDto {
  @IsIn(['answer', 'reply', 'regenerate'])
  action!: SubmitTurnAction;

  /** action=answer：当前题 id（防串题）。 */
  @IsOptional()
  @IsString()
  questionId?: string;

  /** action=answer：五级量表选择。 */
  @IsOptional()
  @IsIn(INSIGHT_V2_LEVELS as unknown as string[])
  level?: InsightV2Level;

  /** action=reply：对 need_info 追问的补充文本。 */
  @IsOptional()
  @IsString()
  replyText?: string;
}
