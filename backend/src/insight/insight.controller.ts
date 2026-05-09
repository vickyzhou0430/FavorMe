import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTokenGuard } from '../common/guards/api-token.guard';
import { GenerateQuestionsDto } from './dto/generate-questions.dto';
import { SubmitInsightDto } from './dto/submit-insight.dto';
import { InsightService } from './insight.service';

@Controller('insight')
@UseGuards(ApiTokenGuard)
export class InsightController {
  constructor(private readonly insight: InsightService) {}

  @Post('questions')
  generateQuestions(@Body() body: GenerateQuestionsDto) {
    return this.insight.generateQuestions(body);
  }

  @Post('submit')
  submitInsight(@Body() body: SubmitInsightDto) {
    return this.insight.submitInsight(body);
  }
}
