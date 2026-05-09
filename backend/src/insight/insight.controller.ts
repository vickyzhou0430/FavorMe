import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTokenGuard } from '../common/guards/api-token.guard';
import { getRequestId, type RequestWithContext } from '../common/request-context';
import { GenerateQuestionsDto } from './dto/generate-questions.dto';
import { SubmitInsightDto } from './dto/submit-insight.dto';
import { InsightService } from './insight.service';

@Controller('insight')
@UseGuards(ApiTokenGuard)
export class InsightController {
  constructor(private readonly insight: InsightService) {}

  @Post('questions')
  generateQuestions(
    @Body() body: GenerateQuestionsDto,
    @Req() request: RequestWithContext,
  ) {
    return this.insight.generateQuestions(body, {
      requestId: getRequestId(request),
      deviceId: request.deviceId,
    });
  }

  @Post('submit')
  submitInsight(@Body() body: SubmitInsightDto, @Req() request: RequestWithContext) {
    return this.insight.submitInsight(body, {
      requestId: getRequestId(request),
      deviceId: request.deviceId,
    });
  }
}
