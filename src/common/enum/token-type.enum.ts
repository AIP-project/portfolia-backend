import { registerEnumType } from "@nestjs/graphql"

export enum TokenType {
  ACCESS = "ACCESS",
  REFRESH = "REFRESH",
}

registerEnumType(TokenType, {
  name: "TokenType", // GraphQL 스키마에서 사용될 이름
})
