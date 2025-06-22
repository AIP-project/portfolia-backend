import { Args, Mutation, Resolver } from "@nestjs/graphql"
import { BankSummaryService } from "./bank-summary.service"
import { JwtPayload, UserDecoded } from "../common"
import { BankSummary, UpdateBankSummaryInput } from "./dto"

@Resolver(() => BankSummary)
export class BankSummaryResolver {
  constructor(private readonly bankSummaryService: BankSummaryService) {}

  @Mutation(() => BankSummary)
  async updateBankSummary(
    @UserDecoded() jwtPayload: JwtPayload,
    @Args("input") updateBankSummaryInput: UpdateBankSummaryInput,
  ) {
    return this.bankSummaryService.updateBankSummary(jwtPayload, updateBankSummaryInput)
  }
}
