import { Module } from "@nestjs/common"
import { CoinTransactionService } from "./coin-transaction.service"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Account } from "../account/entities/account.entity"
import { CoinTransactionResolver } from "./coin-transaction.resolver"
import { CoinTransaction } from "./entities"
import { CoinSummary } from "../coin-summary/entities"

@Module({
  imports: [TypeOrmModule.forFeature([CoinTransaction, Account, CoinSummary])],
  providers: [CoinTransactionResolver, CoinTransactionService],
})
export class CoinTransactionModule {}
