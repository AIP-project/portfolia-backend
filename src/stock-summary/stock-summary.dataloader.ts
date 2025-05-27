import { Injectable, Scope } from "@nestjs/common"
import * as DataLoader from "dataloader"
import { StockSummary } from "./entities"
import { StockSummaryService } from "./stock-summary.service"
import { In } from "typeorm"
import { SummaryType } from "../common"

@Injectable({ scope: Scope.REQUEST })
export class StockSummaryDataLoader {
  constructor(private readonly stockSummaryService: StockSummaryService) {}

  public readonly stockSummariesByAccountIdsAndSummaryType = new DataLoader<number, StockSummary[] | []>(
    async (ids: number[]) => {
      const idsSet = new Set(ids)
      const findResults = await this.stockSummaryService.findBy({
        accountId: In(Array.from(idsSet)),
        type: SummaryType.SUMMARY,
        isDelete: false,
      })

      const groupedResults = new Map<number, StockSummary[]>()

      findResults.forEach((result) => {
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
        accountId: In(Array.from(idsSet)),
        type: SummaryType.CASH,
        isDelete: false,
      })

      const groupedResults = new Map<number, StockSummary>()

      findResults.forEach((result) => {
        groupedResults.set(result.accountId, result)
      })

      return ids.map((id) => groupedResults.get(id) ?? null)
    },
  )
}
