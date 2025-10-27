yarn run v1.22.22
$ /Users/shinsanghoon/workspace/portfolia-backend/node_modules/.bin/prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserState" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED', 'BANNED', 'DORMANT', 'DELETED');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('BANK', 'STOCK', 'COIN', 'ETC', 'LIABILITIES');

-- CreateEnum
CREATE TYPE "CurrencyType" AS ENUM ('KRW', 'USD', 'EUR', 'JPY', 'CNY', 'GBP', 'AUD', 'CAD', 'CHF', 'HKD', 'SGD', 'SEK', 'NOK', 'MXN', 'NZD', 'TRY', 'BRL', 'TWD', 'DKK', 'PLN', 'THB', 'ILS', 'PHP', 'CZK', 'AED', 'COP', 'SAR', 'CLP', 'MYR', 'RON');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('BUY', 'SELL', 'DEPOSIT', 'WITHDRAWAL', 'TRANSFER');

-- CreateEnum
CREATE TYPE "SummaryType" AS ENUM ('CASH', 'SUMMARY');

-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "profileImg" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "currency" "CurrencyType" NOT NULL DEFAULT 'KRW',
    "state" "UserState" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" SERIAL NOT NULL,
    "nickName" TEXT NOT NULL,
    "type" "AccountType" NOT NULL DEFAULT 'ETC',
    "note" TEXT,
    "isDelete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_transaction" (
    "id" SERIAL NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "amount" DECIMAL(20,3) NOT NULL DEFAULT 0,
    "currency" "CurrencyType",
    "type" "TransactionType" NOT NULL DEFAULT 'DEPOSIT',
    "note" TEXT,
    "isDelete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accountId" INTEGER NOT NULL,

    CONSTRAINT "bank_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_summary" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "accountNumber" TEXT NOT NULL,
    "totalDepositAmount" DECIMAL(20,10) NOT NULL DEFAULT 0,
    "totalWithdrawalAmount" DECIMAL(20,10) NOT NULL DEFAULT 0,
    "balance" DECIMAL(20,10) NOT NULL DEFAULT 0,
    "currency" "CurrencyType" NOT NULL,
    "isDelete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accountId" INTEGER NOT NULL,

    CONSTRAINT "bank_summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coin_transaction" (
    "id" SERIAL NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "name" TEXT,
    "symbol" TEXT,
    "slug" TEXT,
    "quantity" DECIMAL(25,12) NOT NULL DEFAULT 0,
    "price" DECIMAL(25,12) NOT NULL DEFAULT 0,
    "amount" DECIMAL(25,12) NOT NULL DEFAULT 0,
    "fee" DECIMAL(25,12) NOT NULL DEFAULT 0,
    "currency" "CurrencyType",
    "type" "TransactionType" NOT NULL DEFAULT 'BUY',
    "note" TEXT,
    "isDelete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accountId" INTEGER NOT NULL,

    CONSTRAINT "coin_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coin_summary" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "accountNumber" TEXT,
    "symbol" TEXT,
    "slug" TEXT,
    "quantity" DECIMAL(25,12) NOT NULL DEFAULT 0,
    "amount" DECIMAL(25,12) NOT NULL DEFAULT 0,
    "currency" "CurrencyType" NOT NULL,
    "type" "SummaryType" NOT NULL DEFAULT 'CASH',
    "isDelete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accountId" INTEGER NOT NULL,

    CONSTRAINT "coin_summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transaction" (
    "id" SERIAL NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "name" TEXT,
    "symbol" TEXT,
    "quantity" DECIMAL(20,10) NOT NULL DEFAULT 0,
    "price" DECIMAL(20,10) NOT NULL DEFAULT 0,
    "amount" DECIMAL(20,10) NOT NULL DEFAULT 0,
    "fee" DECIMAL(20,10) NOT NULL DEFAULT 0,
    "currency" "CurrencyType",
    "type" "TransactionType" NOT NULL DEFAULT 'BUY',
    "note" TEXT,
    "isDelete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accountId" INTEGER NOT NULL,

    CONSTRAINT "stock_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_summary" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "accountNumber" TEXT,
    "symbol" TEXT,
    "stockCompanyCode" TEXT,
    "quantity" DECIMAL(20,10) NOT NULL DEFAULT 0,
    "amount" DECIMAL(20,10) NOT NULL DEFAULT 0,
    "currency" "CurrencyType" NOT NULL,
    "market" TEXT,
    "logoImageUrl" TEXT,
    "type" "SummaryType" NOT NULL DEFAULT 'CASH',
    "isDelete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accountId" INTEGER NOT NULL,

    CONSTRAINT "stock_summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etc_transaction" (
    "id" SERIAL NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "purchasePrice" DECIMAL(15,5) NOT NULL,
    "currentPrice" DECIMAL(15,5),
    "operation" TEXT,
    "currency" "CurrencyType",
    "note" TEXT,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "isDelete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accountId" INTEGER NOT NULL,

    CONSTRAINT "etc_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etc_summary" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "accountNumber" TEXT,
    "totalDepositAmount" DECIMAL(20,10) NOT NULL DEFAULT 0,
    "totalWithdrawalAmount" DECIMAL(20,10) NOT NULL DEFAULT 0,
    "balance" DECIMAL(20,10) NOT NULL DEFAULT 0,
    "purchasePrice" DECIMAL(15,5) NOT NULL DEFAULT 0,
    "currentPrice" DECIMAL(15,5),
    "count" INTEGER NOT NULL DEFAULT 0,
    "isDelete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accountId" INTEGER NOT NULL,

    CONSTRAINT "etc_summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liabilities_transaction" (
    "id" SERIAL NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(15,5) NOT NULL DEFAULT 0,
    "remainingAmount" DECIMAL(15,5),
    "rate" DECIMAL(15,5) NOT NULL DEFAULT 0,
    "isYearly" BOOLEAN NOT NULL DEFAULT true,
    "operation" TEXT,
    "currency" "CurrencyType",
    "note" TEXT,
    "repaymentDate" TIMESTAMP(3),
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "isDelete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accountId" INTEGER NOT NULL,

    CONSTRAINT "liabilities_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liabilities_summary" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "accountNumber" TEXT,
    "totalDepositAmount" DECIMAL(20,10) NOT NULL DEFAULT 0,
    "totalWithdrawalAmount" DECIMAL(20,10) NOT NULL DEFAULT 0,
    "balance" DECIMAL(20,10) NOT NULL DEFAULT 0,
    "amount" DECIMAL(15,5) NOT NULL DEFAULT 0,
    "remainingAmount" DECIMAL(15,5),
    "count" INTEGER NOT NULL DEFAULT 0,
    "isDelete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accountId" INTEGER NOT NULL,

    CONSTRAINT "liabilities_summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_price_history" (
    "id" SERIAL NOT NULL,
    "symbol" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "base" DECIMAL(20,10) NOT NULL DEFAULT 0,
    "close" DECIMAL(20,10) NOT NULL DEFAULT 0,
    "volume" DECIMAL(20,0) NOT NULL DEFAULT 0,
    "changeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coin_price_history" (
    "id" SERIAL NOT NULL,
    "symbol" TEXT NOT NULL,
    "slug" TEXT,
    "currency" TEXT,
    "price" DECIMAL(25,12) NOT NULL DEFAULT 0,
    "marketCap" DECIMAL(25,12),
    "volumeChange24h" DECIMAL(25,12),
    "lastUpdated" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coin_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rate" (
    "id" SERIAL NOT NULL,
    "base" TEXT NOT NULL,
    "exchangeRates" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exchange_rate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rebalancing_goal" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "goalType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "targetRatio" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rebalancing_goal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "bank_summary_accountId_key" ON "bank_summary"("accountId");

-- CreateIndex
CREATE INDEX "coin_transaction_symbol_idx" ON "coin_transaction"("symbol");

-- CreateIndex
CREATE INDEX "coin_summary_symbol_idx" ON "coin_summary"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "coin_summary_accountId_type_symbol_currency_key" ON "coin_summary"("accountId", "type", "symbol", "currency");

-- CreateIndex
CREATE INDEX "stock_transaction_symbol_idx" ON "stock_transaction"("symbol");

-- CreateIndex
CREATE INDEX "stock_summary_symbol_idx" ON "stock_summary"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "stock_summary_accountId_type_symbol_key" ON "stock_summary"("accountId", "type", "symbol");

-- CreateIndex
CREATE UNIQUE INDEX "etc_summary_accountId_key" ON "etc_summary"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "liabilities_summary_accountId_key" ON "liabilities_summary"("accountId");

-- CreateIndex
CREATE INDEX "stock_price_history_symbol_id_idx" ON "stock_price_history"("symbol", "id");

-- CreateIndex
CREATE INDEX "stock_price_history_symbol_idx" ON "stock_price_history"("symbol");

-- CreateIndex
CREATE INDEX "stock_price_history_currency_idx" ON "stock_price_history"("currency");

-- CreateIndex
CREATE INDEX "coin_price_history_symbol_id_idx" ON "coin_price_history"("symbol", "id");

-- CreateIndex
CREATE INDEX "coin_price_history_symbol_idx" ON "coin_price_history"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "rebalancing_goal_userId_goalType_referenceId_key" ON "rebalancing_goal"("userId", "goalType", "referenceId");

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transaction" ADD CONSTRAINT "bank_transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_summary" ADD CONSTRAINT "bank_summary_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_transaction" ADD CONSTRAINT "coin_transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_summary" ADD CONSTRAINT "coin_summary_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transaction" ADD CONSTRAINT "stock_transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_summary" ADD CONSTRAINT "stock_summary_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etc_transaction" ADD CONSTRAINT "etc_transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etc_summary" ADD CONSTRAINT "etc_summary_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liabilities_transaction" ADD CONSTRAINT "liabilities_transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liabilities_summary" ADD CONSTRAINT "liabilities_summary_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rebalancing_goal" ADD CONSTRAINT "rebalancing_goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

Done in 0.82s.
