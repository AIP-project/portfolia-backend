import { registerEnumType } from "@nestjs/graphql"
import { UserRole } from "@prisma/client"

registerEnumType(UserRole, {
  name: "UserRole", // GraphQL 스키마에서 사용될 이름
})
