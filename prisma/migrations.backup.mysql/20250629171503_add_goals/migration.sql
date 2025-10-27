-- CreateTable
CREATE TABLE `rebalancing_goal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `goalType` VARCHAR(191) NOT NULL,
    `referenceId` VARCHAR(191) NOT NULL,
    `targetRatio` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `rebalancing_goal_userId_goalType_referenceId_key`(`userId`, `goalType`, `referenceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `rebalancing_goal` ADD CONSTRAINT `rebalancing_goal_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
