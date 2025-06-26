import { Module } from "@nestjs/common"
import { StockPriceHistoryService } from "./stock-price-history.service"
import { StockPriceHistoryResolver } from "./stock-price-history.resolver"
import { HttpModule } from "@nestjs/axios"
import { StockPriceHistoryTask } from "./stock-price-history.task"
import { DistributeLockModule } from "../common/service/distributeLock"
import { StockPriceDataLoader } from "./stock-price.dataloader"

@Module({
  imports: [HttpModule, DistributeLockModule],
  providers: [StockPriceHistoryResolver, StockPriceHistoryService, StockPriceHistoryTask, StockPriceDataLoader],
  exports: [StockPriceDataLoader],
})
export class StockPriceHistoryModule {}
