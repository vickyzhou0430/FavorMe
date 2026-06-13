import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTokenGuard } from '../common/guards/api-token.guard';
import { getRequestId, type RequestWithContext } from '../common/request-context';
import { StartSessionDto } from './dto/start-session.dto';
import { SubmitTurnDto } from './dto/submit-turn.dto';
import { UpdatePromptDto } from './dto/update-prompt.dto';
import { InsightV2Service } from './insight-v2.service';

@Controller('insight-v2')
@UseGuards(ApiTokenGuard)
export class InsightV2Controller {
  constructor(private readonly insightV2: InsightV2Service) {}

  @Post('sessions')
  startSession(@Body() body: StartSessionDto, @Req() request: RequestWithContext) {
    return this.insightV2.startSession(body, this.context(request));
  }

  @Post('sessions/:id/turns')
  submitTurn(
    @Param('id') id: string,
    @Body() body: SubmitTurnDto,
    @Req() request: RequestWithContext,
  ) {
    return this.insightV2.submitTurn(id, body, this.context(request));
  }

  @Get('sessions/:id')
  getSession(@Param('id') id: string, @Req() request: RequestWithContext) {
    return this.insightV2.getSession(id, this.context(request));
  }

  @Get('sessions')
  listSessions(
    @Req() request: RequestWithContext,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.insightV2.listSessions(this.context(request), {
      limit: limit ? Number(limit) : undefined,
      cursor,
    });
  }

  // --- Prompt 运行时调参（debug 用；写操作需 INSIGHT_V2_PROMPT_OVERRIDE_ENABLED=true） ---

  @Get('prompt')
  getPrompt() {
    return this.insightV2.getPromptInfo();
  }

  @Put('prompt')
  updatePrompt(@Body() body: UpdatePromptDto, @Req() request: RequestWithContext) {
    return this.insightV2.setPrompt(body.content, request.deviceId);
  }

  @Delete('prompt')
  resetPrompt() {
    return this.insightV2.resetPrompt();
  }

  private context(request: RequestWithContext) {
    return {
      requestId: getRequestId(request),
      deviceId: request.deviceId,
    };
  }
}
