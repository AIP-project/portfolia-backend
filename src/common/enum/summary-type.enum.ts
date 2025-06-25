import { registerEnumType } from "@nestjs/graphql"
import { SummaryType } from "@prisma/client"

registerEnumType(SummaryType, {
  name: "SummaryType", // GraphQL 스키마에서 사용될 이름
})
