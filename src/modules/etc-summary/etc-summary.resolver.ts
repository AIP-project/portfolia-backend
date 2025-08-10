import { Args, Mutation, Resolver } from "@nestjs/graphql"
import { EtcSummaryService } from "./etc-summary.service"
import { JwtPayload, UserDecoded } from "../../common"
import { UpdateEtcSummaryInput } from "./inputs"
import { EtcSummary } from "./models"

@Resolver(() => EtcSummary)
export class EtcSummaryResolver {
  constructor(private readonly etcSummaryService: EtcSummaryService) {}

  @Mutation(() => EtcSummary)
  updateEtcSummary(@UserDecoded() jwtPayload: JwtPayload, @Args("input") updateEtcSummaryInput: UpdateEtcSummaryInput) {
    return this.etcSummaryService.updateEtcSummary(jwtPayload, updateEtcSummaryInput)
  }
}
