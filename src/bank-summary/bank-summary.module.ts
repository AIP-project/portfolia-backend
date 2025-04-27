import { Module } from "@nestjs/common"
import { BankSummaryService } from "./bank-summary.service"
import { BankSummaryResolver } from "./bank-summary.resolver"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Account } from "../account/entities/account.entity"
import { BankSummary } from "./entities"

@Module({
  imports: [TypeOrmModule.forFeature([BankSummary, Account])],
  providers: [BankSummaryResolver, BankSummaryService],
})
export class BankSummaryModule {}
