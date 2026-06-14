-- 用户个人档案 + 个性化注入开关（见 ADR-006 / 任务 005）。
ALTER TABLE "User"
  ADD COLUMN "birthday" DATE,
  ADD COLUMN "gender" TEXT,
  ADD COLUMN "zodiac" TEXT,
  ADD COLUMN "mbti" TEXT,
  ADD COLUMN "useProfileInPrompt" BOOLEAN NOT NULL DEFAULT false;
