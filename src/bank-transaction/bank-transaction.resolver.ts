import { Args, Mutation, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql"
import { JwtPayload, parseISOString, UserDecoded } from "../common"
import { BankTransactionService } from "./bank-transaction.service"
import { BankTransactions, BankTransactionsArgs, CreateBankTransactionInput, UpdateBankTransactionInput } from "./dto"
import { BankTransaction } from "./entities"

@Resolver(() => BankTransaction)
export class BankTransactionResolver {
  constructor(private readonly bankTransactionService: BankTransactionService) {}

  @Mutation(() => BankTransaction)
  async createBankTransaction(
    @UserDecoded() jwtPayload: JwtPayload,
    @Args("input") createBankTransactionInput: CreateBankTransactionInput,
  ) {
    return this.bankTransactionService.createBankTransaction(jwtPayload, createBankTransactionInput)
  }

  @Query(() => BankTransactions)
  async bankTransactions(@UserDecoded() jwtPayload: JwtPayload, @Args() bankTransactionsArgs: BankTransactionsArgs) {
    return this.bankTransactionService.bankTransactions(jwtPayload, bankTransactionsArgs)
  }

  @Query(() => BankTransaction)
  async bankTransaction(@UserDecoded() jwtPayload: JwtPayload, @Args("id") id: number) {
    return this.bankTransactionService.bankTransaction(jwtPayload, id)
  }

  @Mutation(() => BankTransaction)
  async updateBankTransaction(
    @UserDecoded() jwtPayload: JwtPayload,
    @Args("input") updateBankTransactionInput: UpdateBankTransactionInput,
  ) {
    return this.bankTransactionService.updateBankTransaction(jwtPayload, updateBankTransactionInput)
  }

  @ResolveField("transactionDate", () => Date, { nullable: true, description: "거래 일자" })
  async resolveTransactionDate(@Parent() bankTransaction: BankTransaction) {
    return parseISOString(bankTransaction.transactionDate)
  }
}
