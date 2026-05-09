-- Persist one completed insight round after successful conclusion generation.
CREATE TABLE "InsightRound" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "rawQuestion" TEXT NOT NULL,
    "questionsJson" JSONB NOT NULL,
    "answersJson" JSONB NOT NULL,
    "conclusion" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,

    CONSTRAINT "InsightRound_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InsightRound_userId_idx" ON "InsightRound"("userId");
CREATE INDEX "InsightRound_requestId_idx" ON "InsightRound"("requestId");

ALTER TABLE "InsightRound" ADD CONSTRAINT "InsightRound_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
