import { Injectable, Scope } from "@nestjs/common"
import * as DataLoader from "dataloader"
import { EtcSummary } from "./dto"
import { EtcSummaryService } from "./etc-summary.service"

@Injectable({ scope: Scope.REQUEST })
export class EtcSummaryDataLoader {
  constructor(private readonly etcSummaryService: EtcSummaryService) {}

  public readonly etcSummaryByAccountIdsAndCashType = new DataLoader<number, EtcSummary | null>(
    async (ids: number[]) => {
      const idsSet = new Set(ids)
      const findResults = await this.etcSummaryService.findBy({
        accountId: { in: Array.from(idsSet) },
        isDelete: false,
      })

      const transformedResults = findResults.map((result) => ({
        ...result,
        totalDepositAmount: result.totalDepositAmount.toNumber(),
        totalWithdrawalAmount: result.totalWithdrawalAmount.toNumber(),
        balance: result.balance.toNumber(),
        purchasePrice: result.purchasePrice.toNumber(),
        currentPrice: result.currentPrice?.toNumber(),
      }))

      const groupedResults = new Map<number, EtcSummary>()

      transformedResults.forEach((result) => {
        groupedResults.set(result.accountId, result)
      })

      return ids.map((id) => groupedResults.get(id) ?? null)
    },
  )
}
