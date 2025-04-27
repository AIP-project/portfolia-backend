import { Test, TestingModule } from "@nestjs/testing"
import { CoinSummaryService } from "./coin-summary.service"

describe("CoinSummaryService", () => {
  let service: CoinSummaryService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CoinSummaryService],
    }).compile()

    service = module.get<CoinSummaryService>(CoinSummaryService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })
})
