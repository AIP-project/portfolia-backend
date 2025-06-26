import { Injectable, Scope } from "@nestjs/common"
import * as DataLoader from "dataloader"
import { StockPriceHistoryService } from "./stock-price-history.service"
import { StockPriceHistory } from "./dto"

@Injectable({ scope: Scope.REQUEST })
export class StockPriceDataLoader {
  constructor(private readonly stockPriceHistoryService: StockPriceHistoryService) {}

  public readonly stockPriceBySymbols = new DataLoader<string, StockPriceHistory | null>(async (symbols: string[]) => {
    const symbolsSet = new Set(symbols)
    const stockPriceHistories = await this.stockPriceHistoryService.findBySymbols(Array.from(symbolsSet))
    const symbolToHistory = new Map()
    stockPriceHistories.forEach((history) => {
      symbolToHistory.set(history.symbol, history)
    })

    return symbols.map((symbol) => symbolToHistory.get(symbol) || null)
  })
}

