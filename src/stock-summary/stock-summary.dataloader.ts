import { Injectable, Scope } from "@nestjs/common"
import * as DataLoader from "dataloader"
import { StockSummary } from "./dto"
import { StockSummaryService } from "./stock-summary.service"
import { SummaryType } from "../common"

@Injectable({ scope: Scope.REQUEST })
export class StockSummaryDataLoader {
  constructor(private readonly stockSummaryService: StockSummaryService) {}

  public readonly stockSummariesByAccountIdsAndSummaryType = new DataLoader<number, StockSummary[] | []>(
    async (ids: number[]) => {
      const idsSet = new Set(ids)
      const findResults = await this.stockSummaryService.findBy({
        accountId: { in: Array.from(idsSet) },
        type: SummaryType.SUMMARY,
        isDelete: false,
      })

      const transformedResults = findResults.map((result) => ({
        ...result,
        quantity: result.quantity.toNumber(),
        amount: result.amount.toNumber(),
      }))

      const groupedResults = new Map<number, StockSummary[]>()

      transformedResults.forEach((result) => {
        const accountId = result.accountId
        const existing = groupedResults.get(accountId)

        if (existing) {
          existing.push(result)
        } else {
          groupedResults.set(accountId, [result])
        }
      })

      return ids.map((id) => groupedResults.get(id) ?? [])
    },
  )

  public readonly stockSummaryByAccountIdsAndCashType = new DataLoader<number, StockSummary | null>(
    async (ids: number[]) => {
      const idsSet = new Set(ids)
      const findResults = await this.stockSummaryService.findBy({
        accountId: { in: Array.from(idsSet) },
        type: SummaryType.CASH,
        isDelete: false,
      })

      const transformedResults = findResults.map((result) => ({
        ...result,
        quantity: result.quantity.toNumber(),
        amount: result.amount.toNumber(),
      }))
      // --- 수정 끝 ---

      const groupedResults = new Map<number, StockSummary>()

      // 타입 변환이 끝난 결과를 사용합니다.
      transformedResults.forEach((result) => {
        groupedResults.set(result.accountId, result)
      })

      return ids.map((id) => groupedResults.get(id) ?? null)
    },
  )
}
