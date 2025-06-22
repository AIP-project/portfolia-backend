import { Module } from "@nestjs/common"
import { LiabilitiesSummaryService } from "./liabilities-summary.service"
import { LiabilitiesSummaryResolver } from "./liabilities-summary.resolver"

@Module({
  imports: [],
  providers: [LiabilitiesSummaryResolver, LiabilitiesSummaryService],
})
export class LiabilitiesSummaryModule {}
