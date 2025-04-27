import { Test, TestingModule } from "@nestjs/testing"
import { LiabilitiesTransactionService } from "./liabilities-transaction.service"

describe("EtcService", () => {
  let service: LiabilitiesTransactionService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LiabilitiesTransactionService],
    }).compile()

    service = module.get<LiabilitiesTransactionService>(LiabilitiesTransactionService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })
})
