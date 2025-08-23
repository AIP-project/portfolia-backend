import { Module } from "@nestjs/common"
import { TransferService } from "./transfer.service"
import { TransferResolver } from "./transfer.resolver"
import { PrismaModule } from "../../common/prisma"

@Module({
  imports: [PrismaModule],
  providers: [TransferService, TransferResolver],
  exports: [TransferService],
})
export class TransferModule {}
