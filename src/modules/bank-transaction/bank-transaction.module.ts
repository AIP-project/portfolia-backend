import { Module } from "@nestjs/common"
import { BankTransactionService } from "./bank-transaction.service"
import { BankTransactionResolver } from "./bank-transaction.resolver"

@Module({
  imports: [],
  providers: [BankTransactionResolver, BankTransactionService],
})
export class BankTransactionModule {}
