import { Module } from "@nestjs/common"
import { StockSummaryService } from "./stock-summary.service"
import { StockSummaryResolver } from "./stock-summary.resolver"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Account } from "../account/entities/account.entity"
import { StockSummary } from "./entities"
import { ExchangeModule } from "../exchange/exchange.module"
import { StockPriceHistoryModule } from "../stock-price-history/stock-price-history.module"
import { StockSummaryDataLoader } from "./stock-summary.dataloader"

@Module({
  imports: [TypeOrmModule.forFeature([StockSummary, Account]), ExchangeModule, StockPriceHistoryModule],
  providers: [StockSummaryResolver, StockSummaryService, StockSummaryDataLoader],
  exports: [StockSummaryDataLoader]
})
export class StockSummaryModule {}
