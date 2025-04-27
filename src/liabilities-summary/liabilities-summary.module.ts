import { Module } from "@nestjs/common"
import { LiabilitiesSummaryService } from "./liabilities-summary.service"
import { LiabilitiesSummaryResolver } from "./liabilities-summary.resolver"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Account } from "../account/entities/account.entity"
import { LiabilitiesSummary } from "./entities"

@Module({
  imports: [TypeOrmModule.forFeature([LiabilitiesSummary, Account])],
  providers: [LiabilitiesSummaryResolver, LiabilitiesSummaryService],
})
export class LiabilitiesSummaryModule {}
