/*
  Warnings:

  - You are about to drop the column `currency` on the `liabilities_summary` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `account` MODIFY `currency` ENUM('KRW', 'USD', 'EUR', 'JPY', 'CNY', 'GBP', 'AUD', 'CAD', 'CHF', 'HKD', 'SGD', 'SEK', 'NOK', 'MXN', 'NZD', 'TRY', 'BRL', 'TWD', 'DKK', 'PLN', 'THB', 'ILS', 'PHP', 'CZK', 'AED', 'COP', 'SAR', 'CLP', 'MYR', 'RON') NULL;

-- AlterTable
ALTER TABLE `liabilities_summary` DROP COLUMN `currency`;
