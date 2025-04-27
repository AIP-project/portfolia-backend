import { Test, TestingModule } from "@nestjs/testing"
import { CoinPriceHistoryService } from "./coin-price-history.service"

describe("StockPriceHistoryService", () => {
  let service: CoinPriceHistoryService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CoinPriceHistoryService],
    }).compile()

    service = module.get<CoinPriceHistoryService>(CoinPriceHistoryService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })
})
