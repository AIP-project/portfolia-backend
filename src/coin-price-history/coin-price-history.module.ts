import { Module } from "@nestjs/common"
import { CoinPriceHistoryResolver } from "./coin-price-history.resolver"
import { TypeOrmModule } from "@nestjs/typeorm"
import { CoinPriceHistory } from "./entities"
import { HttpModule } from "@nestjs/axios"
import { CoinPriceHistoryTask } from "./coin-price-history.task"
import { CoinPriceHistoryService } from "./coin-price-history.service"
import { CoinSummary } from "../coin-summary/entities"
import { DistributeLockModule } from "../common/service/distributeLock"
import { CoinPriceDataloader } from "./coin-price.dataloader"

@Module({
  imports: [TypeOrmModule.forFeature([CoinPriceHistory, CoinSummary]), HttpModule, DistributeLockModule],
  providers: [CoinPriceHistoryResolver, CoinPriceHistoryService, CoinPriceHistoryTask, CoinPriceDataloader],
  exports: [CoinPriceDataloader],
})
export class CoinPriceHistoryModule {}
