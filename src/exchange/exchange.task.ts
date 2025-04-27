import { Injectable, Logger } from "@nestjs/common"
import { Cron } from "@nestjs/schedule"
import { ExchangeService } from "./exchange.service"
import { DistributeLockService } from "../common/service/distributeLock"

@Injectable()
export class ExchangeTask {
  private readonly logger = new Logger(ExchangeTask.name)

  constructor(
    private readonly exchangeService: ExchangeService,
    private readonly distributeLockService: DistributeLockService,
  ) {}

  @Cron("0 0,9-23 * * *")
  async updateExchangeHourly() {
    const lockKey = "{task}:updateExchange"

    // 락 획득 시도 (10분 동안 유효)
    const lockAcquired = await this.distributeLockService.acquireLock(lockKey, 600)

    if (!lockAcquired) {
      this.logger.log("Skip: Another instance is already running updateExchange")
      return
    }

    try {
      this.logger.log("Starting updateExchange with lock acquired")
      const value = await this.exchangeService.updateExchange()
      this.logger.log(`Exchange price updated: ${value}`)
    } catch (error) {
      this.logger.error("Failed to update exchange price", error)
    } finally {
      // 작업 완료 후 락 해제
      await this.distributeLockService.releaseLock(lockKey)
      this.logger.log("Released lock for updateExchange")
    }
  }

  @Cron("0,30 1-8 * * *")
  async updateExchangeHalfHourly() {
    const lockKey = "{task}:updateExchange"

    // 락 획득 시도 (10분 동안 유효)
    const lockAcquired = await this.distributeLockService.acquireLock(lockKey, 600)

    if (!lockAcquired) {
      this.logger.log("Skip: Another instance is already running updateExchange")
      return
    }

    try {
      this.logger.log("Starting updateExchange with lock acquired")
      const value = await this.exchangeService.updateExchange()
      this.logger.log(`Exchange price updated: ${value}`)
    } catch (error) {
      this.logger.error("Failed to update exchange price", error)
    } finally {
      // 작업 완료 후 락 해제
      await this.distributeLockService.releaseLock(lockKey)
      this.logger.log("Released lock for updateExchange")
    }
  }
}
