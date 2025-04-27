import { Module } from "@nestjs/common"
import { CoinSummaryService } from "./coin-summary.service"
import { CoinSummaryResolver } from "./coin-summary.resolver"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Account } from "../account/entities/account.entity"
import { CoinSummary } from "./entities"
import { ExchangeModule } from "../exchange/exchange.module"
import { CoinPriceHistoryModule } from "../coin-price-history/coin-price-history.module"

@Module({
  imports: [TypeOrmModule.forFeature([CoinSummary, Account]), ExchangeModule, CoinPriceHistoryModule],
  providers: [CoinSummaryResolver, CoinSummaryService],
})
export class CoinSummaryModule {}
