import { Module } from "@nestjs/common"
import { StockTransactionService } from "./stock-transaction.service"
import { StockTransactionResolver } from "./stock-transaction.resolver"
import { HttpModule } from "@nestjs/axios"
import { StockPriceHistoryModule } from "../stock-price-history/stock-price-history.module"

@Module({
  imports: [HttpModule, StockPriceHistoryModule],
  providers: [StockTransactionResolver, StockTransactionService],
})
export class StockTransactionModule {}
