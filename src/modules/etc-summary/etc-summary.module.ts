import { Module } from "@nestjs/common"
import { EtcSummaryService } from "./etc-summary.service"
import { EtcSummaryResolver } from "./etc-summary.resolver"
import { EtcSummaryDataLoader } from "./etc-summary.dataloader"

@Module({
  imports: [],
  providers: [EtcSummaryResolver, EtcSummaryService, EtcSummaryDataLoader],
  exports: [EtcSummaryDataLoader],
})
export class EtcSummaryModule {}
