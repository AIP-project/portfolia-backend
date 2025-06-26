import { Module } from "@nestjs/common"
import { AccountService } from "./account.service"
import { AccountResolver } from "./account.resolver"
import { StockSummaryModule } from "../stock-summary/stock-summary.module"
import { BankSummaryModule } from "../bank-summary/bank-summary.module"
import { CoinSummaryModule } from "../coin-summary/coin-summary.module"
import { EtcSummaryModule } from "../etc-summary/etc-summary.module"
import { LiabilitiesSummaryModule } from "../liabilities-summary/liabilities-summary.module"

@Module({
  imports: [BankSummaryModule, StockSummaryModule, CoinSummaryModule, EtcSummaryModule, LiabilitiesSummaryModule],
  providers: [AccountResolver, AccountService],
})
export class AccountModule {}
