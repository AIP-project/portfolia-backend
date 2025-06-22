import { Module } from "@nestjs/common"
import { CoinSummaryService } from "./coin-summary.service"
import { CoinSummaryResolver } from "./coin-summary.resolver"
import { ExchangeModule } from "../exchange/exchange.module"
import { CoinPriceHistoryModule } from "../coin-price-history/coin-price-history.module"

@Module({
  imports: [ExchangeModule, CoinPriceHistoryModule],
  providers: [CoinSummaryResolver, CoinSummaryService],
})
export class CoinSummaryModule {}
