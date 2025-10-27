/*
  Warnings:

  - You are about to drop the column `currency` on the `account` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `etc_summary` table. All the data in the column will be lost.
  - Made the column `currency` on table `bank_summary` required. This step will fail if there are existing NULL values in that column.
  - Made the column `currency` on table `coin_summary` required. This step will fail if there are existing NULL values in that column.
  - Made the column `currency` on table `stock_summary` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `account` DROP COLUMN `currency`;

-- AlterTable
ALTER TABLE `bank_summary` MODIFY `currency` ENUM('KRW', 'USD', 'EUR', 'JPY', 'CNY', 'GBP', 'AUD', 'CAD', 'CHF', 'HKD', 'SGD', 'SEK', 'NOK', 'MXN', 'NZD', 'TRY', 'BRL', 'TWD', 'DKK', 'PLN', 'THB', 'ILS', 'PHP', 'CZK', 'AED', 'COP', 'SAR', 'CLP', 'MYR', 'RON') NOT NULL;

-- AlterTable
ALTER TABLE `coin_summary` MODIFY `currency` ENUM('KRW', 'USD', 'EUR', 'JPY', 'CNY', 'GBP', 'AUD', 'CAD', 'CHF', 'HKD', 'SGD', 'SEK', 'NOK', 'MXN', 'NZD', 'TRY', 'BRL', 'TWD', 'DKK', 'PLN', 'THB', 'ILS', 'PHP', 'CZK', 'AED', 'COP', 'SAR', 'CLP', 'MYR', 'RON') NOT NULL;

-- AlterTable
ALTER TABLE `etc_summary` DROP COLUMN `currency`;

-- AlterTable
ALTER TABLE `stock_summary` MODIFY `currency` ENUM('KRW', 'USD', 'EUR', 'JPY', 'CNY', 'GBP', 'AUD', 'CAD', 'CHF', 'HKD', 'SGD', 'SEK', 'NOK', 'MXN', 'NZD', 'TRY', 'BRL', 'TWD', 'DKK', 'PLN', 'THB', 'ILS', 'PHP', 'CZK', 'AED', 'COP', 'SAR', 'CLP', 'MYR', 'RON') NOT NULL;
