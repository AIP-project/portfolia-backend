import { Injectable, Logger } from "@nestjs/common"
import { Cron, CronExpression } from "@nestjs/schedule"
import { StockPriceHistoryService } from "./stock-price-history.service"
import { DistributeLockService } from "../common/service/distributeLock"

@Injectable()
export class StockPriceHistoryTask {
  private readonly logger = new Logger(StockPriceHistoryTask.name)

  constructor(
    private readonly stockPriceHistoryService: StockPriceHistoryService,
    private readonly lockService: DistributeLockService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async updateStockPrice() {
    const lockKey = "{task}:updateStockPrice"

    // 락 획득 시도
    const lockAcquired = await this.lockService.acquireLock(lockKey, 300) // 5분(300초) TTL

    if (!lockAcquired) {
      this.logger.log("Another instance is already running updateStockPrice")
      return
    }

    try {
      this.logger.log("Starting updateStockPrice with lock acquired")
      const value = await this.stockPriceHistoryService.updateStockPrice()
      this.logger.log(`Stock price updated: ${value}`)
    } catch (error) {
      this.logger.error("Failed to update stock price", error)
    } finally {
      // 락 해제
      await this.lockService.releaseLock(lockKey)
      this.logger.log("Released lock for updateStockPrice")
    }
  }
}
