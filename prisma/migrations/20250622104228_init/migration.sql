-- CreateTable
CREATE TABLE `user` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `profileImg` VARCHAR(191) NULL,
    `role` ENUM('USER', 'MANAGER', 'ADMIN') NOT NULL DEFAULT 'USER',
    `currency` ENUM('KRW', 'USD', 'EUR', 'JPY', 'CNY', 'GBP', 'AUD', 'CAD', 'CHF', 'HKD', 'SGD', 'SEK', 'NOK', 'MXN', 'NZD', 'TRY', 'BRL', 'TWD', 'DKK', 'PLN', 'THB', 'ILS', 'PHP', 'CZK', 'AED', 'COP', 'SAR', 'CLP', 'MYR', 'RON') NOT NULL DEFAULT 'KRW',
    `state` ENUM('ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED', 'BANNED', 'DORMANT', 'DELETED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `account` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nickName` VARCHAR(191) NOT NULL,
    `type` ENUM('BANK', 'STOCK', 'COIN', 'ETC', 'LIABILITIES') NOT NULL DEFAULT 'ETC',
    `currency` ENUM('KRW', 'USD', 'EUR', 'JPY', 'CNY', 'GBP', 'AUD', 'CAD', 'CHF', 'HKD', 'SGD', 'SEK', 'NOK', 'MXN', 'NZD', 'TRY', 'BRL', 'TWD', 'DKK', 'PLN', 'THB', 'ILS', 'PHP', 'CZK', 'AED', 'COP', 'SAR', 'CLP', 'MYR', 'RON') NOT NULL DEFAULT 'KRW',
    `note` VARCHAR(191) NULL,
    `isDelete` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bank_transaction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transactionDate` DATETIME(3) NOT NULL,
    `name` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `amount` DECIMAL(20, 3) NOT NULL DEFAULT 0,
    `currency` ENUM('KRW', 'USD', 'EUR', 'JPY', 'CNY', 'GBP', 'AUD', 'CAD', 'CHF', 'HKD', 'SGD', 'SEK', 'NOK', 'MXN', 'NZD', 'TRY', 'BRL', 'TWD', 'DKK', 'PLN', 'THB', 'ILS', 'PHP', 'CZK', 'AED', 'COP', 'SAR', 'CLP', 'MYR', 'RON') NULL,
    `type` ENUM('BUY', 'SELL', 'DEPOSIT', 'WITHDRAWAL', 'TRANSFER') NOT NULL DEFAULT 'DEPOSIT',
    `note` VARCHAR(191) NULL,
    `isDelete` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `accountId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bank_summary` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NULL,
    `accountNumber` VARCHAR(191) NOT NULL,
    `totalDepositAmount` DECIMAL(20, 10) NOT NULL DEFAULT 0,
    `totalWithdrawalAmount` DECIMAL(20, 10) NOT NULL DEFAULT 0,
    `balance` DECIMAL(20, 10) NOT NULL DEFAULT 0,
    `currency` ENUM('KRW', 'USD', 'EUR', 'JPY', 'CNY', 'GBP', 'AUD', 'CAD', 'CHF', 'HKD', 'SGD', 'SEK', 'NOK', 'MXN', 'NZD', 'TRY', 'BRL', 'TWD', 'DKK', 'PLN', 'THB', 'ILS', 'PHP', 'CZK', 'AED', 'COP', 'SAR', 'CLP', 'MYR', 'RON') NULL,
    `isDelete` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `accountId` INTEGER NOT NULL,

    UNIQUE INDEX `bank_summary_accountId_key`(`accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coin_transaction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transactionDate` DATETIME(3) NOT NULL,
    `name` VARCHAR(191) NULL,
    `symbol` VARCHAR(191) NULL,
    `slug` VARCHAR(191) NULL,
    `quantity` DECIMAL(25, 12) NOT NULL DEFAULT 0,
    `price` DECIMAL(25, 12) NOT NULL DEFAULT 0,
    `amount` DECIMAL(25, 12) NOT NULL DEFAULT 0,
    `fee` DECIMAL(25, 12) NOT NULL DEFAULT 0,
    `currency` ENUM('KRW', 'USD', 'EUR', 'JPY', 'CNY', 'GBP', 'AUD', 'CAD', 'CHF', 'HKD', 'SGD', 'SEK', 'NOK', 'MXN', 'NZD', 'TRY', 'BRL', 'TWD', 'DKK', 'PLN', 'THB', 'ILS', 'PHP', 'CZK', 'AED', 'COP', 'SAR', 'CLP', 'MYR', 'RON') NULL,
    `type` ENUM('BUY', 'SELL', 'DEPOSIT', 'WITHDRAWAL', 'TRANSFER') NOT NULL DEFAULT 'BUY',
    `note` VARCHAR(191) NULL,
    `isDelete` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `accountId` INTEGER NOT NULL,

    INDEX `coin_transaction_symbol_idx`(`symbol`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coin_summary` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NULL,
    `accountNumber` VARCHAR(191) NULL,
    `symbol` VARCHAR(191) NULL,
    `slug` VARCHAR(191) NULL,
    `quantity` DECIMAL(25, 12) NOT NULL DEFAULT 0,
    `amount` DECIMAL(25, 12) NOT NULL DEFAULT 0,
    `currency` ENUM('KRW', 'USD', 'EUR', 'JPY', 'CNY', 'GBP', 'AUD', 'CAD', 'CHF', 'HKD', 'SGD', 'SEK', 'NOK', 'MXN', 'NZD', 'TRY', 'BRL', 'TWD', 'DKK', 'PLN', 'THB', 'ILS', 'PHP', 'CZK', 'AED', 'COP', 'SAR', 'CLP', 'MYR', 'RON') NULL,
    `type` ENUM('CASH', 'SUMMARY') NOT NULL DEFAULT 'CASH',
    `isDelete` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `accountId` INTEGER NOT NULL,

    INDEX `coin_summary_symbol_idx`(`symbol`),
    UNIQUE INDEX `coin_summary_accountId_type_symbol_currency_key`(`accountId`, `type`, `symbol`, `currency`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_transaction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transactionDate` DATETIME(3) NOT NULL,
    `name` VARCHAR(191) NULL,
    `symbol` VARCHAR(191) NULL,
    `quantity` DECIMAL(20, 10) NOT NULL DEFAULT 0,
    `price` DECIMAL(20, 10) NOT NULL DEFAULT 0,
    `amount` DECIMAL(20, 10) NOT NULL DEFAULT 0,
    `fee` DECIMAL(20, 10) NOT NULL DEFAULT 0,
    `currency` ENUM('KRW', 'USD', 'EUR', 'JPY', 'CNY', 'GBP', 'AUD', 'CAD', 'CHF', 'HKD', 'SGD', 'SEK', 'NOK', 'MXN', 'NZD', 'TRY', 'BRL', 'TWD', 'DKK', 'PLN', 'THB', 'ILS', 'PHP', 'CZK', 'AED', 'COP', 'SAR', 'CLP', 'MYR', 'RON') NULL,
    `type` ENUM('BUY', 'SELL', 'DEPOSIT', 'WITHDRAWAL', 'TRANSFER') NOT NULL DEFAULT 'BUY',
    `note` VARCHAR(191) NULL,
    `isDelete` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `accountId` INTEGER NOT NULL,

    INDEX `stock_transaction_symbol_idx`(`symbol`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_summary` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NULL,
    `accountNumber` VARCHAR(191) NULL,
    `symbol` VARCHAR(191) NULL,
    `stockCompanyCode` VARCHAR(191) NULL,
    `quantity` DECIMAL(20, 10) NOT NULL DEFAULT 0,
    `amount` DECIMAL(20, 10) NOT NULL DEFAULT 0,
    `currency` ENUM('KRW', 'USD', 'EUR', 'JPY', 'CNY', 'GBP', 'AUD', 'CAD', 'CHF', 'HKD', 'SGD', 'SEK', 'NOK', 'MXN', 'NZD', 'TRY', 'BRL', 'TWD', 'DKK', 'PLN', 'THB', 'ILS', 'PHP', 'CZK', 'AED', 'COP', 'SAR', 'CLP', 'MYR', 'RON') NULL,
    `market` VARCHAR(191) NULL,
    `logoImageUrl` VARCHAR(191) NULL,
    `type` ENUM('CASH', 'SUMMARY') NOT NULL DEFAULT 'CASH',
    `isDelete` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `accountId` INTEGER NOT NULL,

    INDEX `stock_summary_symbol_idx`(`symbol`),
    UNIQUE INDEX `stock_summary_accountId_type_symbol_key`(`accountId`, `type`, `symbol`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `etc_transaction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transactionDate` DATETIME(3) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `purchasePrice` DECIMAL(15, 5) NOT NULL,
    `currentPrice` DECIMAL(15, 5) NULL,
    `operation` VARCHAR(191) NULL,
    `currency` ENUM('KRW', 'USD', 'EUR', 'JPY', 'CNY', 'GBP', 'AUD', 'CAD', 'CHF', 'HKD', 'SGD', 'SEK', 'NOK', 'MXN', 'NZD', 'TRY', 'BRL', 'TWD', 'DKK', 'PLN', 'THB', 'ILS', 'PHP', 'CZK', 'AED', 'COP', 'SAR', 'CLP', 'MYR', 'RON') NULL,
    `note` VARCHAR(191) NULL,
    `isComplete` BOOLEAN NOT NULL DEFAULT false,
    `isDelete` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `accountId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `etc_summary` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NULL,
    `accountNumber` VARCHAR(191) NULL,
    `totalDepositAmount` DECIMAL(20, 10) NOT NULL DEFAULT 0,
    `totalWithdrawalAmount` DECIMAL(20, 10) NOT NULL DEFAULT 0,
    `balance` DECIMAL(20, 10) NOT NULL DEFAULT 0,
    `purchasePrice` DECIMAL(15, 5) NOT NULL DEFAULT 0,
    `currentPrice` DECIMAL(15, 5) NULL,
    `count` INTEGER NOT NULL DEFAULT 0,
    `currency` ENUM('KRW', 'USD', 'EUR', 'JPY', 'CNY', 'GBP', 'AUD', 'CAD', 'CHF', 'HKD', 'SGD', 'SEK', 'NOK', 'MXN', 'NZD', 'TRY', 'BRL', 'TWD', 'DKK', 'PLN', 'THB', 'ILS', 'PHP', 'CZK', 'AED', 'COP', 'SAR', 'CLP', 'MYR', 'RON') NULL,
    `isDelete` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `accountId` INTEGER NOT NULL,

    UNIQUE INDEX `etc_summary_accountId_key`(`accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `liabilities_transaction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transactionDate` DATETIME(3) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(15, 5) NOT NULL DEFAULT 0,
    `remainingAmount` DECIMAL(15, 5) NULL,
    `rate` DECIMAL(15, 5) NOT NULL DEFAULT 0,
    `isYearly` BOOLEAN NOT NULL DEFAULT true,
    `operation` VARCHAR(191) NULL,
    `currency` ENUM('KRW', 'USD', 'EUR', 'JPY', 'CNY', 'GBP', 'AUD', 'CAD', 'CHF', 'HKD', 'SGD', 'SEK', 'NOK', 'MXN', 'NZD', 'TRY', 'BRL', 'TWD', 'DKK', 'PLN', 'THB', 'ILS', 'PHP', 'CZK', 'AED', 'COP', 'SAR', 'CLP', 'MYR', 'RON') NULL,
    `note` VARCHAR(191) NULL,
    `repaymentDate` DATETIME(3) NULL,
    `isComplete` BOOLEAN NOT NULL DEFAULT false,
    `isDelete` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `accountId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `liabilities_summary` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NULL,
    `accountNumber` VARCHAR(191) NULL,
    `totalDepositAmount` DECIMAL(20, 10) NOT NULL DEFAULT 0,
    `totalWithdrawalAmount` DECIMAL(20, 10) NOT NULL DEFAULT 0,
    `balance` DECIMAL(20, 10) NOT NULL DEFAULT 0,
    `amount` DECIMAL(15, 5) NOT NULL DEFAULT 0,
    `remainingAmount` DECIMAL(15, 5) NULL,
    `count` INTEGER NOT NULL DEFAULT 0,
    `currency` ENUM('KRW', 'USD', 'EUR', 'JPY', 'CNY', 'GBP', 'AUD', 'CAD', 'CHF', 'HKD', 'SGD', 'SEK', 'NOK', 'MXN', 'NZD', 'TRY', 'BRL', 'TWD', 'DKK', 'PLN', 'THB', 'ILS', 'PHP', 'CZK', 'AED', 'COP', 'SAR', 'CLP', 'MYR', 'RON') NULL,
    `isDelete` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `accountId` INTEGER NOT NULL,

    UNIQUE INDEX `liabilities_summary_accountId_key`(`accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_price_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `symbol` VARCHAR(191) NOT NULL,
    `currency` VARCHAR(191) NULL,
    `base` DECIMAL(20, 10) NOT NULL DEFAULT 0,
    `close` DECIMAL(20, 10) NOT NULL DEFAULT 0,
    `volume` DECIMAL(20, 0) NOT NULL DEFAULT 0,
    `changeType` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `stock_price_history_symbol_id_idx`(`symbol`, `id`),
    INDEX `stock_price_history_symbol_idx`(`symbol`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coin_price_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `symbol` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NULL,
    `currency` VARCHAR(191) NULL,
    `price` DECIMAL(25, 12) NOT NULL DEFAULT 0,
    `marketCap` DECIMAL(25, 12) NULL,
    `volumeChange24h` DECIMAL(25, 12) NULL,
    `lastUpdated` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `coin_price_history_symbol_id_idx`(`symbol`, `id`),
    INDEX `coin_price_history_symbol_idx`(`symbol`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exchange_rate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `base` VARCHAR(191) NOT NULL,
    `exchangeRates` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `account` ADD CONSTRAINT `account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_transaction` ADD CONSTRAINT `bank_transaction_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_summary` ADD CONSTRAINT `bank_summary_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coin_transaction` ADD CONSTRAINT `coin_transaction_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coin_summary` ADD CONSTRAINT `coin_summary_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transaction` ADD CONSTRAINT `stock_transaction_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_summary` ADD CONSTRAINT `stock_summary_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `etc_transaction` ADD CONSTRAINT `etc_transaction_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `etc_summary` ADD CONSTRAINT `etc_summary_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `liabilities_transaction` ADD CONSTRAINT `liabilities_transaction_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `liabilities_summary` ADD CONSTRAINT `liabilities_summary_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
