import { Module } from "@nestjs/common"
import { BankSummaryService } from "./bank-summary.service"
import { BankSummaryResolver } from "./bank-summary.resolver"
import { BankSummaryDataLoader } from "./bank-summary.dataloader"
import { ExchangeModule } from "../exchange/exchange.module"

@Module({
  imports: [ExchangeModule],
  providers: [BankSummaryResolver, BankSummaryService, BankSummaryDataLoader],
  exports: [BankSummaryDataLoader],
})
export class BankSummaryModule {}
