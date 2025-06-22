import { Module } from "@nestjs/common"
import { AccountService } from "./account.service"
import { AccountResolver } from "./account.resolver"
import { StockSummaryModule } from "../stock-summary/stock-summary.module"

@Module({
  imports: [StockSummaryModule],
  providers: [AccountResolver, AccountService],
})
export class AccountModule {}
