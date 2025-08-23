import { Account, BankSummary, CoinSummary, StockSummary } from "@prisma/client"
import { CreateTransferInput } from "../inputs"

export interface CleanedTransferInput extends CreateTransferInput {
  fromAccount: Account
  toAccount: Account
  fromSummary: BankSummary | CoinSummary | StockSummary
  toSummary: BankSummary | CoinSummary | StockSummary
}
