import { Module } from "@nestjs/common"
import { LiabilitiesSummaryService } from "./liabilities-summary.service"
import { LiabilitiesSummaryResolver } from "./liabilities-summary.resolver"
import { LiabilitiesSummaryDataLoader } from "./liabilities-summary.dataloader"

@Module({
  imports: [],
  providers: [LiabilitiesSummaryResolver, LiabilitiesSummaryService, LiabilitiesSummaryDataLoader],
  exports: [LiabilitiesSummaryDataLoader],
})
export class LiabilitiesSummaryModule {}
