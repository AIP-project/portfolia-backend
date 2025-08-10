import { Module } from "@nestjs/common"
import { CoinPriceHistoryResolver } from "./coin-price-history.resolver"
import { HttpModule } from "@nestjs/axios"
import { CoinPriceHistoryTask } from "./coin-price-history.task"
import { CoinPriceHistoryService } from "./coin-price-history.service"
import { DistributeLockModule } from "../../common/service/distributeLock"
import { CoinPriceDataLoader } from "./coin-price.dataloader"

@Module({
  imports: [HttpModule, DistributeLockModule],
  providers: [CoinPriceHistoryResolver, CoinPriceHistoryService, CoinPriceHistoryTask, CoinPriceDataLoader],
  exports: [CoinPriceDataLoader],
})
export class CoinPriceHistoryModule {}
