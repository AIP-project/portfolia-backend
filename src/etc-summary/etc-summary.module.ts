import { Module } from "@nestjs/common"
import { EtcSummaryService } from "./etc-summary.service"
import { EtcSummaryResolver } from "./etc-summary.resolver"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Account } from "../account/entities/account.entity"
import { EtcSummary } from "./entities"

@Module({
  imports: [TypeOrmModule.forFeature([EtcSummary, Account])],
  providers: [EtcSummaryResolver, EtcSummaryService],
})
export class EtcSummaryModule {}
