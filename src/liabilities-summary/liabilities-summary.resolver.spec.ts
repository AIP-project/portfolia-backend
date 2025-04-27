import { Test, TestingModule } from "@nestjs/testing"
import { LiabilitiesSummaryResolver } from "./liabilities-summary.resolver"
import { LiabilitiesSummaryService } from "./liabilities-summary.service"

describe("EtcSummaryResolver", () => {
  let resolver: LiabilitiesSummaryResolver

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LiabilitiesSummaryResolver, LiabilitiesSummaryService],
    }).compile()

    resolver = module.get<LiabilitiesSummaryResolver>(LiabilitiesSummaryResolver)
  })

  it("should be defined", () => {
    expect(resolver).toBeDefined()
  })
})
