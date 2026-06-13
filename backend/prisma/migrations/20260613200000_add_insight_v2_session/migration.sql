-- 「点醒」动态问卷有状态会话表（见 docs/tasks/004 + ADR-005）。
CREATE TYPE "InsightV2Status" AS ENUM ('need_info', 'questioning', 'finished');

CREATE TABLE "InsightV2Session" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "InsightV2Status" NOT NULL DEFAULT 'questioning',
    "dilemma" TEXT NOT NULL,
    "transcriptJson" JSONB NOT NULL,
    "answersJson" JSONB NOT NULL,
    "strategiesJson" JSONB NOT NULL,
    "clarifyCount" INTEGER NOT NULL DEFAULT 0,
    "awakeningQuote" TEXT,
    "tendency" TEXT,
    "analysis" TEXT,
    "actionAdvice" TEXT,
    "requestId" TEXT NOT NULL,

    CONSTRAINT "InsightV2Session_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InsightV2Session_userId_idx" ON "InsightV2Session"("userId");
CREATE INDEX "InsightV2Session_requestId_idx" ON "InsightV2Session"("requestId");

ALTER TABLE "InsightV2Session" ADD CONSTRAINT "InsightV2Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
