import { Module } from "@nestjs/common"
import { StockTransactionService } from "./stock-transaction.service"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Account } from "../account/entities/account.entity"
import { StockTransaction } from "./entities"
import { StockTransactionResolver } from "./stock-transaction.resolver"
import { HttpModule } from "@nestjs/axios"
import { StockSummary } from "../stock-summary/entities"

@Module({
  imports: [TypeOrmModule.forFeature([StockTransaction, Account, StockSummary]), HttpModule],
  providers: [StockTransactionResolver, StockTransactionService],
})
export class StockTransactionModule {}
