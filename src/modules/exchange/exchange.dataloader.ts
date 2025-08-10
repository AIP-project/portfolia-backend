import { Injectable, Scope } from "@nestjs/common"
import { ExchangeService } from "./exchange.service"
import * as DataLoader from "dataloader"
import { ExchangeRate } from "./models"

@Injectable({ scope: Scope.REQUEST })
export class ExchangeDataLoader {
  constructor(private readonly exchangeService: ExchangeService) {}

  public readonly batchLoadExchange = new DataLoader<string, ExchangeRate | null>(
    async (targetCurrencies: readonly string[]) => {
      const rawRate = await this.exchangeService.lastOneLoad()

      // DB에 데이터가 아예 없을 경우, 모든 키에 대해 null 배열을 반환하고 종료합니다.
      if (!rawRate) {
        return targetCurrencies.map(() => null)
      }

      // 2. (핵심) DB에서 가져온 Json 타입을 Record<string, number>로 변환합니다.
      // 실제 데이터가 JSON 문자열이므로 JSON.parse()를 사용합니다.
      const parsedExchangeRates =
        typeof rawRate.exchangeRates === "string" ? JSON.parse(rawRate.exchangeRates) : rawRate.exchangeRates

      // 변환된 데이터를 포함하는 새로운 ExchangeRate 객체를 만듭니다.
      const transformedRate: ExchangeRate = {
        ...rawRate,
        exchangeRates: parsedExchangeRates as Record<string, number>,
      }

      // 3. 요청된 각 통화(key)가 변환된 환율 객체 내에 있는지 확인하고 결과를 반환합니다.
      return targetCurrencies.map((targetCurrency) => {
        // 변환된 exchangeRates 객체에 해당 통화 키가 있는지 확인합니다.
        if (transformedRate.exchangeRates[targetCurrency]) {
          // 키가 존재하면, 타입 변환이 완료된 전체 환율 객체를 반환합니다.
          return transformedRate
        }

        // 키가 존재하지 않으면, 명시적으로 null을 반환합니다.
        return null
      })
    },
  )
}
