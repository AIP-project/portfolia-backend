import { Injectable, Scope } from "@nestjs/common"
import * as DataLoader from "dataloader"
import { BankSummary } from "./models"
import { BankSummaryService } from "./bank-summary.service"

@Injectable({ scope: Scope.REQUEST })
export class BankSummaryDataLoader {
  constructor(private readonly bankSummaryService: BankSummaryService) {}

  public readonly bankSummaryByAccountIdsAndCashType = new DataLoader<number, BankSummary | null>(
    async (ids: number[]) => {
      const idsSet = new Set(ids)
      const findResults = await this.bankSummaryService.findBy({
        accountId: { in: Array.from(idsSet) },
        isDelete: false,
      })

      const transformedResults = findResults.map((result) => ({
        ...result,
        totalDepositAmount: result.totalDepositAmount.toNumber(),
        totalWithdrawalAmount: result.totalWithdrawalAmount.toNumber(),
        balance: result.balance.toNumber(),
      }))

      const groupedResults = new Map<number, BankSummary>()

      transformedResults.forEach((result) => {
        groupedResults.set(result.accountId, result)
      })

      return ids.map((id) => groupedResults.get(id) ?? null)
    },
  )
}
