import { AccountType } from "@prisma/client"
import { CreateAccountInput, UpdateAccountInput } from "../inputs"
import { BankSummary } from "../../bank-summary/models/bank-summary.model"
import { StockSummary } from "../../stock-summary/models/stock-summary.model"
import { CoinSummary } from "../../coin-summary/models/coin-summary.model"

export interface CleanedCreateAccountInput extends CreateAccountInput {
  userId: number
  nickName: string
}

export interface CleanedUpdateAccountInput extends UpdateAccountInput {
  userId: number
}

export interface AccountWithSummary {
  existSummary?: BankSummary | StockSummary | CoinSummary
}