import { CurrencyType } from "@prisma/client"
import { ExchangeDataLoader } from "../../exchange/exchange.dataloader"
/**
 * Static utility 함수들
 */
export class CurrencyUtils {
  /**
   * ExchangeDataLoader를 사용하여 환율 변환을 수행합니다.
   * @param exchangeDataLoader 환율 데이터 로더
   * @param targetCurrency 대상 통화
   * @param sourceCurrency 원본 통화
   * @param amount 변환할 금액
   * @returns 변환된 금액
   */
  static async convertCurrency(
    exchangeDataLoader: ExchangeDataLoader,
    targetCurrency: CurrencyType,
    sourceCurrency: CurrencyType | null | undefined,
    amount: number,
  ): Promise<number> {
    if (!sourceCurrency) {
      return 0
    }
    
    if (targetCurrency === sourceCurrency) {
      return amount
    }

    const exchangeRate = await exchangeDataLoader.batchLoadExchange.load(sourceCurrency)
    if (!exchangeRate) {
      return 0
    }

    const targetCurrencyRate = exchangeRate.exchangeRates[targetCurrency]
    const sourceCurrencyRate = exchangeRate.exchangeRates[sourceCurrency]

    if (!targetCurrencyRate || !sourceCurrencyRate || sourceCurrencyRate === 0) {
      return 0
    }

    const crossRate = targetCurrencyRate / sourceCurrencyRate

    return amount * crossRate
  }
}