import { Test, TestingModule } from "@nestjs/testing"
import { BankSummaryService } from "./bank-summary.service"

describe("BankSummaryService", () => {
  let service: BankSummaryService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BankSummaryService],
    }).compile()

    service = module.get<BankSummaryService>(BankSummaryService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })
})
