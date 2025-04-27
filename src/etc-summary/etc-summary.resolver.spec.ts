import { Test, TestingModule } from "@nestjs/testing"
import { EtcSummaryResolver } from "./etc-summary.resolver"
import { EtcSummaryService } from "./etc-summary.service"

describe("EtcSummaryResolver", () => {
  let resolver: EtcSummaryResolver

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EtcSummaryResolver, EtcSummaryService],
    }).compile()

    resolver = module.get<EtcSummaryResolver>(EtcSummaryResolver)
  })

  it("should be defined", () => {
    expect(resolver).toBeDefined()
  })
})
