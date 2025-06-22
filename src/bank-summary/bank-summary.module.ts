import { Module } from "@nestjs/common"
import { BankSummaryService } from "./bank-summary.service"
import { BankSummaryResolver } from "./bank-summary.resolver"

@Module({
  imports: [],
  providers: [BankSummaryResolver, BankSummaryService],
})
export class BankSummaryModule {}
