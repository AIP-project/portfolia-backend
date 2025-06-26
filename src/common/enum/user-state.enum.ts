import { registerEnumType } from "@nestjs/graphql"
import { UserState } from "@prisma/client"

registerEnumType(UserState, {
  name: "UserState", // GraphQL 스키마에서 사용될 이름
})
