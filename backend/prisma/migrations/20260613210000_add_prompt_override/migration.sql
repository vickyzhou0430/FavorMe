-- Prompt 运行时覆盖（debug 调参用，见 docs/tasks/004）。
CREATE TABLE "PromptOverride" (
    "key" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "PromptOverride_pkey" PRIMARY KEY ("key")
);
