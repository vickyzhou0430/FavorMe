import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { PromptModule } from '../prompt/prompt.module';
import { UsersModule } from '../users/users.module';
import { InsightV2Controller } from './insight-v2.controller';
import { InsightV2Service } from './insight-v2.service';

@Module({
  imports: [LlmModule, PromptModule, UsersModule],
  controllers: [InsightV2Controller],
  providers: [InsightV2Service],
})
export class InsightV2Module {}
