import { Args, Mutation, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql"
import { JwtPayload, parseISOString, UserDecoded } from "../../common"
import {
  CreateStockTransactionInput,
  UpdateStockTransactionInput,
  StockTransactionsArgs,
} from "./inputs"
import {
  StockTransaction,
  StockTransactions,
} from "./models"
import { StockTransactionService } from "./stock-transaction.service"

@Resolver(() => StockTransaction)
export class StockTransactionResolver {
  constructor(private readonly StockTransactionService: StockTransactionService) {}

  @Mutation(() => StockTransaction)
  createStockTransaction(
    @UserDecoded() jwtPayload: JwtPayload,
    @Args("input") createStockTransactionInput: CreateStockTransactionInput,
  ) {
    return this.StockTransactionService.createStockTransaction(jwtPayload, createStockTransactionInput)
  }

  @Query(() => StockTransactions)
  stockTransactions(@UserDecoded() jwtPayload: JwtPayload, @Args() stockTransactionsArgs: StockTransactionsArgs) {
    return this.StockTransactionService.stockTransactions(jwtPayload, stockTransactionsArgs)
  }

  @Query(() => StockTransaction)
  stockTransaction(@UserDecoded() jwtPayload: JwtPayload, @Args("id") id: number) {
    return this.StockTransactionService.stockTransaction(jwtPayload, id)
  }

  @Mutation(() => StockTransaction)
  updateStockTransaction(
    @UserDecoded() jwtPayload: JwtPayload,
    @Args("input") updateStockTransactionInput: UpdateStockTransactionInput,
  ) {
    return this.StockTransactionService.updateStockTransaction(jwtPayload, updateStockTransactionInput)
  }

  @ResolveField("transactionDate", () => Date, { nullable: true, description: "거래 일자" })
  async resolveTransactionDate(@Parent() stockTransaction: StockTransaction) {
    return parseISOString(stockTransaction.transactionDate)
  }
}
