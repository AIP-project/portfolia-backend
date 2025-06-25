import { Injectable, Scope } from "@nestjs/common"
import * as DataLoader from "dataloader"
import { LiabilitiesSummary } from "./dto"
import { LiabilitiesSummaryService } from "./liabilities-summary.service"

@Injectable({ scope: Scope.REQUEST })
export class LiabilitiesSummaryDataLoader {
  constructor(private readonly liabilitiesSummaryService: LiabilitiesSummaryService) {}

  public readonly liabilitiesSummaryByAccountIdsAndCashType = new DataLoader<number, LiabilitiesSummary | null>(
    async (ids: number[]) => {
      const idsSet = new Set(ids)
      const findResults = await this.liabilitiesSummaryService.findBy({
        accountId: { in: Array.from(idsSet) },
        isDelete: false,
      })

      const transformedResults = findResults.map((result) => ({
        ...result,
        totalDepositAmount: result.totalDepositAmount.toNumber(),
        totalWithdrawalAmount: result.totalWithdrawalAmount.toNumber(),
        balance: result.balance.toNumber(),
        amount: result.amount.toNumber(),
        remainingAmount: result.remainingAmount?.toNumber(),
      }))

      const groupedResults = new Map<number, LiabilitiesSummary>()

      transformedResults.forEach((result) => {
        groupedResults.set(result.accountId, result)
      })

      return ids.map((id) => groupedResults.get(id) ?? null)
    },
  )
}
