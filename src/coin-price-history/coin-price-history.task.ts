import { Injectable, Logger } from "@nestjs/common"
import { Cron, CronExpression } from "@nestjs/schedule"
import { CoinPriceHistoryService } from "./coin-price-history.service"
import { DistributeLockService } from "../common/service/distributeLock"

@Injectable()
export class CoinPriceHistoryTask {
  private readonly logger = new Logger(CoinPriceHistoryTask.name)

  constructor(
    private readonly coinPriceHistoryService: CoinPriceHistoryService,
    private readonly lockService: DistributeLockService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async updateCoinPrice() {
    const lockKey = "{task}:updateCoinPrice"

    // 락 획득 시도
    const lockAcquired = await this.lockService.acquireLock(lockKey, 300) // 5분(300초) TTL

    if (!lockAcquired) {
      this.logger.log("Another instance is already running updateCoinPrice")
      return
    }

    try {
      this.logger.log("Starting updateCoinPrice with lock acquired")
      const value = await this.coinPriceHistoryService.updateCoinPrice()
      this.logger.log(`Coin price updated: ${value}`)
    } catch (error) {
      this.logger.error("Failed to update coin price", error)
    } finally {
      // 락 해제
      await this.lockService.releaseLock(lockKey)
      this.logger.log("Released lock for updateCoinPrice")
    }
  }
}
