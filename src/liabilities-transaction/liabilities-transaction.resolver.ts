import { Args, Mutation, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql"
import { JwtPayload, parseISOString, UserDecoded } from "../common"
import {
  CreateLiabilitiesTransactionInput,
  LiabilitiesTransactions,
  LiabilitiesTransactionsArgs,
  UpdateLiabilitiesTransactionInput,
} from "./dto"
import { LiabilitiesTransactionService } from "./liabilities-transaction.service"
import { LiabilitiesTransaction } from "./entities"

@Resolver(() => LiabilitiesTransaction)
export class LiabilitiesTransactionResolver {
  constructor(private readonly LiabilitiesTransactionService: LiabilitiesTransactionService) {}

  @Mutation(() => LiabilitiesTransaction)
  createLiabilitiesTransaction(
    @UserDecoded() jwtPayload: JwtPayload,
    @Args("input") createLiabilitiesTransactionInput: CreateLiabilitiesTransactionInput,
  ) {
    return this.LiabilitiesTransactionService.createLiabilitiesTransaction(
      jwtPayload,
      createLiabilitiesTransactionInput,
    )
  }

  @Query(() => LiabilitiesTransactions)
  liabilitiesTransactions(
    @UserDecoded() jwtPayload: JwtPayload,
    @Args() liabilitiesTransactionsArgs: LiabilitiesTransactionsArgs,
  ) {
    return this.LiabilitiesTransactionService.liabilitiesTransactions(jwtPayload, liabilitiesTransactionsArgs)
  }

  @Query(() => LiabilitiesTransaction)
  liabilitiesTransaction(@UserDecoded() jwtPayload: JwtPayload, @Args("id") id: number) {
    return this.LiabilitiesTransactionService.liabilitiesTransaction(jwtPayload, id)
  }

  @Mutation(() => LiabilitiesTransaction)
  updateLiabilitiesTransaction(
    @UserDecoded() jwtPayload: JwtPayload,
    @Args("input") updateLiabilitiesTransactionInput: UpdateLiabilitiesTransactionInput,
  ) {
    return this.LiabilitiesTransactionService.updateLiabilitiesTransaction(
      jwtPayload,
      updateLiabilitiesTransactionInput,
    )
  }

  @ResolveField("transactionDate", () => Date, { nullable: true, description: "거래 일자" })
  async resolveTransactionDate(@Parent() liabilitiesTransaction: LiabilitiesTransaction) {
    return parseISOString(liabilitiesTransaction.transactionDate)
  }
}
