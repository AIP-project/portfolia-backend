import { registerEnumType } from "@nestjs/graphql"
import { AccountType } from "@prisma/client"

registerEnumType(AccountType, {
  name: "AccountType", // GraphQL 스키마에서 사용될 이름
})
