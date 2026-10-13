-- CreateEnum
CREATE TYPE "OrganisationKind" AS ENUM ('CUSTOMER', 'OPERATOR');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER', 'OPERATOR_STAFF');

-- CreateEnum
CREATE TYPE "BudgetStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED');

-- CreateEnum
CREATE TYPE "VersionReason" AS ENUM ('MANUAL', 'SUBMITTED', 'APPROVED', 'EXPORTED');

-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('ONE_OFF', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'SCHEDULE');

-- CreateEnum
CREATE TYPE "PriceBasis" AS ENUM ('PER_UNIT', 'BUNDLE');

-- CreateEnum
CREATE TYPE "TaxTreatment" AS ENUM ('INCLUDED', 'EXCLUDED', 'UNRESOLVED');

-- CreateEnum
CREATE TYPE "LineOrigin" AS ENUM ('USER', 'IMPORT', 'AI_SUGGESTION');

-- CreateEnum
CREATE TYPE "LineState" AS ENUM ('SUGGESTED', 'ACCEPTED', 'DISMISSED', 'DEFERRED');

-- CreateEnum
CREATE TYPE "SharingMode" AS ENUM ('PRIVATE', 'IDENTIFIED');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('OPERATOR_PRICE_LIST', 'PUBLISHED_PRICE', 'QUOTE', 'CONTRACT', 'HISTORICAL_ACTUAL', 'USER_ESTIMATE');

-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "OrganisationKind" NOT NULL DEFAULT 'CUSTOMER',
    "industry" TEXT,
    "isPublicEntity" BOOLEAN NOT NULL DEFAULT false,
    "staffCount" INTEGER,
    "siteCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "periodStart" TEXT NOT NULL,
    "periodEnd" TEXT NOT NULL,
    "reportingCurrency" TEXT NOT NULL,
    "ceilingAmount" DECIMAL(20,6),
    "ceilingCurrency" TEXT,
    "status" "BudgetStatus" NOT NULL DEFAULT 'DRAFT',
    "activeVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetVersion" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "reason" "VersionReason" NOT NULL,
    "label" TEXT,
    "snapshot" JSONB NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetLine" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "parentLineId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "quantity" DECIMAL(20,6),
    "unit" TEXT,
    "priceBasis" "PriceBasis" NOT NULL DEFAULT 'PER_UNIT',
    "bundleCount" INTEGER,
    "unitPrice" DECIMAL(20,6),
    "currency" TEXT NOT NULL,
    "evidenceId" TEXT,
    "frequency" "Frequency" NOT NULL DEFAULT 'ONE_OFF',
    "activeFrom" TEXT,
    "activeTo" TEXT,
    "paymentMonth" TEXT,
    "schedule" JSONB,
    "taxTreatment" "TaxTreatment" NOT NULL DEFAULT 'UNRESOLVED',
    "taxRate" DECIMAL(9,6),
    "priority" INTEGER,
    "justification" TEXT,
    "origin" "LineOrigin" NOT NULL DEFAULT 'USER',
    "state" "LineState" NOT NULL DEFAULT 'ACCEPTED',
    "dismissReason" TEXT,
    "catalogueItemId" TEXT,
    "sharingMode" "SharingMode" NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency" TEXT NOT NULL,
    "rate" DECIMAL(20,8) NOT NULL,
    "effectiveFrom" TEXT NOT NULL,
    "source" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT,
    "type" "EvidenceType" NOT NULL,
    "supplierId" TEXT,
    "amount" DECIMAL(20,6) NOT NULL,
    "currency" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isOperator" BOOLEAN NOT NULL DEFAULT false,
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogueItem" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "attributes" JSONB NOT NULL,
    "unit" TEXT,
    "price" DECIMAL(20,6),
    "currency" TEXT,
    "priceListRef" TEXT,
    "priceListDate" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogueItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharingAuthorisation" (
    "id" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "mode" "SharingMode" NOT NULL,
    "fields" JSONB NOT NULL,
    "purpose" TEXT NOT NULL,
    "authorisedById" TEXT NOT NULL,
    "authorisedRole" "MembershipRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "SharingAuthorisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_organisationId_userId_key" ON "Membership"("organisationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_activeVersionId_key" ON "Budget"("activeVersionId");

-- CreateIndex
CREATE INDEX "Budget_organisationId_idx" ON "Budget"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetVersion_budgetId_number_key" ON "BudgetVersion"("budgetId", "number");

-- CreateIndex
CREATE INDEX "BudgetLine_budgetId_idx" ON "BudgetLine"("budgetId");

-- CreateIndex
CREATE INDEX "ExchangeRate_budgetId_idx" ON "ExchangeRate"("budgetId");

-- CreateIndex
CREATE INDEX "CatalogueItem_category_idx" ON "CatalogueItem"("category");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogueItem_supplierId_sku_key" ON "CatalogueItem"("supplierId", "sku");

-- CreateIndex
CREATE INDEX "SharingAuthorisation_lineId_idx" ON "SharingAuthorisation"("lineId");

-- CreateIndex
CREATE INDEX "AuditEvent_organisationId_at_idx" ON "AuditEvent"("organisationId", "at");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_activeVersionId_fkey" FOREIGN KEY ("activeVersionId") REFERENCES "BudgetVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetVersion" ADD CONSTRAINT "BudgetVersion_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLine" ADD CONSTRAINT "BudgetLine_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLine" ADD CONSTRAINT "BudgetLine_parentLineId_fkey" FOREIGN KEY ("parentLineId") REFERENCES "BudgetLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLine" ADD CONSTRAINT "BudgetLine_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLine" ADD CONSTRAINT "BudgetLine_catalogueItemId_fkey" FOREIGN KEY ("catalogueItemId") REFERENCES "CatalogueItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogueItem" ADD CONSTRAINT "CatalogueItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharingAuthorisation" ADD CONSTRAINT "SharingAuthorisation_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "BudgetLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
