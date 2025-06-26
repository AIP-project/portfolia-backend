import { Module } from "@nestjs/common"
import { HttpModule } from "@nestjs/axios"
import { ExchangeService } from "./exchange.service"
import { ExchangeResolver } from "./exchange.resolver"
import { ExchangeTask } from "./exchange.task"
import { DistributeLockModule } from "../common/service/distributeLock"
import { ExchangeDataLoader } from "./exchange.dataloader"

@Module({
  imports: [HttpModule, DistributeLockModule],
  providers: [ExchangeResolver, ExchangeService, ExchangeTask, ExchangeDataLoader],
  exports: [ExchangeDataLoader],
})
export class ExchangeModule {}
