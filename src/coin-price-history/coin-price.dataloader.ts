import { Injectable, Scope } from "@nestjs/common"
import * as DataLoader from "dataloader"
import { CoinPriceHistory } from "./dto"
import { CoinPriceHistoryService } from "./coin-price-history.service"

@Injectable({ scope: Scope.REQUEST })
export class CoinPriceDataLoader {
  constructor(private readonly coinPriceHistoryService: CoinPriceHistoryService) {}

  public readonly coinPriceBySymbols = new DataLoader<string, CoinPriceHistory | null>(async (symbols: string[]) => {
    const symbolsSet = new Set(symbols)
    const coinPriceHistories = await this.coinPriceHistoryService.findBySymbols(Array.from(symbolsSet))
    const symbolToHistory = new Map()
    coinPriceHistories.forEach((history) => {
      symbolToHistory.set(history.symbol, history)
    })

    return symbols.map((symbol) => symbolToHistory.get(symbol) || null)
  })
}
