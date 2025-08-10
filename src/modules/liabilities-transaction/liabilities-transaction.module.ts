import { Module } from "@nestjs/common"
import { LiabilitiesTransactionService } from "./liabilities-transaction.service"
import { LiabilitiesTransactionResolver } from "./liabilities-transaction.resolver"

@Module({
  imports: [],
  providers: [LiabilitiesTransactionResolver, LiabilitiesTransactionService],
})
export class LiabilitiesTransactionModule {}
