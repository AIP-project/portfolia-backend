import { Test, TestingModule } from "@nestjs/testing"
import { StockSummaryService } from "./stock-summary.service"

describe("CoinSummaryService", () => {
  let service: StockSummaryService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StockSummaryService],
    }).compile()

    service = module.get<StockSummaryService>(StockSummaryService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })
})
