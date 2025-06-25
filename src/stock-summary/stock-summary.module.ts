import { Module } from "@nestjs/common"
import { StockSummaryService } from "./stock-summary.service"
import { StockSummaryResolver } from "./stock-summary.resolver"
import { ExchangeModule } from "../exchange/exchange.module"
import { StockPriceHistoryModule } from "../stock-price-history/stock-price-history.module"
import { StockSummaryDataLoader } from "./stock-summary.dataloader"

@Module({
  imports: [ExchangeModule, StockPriceHistoryModule],
  providers: [StockSummaryResolver, StockSummaryService, StockSummaryDataLoader],
  exports: [StockSummaryDataLoader],
})
export class StockSummaryModule {}
