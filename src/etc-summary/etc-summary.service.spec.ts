import { Test, TestingModule } from "@nestjs/testing"
import { EtcSummaryService } from "./etc-summary.service"

describe("EtcSummaryService", () => {
  let service: EtcSummaryService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EtcSummaryService],
    }).compile()

    service = module.get<EtcSummaryService>(EtcSummaryService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })
})
