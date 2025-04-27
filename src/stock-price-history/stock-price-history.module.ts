import { Module } from "@nestjs/common"
import { StockPriceHistoryService } from "./stock-price-history.service"
import { StockPriceHistoryResolver } from "./stock-price-history.resolver"
import { TypeOrmModule } from "@nestjs/typeorm"
import { StockSummary } from "../stock-summary/entities"
import { StockPriceHistory } from "./entities"
import { HttpModule } from "@nestjs/axios"
import { StockPriceHistoryTask } from "./stock-price-history.task"
import { DistributeLockModule } from "../common/service/distributeLock"
import { StockPriceDataloader } from "./stock-price.dataloader"

@Module({
  imports: [TypeOrmModule.forFeature([StockPriceHistory, StockSummary]), HttpModule, DistributeLockModule],
  providers: [StockPriceHistoryResolver, StockPriceHistoryService, StockPriceHistoryTask, StockPriceDataloader],
  exports: [StockPriceDataloader],
})
export class StockPriceHistoryModule {}
