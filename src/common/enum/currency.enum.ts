import { registerEnumType } from "@nestjs/graphql"

export enum CurrencyType {
  KRW = "KRW",
  USD = "USD",
  EUR = "EUR",
  JPY = "JPY",
  CNY = "CNY",
  GBP = "GBP",
  AUD = "AUD",
  CAD = "CAD",
  CHF = "CHF",
  HKD = "HKD",
  SGD = "SGD",
  SEK = "SEK",
  NOK = "NOK",
  MXN = "MXN",
  NZD = "NZD",
  TRY = "TRY",
  BRL = "BRL",
  TWD = "TWD",
  DKK = "DKK",
  PLN = "PLN",
  THB = "THB",
  ILS = "ILS",
  PHP = "PHP",
  CZK = "CZK",
  AED = "AED",
  COP = "COP",
  SAR = "SAR",
  CLP = "CLP",
  MYR = "MYR",
  RON = "RON",
}

registerEnumType(CurrencyType, {
  name: "CurrencyType", // GraphQL 스키마에서 사용될 이름
})
