-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SizeChartProductAssignment" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SizeChartProductAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SizeChartTemplate" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "chartData" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SizeChartTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThemeSettings" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "buttonText" TEXT NOT NULL DEFAULT 'Size Chart',
    "buttonSize" TEXT NOT NULL DEFAULT 'large',
    "buttonWidth" TEXT NOT NULL DEFAULT 'fit',
    "alignment" TEXT NOT NULL DEFAULT 'center',
    "buttonType" TEXT NOT NULL DEFAULT 'primary',
    "iconType" TEXT NOT NULL DEFAULT 'none',
    "iconPosition" TEXT NOT NULL DEFAULT 'left',
    "backgroundColor" TEXT NOT NULL DEFAULT '#ffffff',
    "borderColor" TEXT NOT NULL DEFAULT '#000000',
    "textColor" TEXT NOT NULL DEFAULT '#000000',
    "borderRadius" INTEGER NOT NULL DEFAULT 0,
    "marginTop" INTEGER NOT NULL DEFAULT 20,
    "marginBottom" INTEGER NOT NULL DEFAULT 20,
    "marginLeft" INTEGER NOT NULL DEFAULT 20,
    "marginRight" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThemeSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SizeChartProductAssignment_productId_idx" ON "SizeChartProductAssignment"("productId");

-- CreateIndex
CREATE INDEX "SizeChartProductAssignment_shop_idx" ON "SizeChartProductAssignment"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "SizeChartProductAssignment_templateId_productId_key" ON "SizeChartProductAssignment"("templateId", "productId");

-- CreateIndex
CREATE INDEX "SizeChartTemplate_active_idx" ON "SizeChartTemplate"("active");

-- CreateIndex
CREATE INDEX "SizeChartTemplate_shop_idx" ON "SizeChartTemplate"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "ThemeSettings_shop_key" ON "ThemeSettings"("shop");

-- CreateIndex
CREATE INDEX "ThemeSettings_shop_idx" ON "ThemeSettings"("shop");

-- AddForeignKey
ALTER TABLE "SizeChartProductAssignment" ADD CONSTRAINT "SizeChartProductAssignment_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "SizeChartTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

