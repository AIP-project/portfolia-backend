import { registerEnumType } from "@nestjs/graphql"

export enum TransactionType {
  DEPOSIT = "DEPOSIT", // 입금
  WITHDRAWAL = "WITHDRAWAL", // 출금
}

registerEnumType(TransactionType, {
  name: "TransactionType", // GraphQL 스키마에서 사용될 이름
})
