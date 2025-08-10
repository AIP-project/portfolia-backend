import { Args, Mutation, Resolver } from "@nestjs/graphql"
import { LiabilitiesSummaryService } from "./liabilities-summary.service"
import { JwtPayload, UserDecoded } from "../../common"
import { LiabilitiesSummary } from "./models"
import { UpdateLiabilitiesSummaryInput } from "./inputs"

@Resolver(() => LiabilitiesSummary)
export class LiabilitiesSummaryResolver {
  constructor(private readonly liabilitiesSummaryService: LiabilitiesSummaryService) {}

  @Mutation(() => LiabilitiesSummary)
  updateLiabilitiesSummary(
    @UserDecoded() jwtPayload: JwtPayload,
    @Args("input") updateEtcSummaryInput: UpdateLiabilitiesSummaryInput,
  ) {
    return this.liabilitiesSummaryService.updateLiabilitiesSummary(jwtPayload, updateEtcSummaryInput)
  }
}
