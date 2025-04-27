import { registerEnumType } from "@nestjs/graphql"

export enum AccountType {
  BANK = "bank",
  STOCK = "stock",
  COIN = "coin",
  ETC = "etc",
  LIABILITIES = "liabilities",
}

registerEnumType(AccountType, {
  name: "AccountType", // GraphQL 스키마에서 사용될 이름
})
