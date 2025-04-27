import { Test, TestingModule } from "@nestjs/testing"
import { EtcTransactionService } from "./etc-transaction.service"

describe("EtcService", () => {
  let service: EtcTransactionService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EtcTransactionService],
    }).compile()

    service = module.get<EtcTransactionService>(EtcTransactionService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })
})
