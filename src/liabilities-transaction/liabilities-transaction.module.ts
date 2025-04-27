import { Module } from "@nestjs/common"
import { LiabilitiesTransactionService } from "./liabilities-transaction.service"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Account } from "../account/entities/account.entity"
import { LiabilitiesTransactionResolver } from "./liabilities-transaction.resolver"
import { LiabilitiesTransaction } from "./entities"
import { LiabilitiesSummary } from "../liabilities-summary/entities"

@Module({
  imports: [TypeOrmModule.forFeature([LiabilitiesTransaction, LiabilitiesSummary, Account])],
  providers: [LiabilitiesTransactionResolver, LiabilitiesTransactionService],
})
export class LiabilitiesTransactionModule {}
