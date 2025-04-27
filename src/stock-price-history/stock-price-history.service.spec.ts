import { Test, TestingModule } from "@nestjs/testing"
import { StockPriceHistoryService } from "./stock-price-history.service"

describe("StockPriceHistoryService", () => {
  let service: StockPriceHistoryService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StockPriceHistoryService],
    }).compile()

    service = module.get<StockPriceHistoryService>(StockPriceHistoryService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })
})
