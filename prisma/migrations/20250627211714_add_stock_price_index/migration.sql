/*
  Warnings:

  - Made the column `currency` on table `stock_price_history` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `stock_price_history` MODIFY `currency` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE INDEX `stock_price_history_currency_idx` ON `stock_price_history`(`currency`);
