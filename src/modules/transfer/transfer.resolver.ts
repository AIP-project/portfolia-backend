import { Args, Mutation, Query, Resolver } from "@nestjs/graphql"
import { JwtPayload, UserDecoded } from "../../common"
import { TransferService } from "./transfer.service"
import { AccountsByCurrencyInput, CreateTransferInput } from "./inputs"
import { AccountWithBalance, TransferResult } from "./models"

@Resolver()
export class TransferResolver {
  constructor(private readonly transferService: TransferService) {}

  @Query(() => [AccountWithBalance], {
    description: "통화별 계좌 목록 조회 (이체 가능한 계좌)",
  })
  async accountsByCurrency(
    @UserDecoded() jwtPayload: JwtPayload,
    @Args("input") input: AccountsByCurrencyInput,
  ): Promise<AccountWithBalance[]> {
    return this.transferService.getAccountsByCurrency(jwtPayload, input)
  }

  @Mutation(() => TransferResult, {
    description: "계좌 간 잔액 이체",
  })
  async transferBalance(
    @UserDecoded() jwtPayload: JwtPayload,
    @Args("input") input: CreateTransferInput,
  ): Promise<TransferResult> {
    return this.transferService.transferBalance(jwtPayload, input)
  }
}
