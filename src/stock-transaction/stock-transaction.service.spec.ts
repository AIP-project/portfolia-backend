import { Test, TestingModule } from "@nestjs/testing"
import { StockTransactionService } from "./stock-transaction.service"

describe("StockService", () => {
  let service: StockTransactionService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StockTransactionService],
    }).compile()

    service = module.get<StockTransactionService>(StockTransactionService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })
})
