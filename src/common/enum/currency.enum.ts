import { registerEnumType } from "@nestjs/graphql"
import { CurrencyType } from "@prisma/client"

registerEnumType(CurrencyType, {
  name: "CurrencyType", // GraphQL 스키마에서 사용될 이름
})
