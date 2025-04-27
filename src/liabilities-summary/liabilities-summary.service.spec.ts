import { Test, TestingModule } from "@nestjs/testing"
import { LiabilitiesSummaryService } from "./liabilities-summary.service"

describe("EtcSummaryService", () => {
  let service: LiabilitiesSummaryService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LiabilitiesSummaryService],
    }).compile()

    service = module.get<LiabilitiesSummaryService>(LiabilitiesSummaryService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })
})
