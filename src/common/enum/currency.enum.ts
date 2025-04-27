import { registerEnumType } from "@nestjs/graphql"

export enum CurrencyType {
  USD = "USD",
  EUR = "EUR",
  JPY = "JPY",
  KRW = "KRW",
  CNY = "CNY",
  GBP = "GBP",
  HKD = "HKD",
  SGD = "SGD",
  AUD = "AUD",
  CAD = "CAD",
  CHF = "CHF",
  TWD = "TWD",
}

registerEnumType(CurrencyType, {
  name: "CurrencyType", // GraphQL 스키마에서 사용될 이름
})
