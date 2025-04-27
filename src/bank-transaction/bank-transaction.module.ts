import { Module } from "@nestjs/common"
import { BankTransactionService } from "./bank-transaction.service"
import { BankTransactionResolver } from "./bank-transaction.resolver"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Account } from "../account/entities/account.entity"
import { BankTransaction } from "./entities"
import { BankSummary } from "../bank-summary/entities"

@Module({
  imports: [TypeOrmModule.forFeature([BankTransaction, Account, BankSummary])],
  providers: [BankTransactionResolver, BankTransactionService],
})
export class BankTransactionModule {}
