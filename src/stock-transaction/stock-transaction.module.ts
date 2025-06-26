import { Module } from "@nestjs/common"
import { StockTransactionService } from "./stock-transaction.service"
import { StockTransactionResolver } from "./stock-transaction.resolver"
import { HttpModule } from "@nestjs/axios"

@Module({
  imports: [HttpModule],
  providers: [StockTransactionResolver, StockTransactionService],
})
export class StockTransactionModule {}
