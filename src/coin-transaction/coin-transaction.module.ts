import { Module } from "@nestjs/common"
import { CoinTransactionService } from "./coin-transaction.service"
import { CoinTransactionResolver } from "./coin-transaction.resolver"

@Module({
  imports: [],
  providers: [CoinTransactionResolver, CoinTransactionService],
})
export class CoinTransactionModule {}
