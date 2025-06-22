import { registerEnumType } from "@nestjs/graphql"

export enum AccountType {
  BANK = "BANK",
  STOCK = "STOCK",
  COIN = "COIN",
  ETC = "ETC",
  LIABILITIES = "LIABILITIES",
}

registerEnumType(AccountType, {
  name: "AccountType", // GraphQL 스키마에서 사용될 이름
})
