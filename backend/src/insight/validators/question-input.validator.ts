import { UnprocessableEntityException } from '@nestjs/common';

export const RAW_QUESTION_MAX_CHARS = 2000;

interface RawQuestionInput {
  rawQuestion?: string;
  raw_question?: string;
}

export function normalizeAndValidateRawQuestion(
  input: RawQuestionInput,
  requestId?: string,
): string {
  const rawQuestion = (input.rawQuestion ?? input.raw_question ?? '')
    .trim()
    .replace(/\s+/g, ' ');

  if (!rawQuestion) {
    throwInvalidQuestion('rawQuestion is required', requestId);
  }

  if (rawQuestion.length > RAW_QUESTION_MAX_CHARS) {
    throwInvalidQuestion(
      `rawQuestion must be at most ${RAW_QUESTION_MAX_CHARS} characters`,
      requestId,
    );
  }

  return rawQuestion;
}

function throwInvalidQuestion(message: string, requestId?: string): never {
  throw new UnprocessableEntityException({
    code: 'INVALID_QUESTION_INPUT',
    message,
    ...(requestId ? { requestId } : {}),
  });
}
