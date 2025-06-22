import { Module } from "@nestjs/common"
import { EtcSummaryService } from "./etc-summary.service"
import { EtcSummaryResolver } from "./etc-summary.resolver"

@Module({
  imports: [],
  providers: [EtcSummaryResolver, EtcSummaryService],
})
export class EtcSummaryModule {}
