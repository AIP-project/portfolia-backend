import { Module } from "@nestjs/common"
import { DistributeLockService } from "./distribute-lock.service"

@Module({
  providers: [DistributeLockService],
  exports: [DistributeLockService],
})
export class DistributeLockModule {}
