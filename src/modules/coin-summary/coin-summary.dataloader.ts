import { Injectable, Scope } from "@nestjs/common"
import * as DataLoader from "dataloader"
import { CoinSummary } from "./models"
import { SummaryType } from "@prisma/client"
import { CoinSummaryService } from "./coin-summary.service"

@Injectable({ scope: Scope.REQUEST })
export class CoinSummaryDataLoader {
  constructor(private readonly coinSummaryService: CoinSummaryService) {}

  public readonly coinSummariesByAccountIdsAndSummaryType = new DataLoader<number, CoinSummary[] | []>(
    async (ids: number[]) => {
      const idsSet = new Set(ids)
      const findResults = await this.coinSummaryService.findBy({
        accountId: { in: Array.from(idsSet) },
        type: SummaryType.SUMMARY,
        isDelete: false,
      })

      const transformedResults = findResults.map((result) => ({
        ...result,
        quantity: result.quantity.toNumber(),
        amount: result.amount.toNumber(),
      }))

      const groupedResults = new Map<number, CoinSummary[]>()

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

  public readonly coinSummaryByAccountIdsAndCashType = new DataLoader<number, CoinSummary | null>(
    async (ids: number[]) => {
      const idsSet = new Set(ids)
      const findResults = await this.coinSummaryService.findBy({
        accountId: { in: Array.from(idsSet) },
        type: SummaryType.CASH,
        isDelete: false,
      })

      const transformedResults = findResults.map((result) => ({
        ...result,
        quantity: result.quantity.toNumber(),
        amount: result.amount.toNumber(),
      }))

      const groupedResults = new Map<number, CoinSummary>()

      transformedResults.forEach((result) => {
        groupedResults.set(result.accountId, result)
      })

      return ids.map((id) => groupedResults.get(id) ?? null)
    },
  )
}
