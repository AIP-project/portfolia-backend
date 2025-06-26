import { registerEnumType } from "@nestjs/graphql"
import { TransactionType } from "@prisma/client"

registerEnumType(TransactionType, {
  name: "TransactionType", // GraphQL 스키마에서 사용될 이름
})
