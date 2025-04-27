import { Args, Mutation, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql"
import { JwtPayload, parseISOString, UserDecoded } from "../common"
import { CreateEtcTransactionInput, EtcTransactions, EtcTransactionsArgs, UpdateEtcTransactionInput } from "./dto"
import { EtcTransactionService } from "./etc-transaction.service"
import { EtcTransaction } from "./entities"

@Resolver(() => EtcTransaction)
export class EtcTransactionResolver {
  constructor(private readonly etcTransactionService: EtcTransactionService) {}

  @Mutation(() => EtcTransaction)
  async createEtcTransaction(
    @UserDecoded() jwtPayload: JwtPayload,
    @Args("input") createEtcTransactionInput: CreateEtcTransactionInput,
  ) {
    return this.etcTransactionService.createEtcTransaction(jwtPayload, createEtcTransactionInput)
  }

  @Query(() => EtcTransactions)
  async etcTransactions(@UserDecoded() jwtPayload: JwtPayload, @Args() etcTransactionsArgs: EtcTransactionsArgs) {
    return this.etcTransactionService.etcTransactions(jwtPayload, etcTransactionsArgs)
  }

  @Query(() => EtcTransaction)
  async etcTransaction(@UserDecoded() jwtPayload: JwtPayload, @Args("id") id: number) {
    return this.etcTransactionService.etcTransaction(jwtPayload, id)
  }

  @Mutation(() => EtcTransaction)
  async updateEtcTransaction(
    @UserDecoded() jwtPayload: JwtPayload,
    @Args("input") updateEtcTransactionInput: UpdateEtcTransactionInput,
  ) {
    return this.etcTransactionService.updateEtcTransaction(jwtPayload, updateEtcTransactionInput)
  }

  @ResolveField("transactionDate", () => Date, { nullable: true, description: "거래 일자" })
  async resolveTransactionDate(@Parent() etcTransaction: EtcTransaction) {
    return parseISOString(etcTransaction.transactionDate)
  }
}
