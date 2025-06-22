import { Args, Mutation, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql"
import { JwtPayload, parseISOString, UserDecoded } from "../common"
import {
  CoinTransaction,
  CoinTransactions,
  CoinTransactionsArgs,
  CreateCoinTransactionInput,
  UpdateCoinTransactionInput,
} from "./dto"
import { CoinTransactionService } from "./coin-transaction.service"

@Resolver(() => CoinTransaction)
export class CoinTransactionResolver {
  constructor(private readonly coinTransactionService: CoinTransactionService) {}

  @Mutation(() => CoinTransaction)
  async createCoinTransaction(
    @UserDecoded() jwtPayload: JwtPayload,
    @Args("input") createCoinTransactionInput: CreateCoinTransactionInput,
  ) {
    return this.coinTransactionService.createCoinTransaction(jwtPayload, createCoinTransactionInput)
  }

  @Query(() => CoinTransactions)
  async coinTransactions(@UserDecoded() jwtPayload: JwtPayload, @Args() coinTransactionsArgs: CoinTransactionsArgs) {
    return this.coinTransactionService.coinTransactions(jwtPayload, coinTransactionsArgs)
  }

  @Query(() => CoinTransaction)
  async coinTransaction(@UserDecoded() jwtPayload: JwtPayload, @Args("id") id: number) {
    return this.coinTransactionService.coinTransaction(jwtPayload, id)
  }

  @Mutation(() => CoinTransaction)
  async updateCoinTransaction(
    @UserDecoded() jwtPayload: JwtPayload,
    @Args("input") updateCoinTransactionInput: UpdateCoinTransactionInput,
  ) {
    return this.coinTransactionService.updateCoinTransaction(jwtPayload, updateCoinTransactionInput)
  }

  @ResolveField("transactionDate", () => Date, { nullable: true, description: "거래 일자" })
  async resolveTransactionDate(@Parent() coinTransaction: CoinTransaction) {
    return parseISOString(coinTransaction.transactionDate)
  }
}
