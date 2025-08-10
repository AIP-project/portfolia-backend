import { Module } from "@nestjs/common"
import { EtcTransactionService } from "./etc-transaction.service"
import { EtcTransactionResolver } from "./etc-transaction.resolver"
import { ExchangeModule } from "../exchange/exchange.module"

@Module({
  imports: [ExchangeModule],
  providers: [EtcTransactionResolver, EtcTransactionService],
})
export class EtcTransactionModule {}
