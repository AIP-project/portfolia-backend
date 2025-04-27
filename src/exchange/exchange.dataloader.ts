import { Injectable, Scope } from "@nestjs/common"
import { ExchangeService } from "./exchange.service"
import * as DataLoader from "dataloader"
import { ExchangeRate } from "./entities/exchange-rate.entity"

@Injectable({ scope: Scope.REQUEST })
export class ExchangeDataloader {
  constructor(private readonly exchangeService: ExchangeService) {}

  public readonly batchLoadExchange = new DataLoader<string, ExchangeRate | null>(
    async (currency: readonly string[]) => {
      const exchangeRate = await this.exchangeService.lastOneLoad()

      return currency.map((value) => {
        if (exchangeRate && exchangeRate.exchangeRates[value]) {
          return exchangeRate
        }
      })
    },
  )
}
