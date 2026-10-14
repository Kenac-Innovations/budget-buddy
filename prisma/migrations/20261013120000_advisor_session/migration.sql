-- CreateTable
CREATE TABLE "AdvisorSession" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "messages" JSONB NOT NULL DEFAULT '[]',
    "plan" JSONB NOT NULL,
    "planVersion" INTEGER NOT NULL DEFAULT 0,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "organisation" TEXT,
    "role" TEXT,
    "consentEmail" BOOLEAN NOT NULL DEFAULT false,
    "consentContact" BOOLEAN NOT NULL DEFAULT false,
    "savedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdvisorSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdvisorSession_token_key" ON "AdvisorSession"("token");

-- CreateIndex
CREATE INDEX "AdvisorSession_savedAt_updatedAt_idx" ON "AdvisorSession"("savedAt", "updatedAt");

