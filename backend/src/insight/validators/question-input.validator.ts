import { UnprocessableEntityException } from '@nestjs/common';

export const RAW_QUESTION_MIN_CHARS = 4;
export const RAW_QUESTION_MAX_CHARS = 2000;

interface RawQuestionInput {
  rawQuestion?: string;
  raw_question?: string;
}

const DECISION_INTENT_PATTERNS = [
  /[?？]/u,
  /要不要|该不该|应不应该|能不能|可不可以|是否|是不是|值不值得|适不适合|还是|选择|选哪个|怎么选|买不买|去不去|换不换|留不留|分不分|接受不接受/u,
  /\b(should|whether|or not|choose|decide|decision|buy|go|quit|change|move|stay|accept|break up)\b/iu,
];

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

  if (rawQuestion.length < RAW_QUESTION_MIN_CHARS) {
    throwInvalidQuestion(
      `rawQuestion must be at least ${RAW_QUESTION_MIN_CHARS} characters`,
      requestId,
    );
  }

  if (rawQuestion.length > RAW_QUESTION_MAX_CHARS) {
    throwInvalidQuestion(
      `rawQuestion must be at most ${RAW_QUESTION_MAX_CHARS} characters`,
      requestId,
    );
  }

  if (!hasEnoughMeaningfulCharacters(rawQuestion) || isRepeatedNoise(rawQuestion)) {
    throwInvalidQuestion('rawQuestion must contain a readable decision question', requestId);
  }

  if (!hasDecisionIntent(rawQuestion)) {
    throwInvalidQuestion('rawQuestion must describe a question or decision', requestId);
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

function hasEnoughMeaningfulCharacters(rawQuestion: string): boolean {
  const meaningfulChars = rawQuestion.match(/[\p{Script=Han}\p{L}\p{N}]/gu) ?? [];
  return meaningfulChars.length >= RAW_QUESTION_MIN_CHARS;
}

function isRepeatedNoise(rawQuestion: string): boolean {
  const meaningfulChars = rawQuestion
    .toLowerCase()
    .match(/[\p{Script=Han}\p{L}\p{N}]/gu);

  if (!meaningfulChars || meaningfulChars.length < RAW_QUESTION_MIN_CHARS) {
    return true;
  }

  return new Set(meaningfulChars).size === 1;
}

function hasDecisionIntent(rawQuestion: string): boolean {
  return DECISION_INTENT_PATTERNS.some((pattern) => pattern.test(rawQuestion));
}
