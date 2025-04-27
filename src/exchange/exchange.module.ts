import { Module } from "@nestjs/common"
import { HttpModule } from "@nestjs/axios"
import { ExchangeService } from "./exchange.service"
import { TypeOrmModule } from "@nestjs/typeorm"
import { ExchangeRate } from "./entities/exchange-rate.entity"
import { ExchangeResolver } from "./exchange.resolver"
import { ExchangeTask } from "./exchange.task"
import { DistributeLockModule } from "../common/service/distributeLock"
import { ExchangeDataloader } from "./exchange.dataloader"

@Module({
  imports: [TypeOrmModule.forFeature([ExchangeRate]), HttpModule, DistributeLockModule],
  providers: [ExchangeResolver, ExchangeService, ExchangeTask, ExchangeDataloader],
  exports: [ExchangeDataloader],
})
export class ExchangeModule {}
