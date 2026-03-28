-- CreateTable
CREATE TABLE "months" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "lastUpdatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CHECKING'
);

-- CreateTable
CREATE TABLE "account_balances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "monthId" TEXT NOT NULL,
    "balance" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "account_balances_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "account_balances_monthId_fkey" FOREIGN KEY ("monthId") REFERENCES "months" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "subcategories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dueDay" INTEGER,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CREDIT',
    "cardId" TEXT,
    CONSTRAINT "subcategories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "subcategories_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "subcategory_budgets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subcategoryId" TEXT NOT NULL,
    "monthId" TEXT NOT NULL,
    "budgetAmount" REAL NOT NULL DEFAULT 0,
    "paidAmount" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "subcategory_budgets_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "subcategories" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "subcategory_budgets_monthId_fkey" FOREIGN KEY ("monthId") REFERENCES "months" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "income_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "monthId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "expectedAmount" REAL NOT NULL,
    "actualAmount" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "income_entries_monthId_fkey" FOREIGN KEY ("monthId") REFERENCES "months" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL DEFAULT '#6366f1',
    "bank" TEXT,
    "type" TEXT NOT NULL DEFAULT 'MAIN'
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "monthId" TEXT NOT NULL,
    "cardId" TEXT,
    "subcategoryId" TEXT,
    "date" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ONE_TIME',
    "installmentCurrent" INTEGER,
    "installmentTotal" INTEGER,
    "isCounted" BOOLEAN NOT NULL DEFAULT false,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transactions_monthId_fkey" FOREIGN KEY ("monthId") REFERENCES "months" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "transactions_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "transactions_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "subcategories" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "planning_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "percentage" REAL NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "months_year_month_key" ON "months"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "account_balances_accountId_monthId_key" ON "account_balances"("accountId", "monthId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "subcategory_budgets_subcategoryId_monthId_key" ON "subcategory_budgets"("subcategoryId", "monthId");
