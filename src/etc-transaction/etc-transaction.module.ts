import { Module } from "@nestjs/common"
import { EtcTransactionService } from "./etc-transaction.service"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Account } from "../account/entities/account.entity"
import { EtcTransaction } from "./entities"
import { EtcSummary } from "../etc-summary/entities"
import { EtcTransactionResolver } from "./etc-transaction.resolver"

@Module({
  imports: [TypeOrmModule.forFeature([EtcTransaction, Account, EtcSummary])],
  providers: [EtcTransactionResolver, EtcTransactionService],
})
export class EtcTransactionModule {}
