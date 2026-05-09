import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { InsightController } from './insight.controller';
import { InsightService } from './insight.service';

@Module({
  imports: [LlmModule],
  controllers: [InsightController],
  providers: [InsightService],
})
export class InsightModule {}
