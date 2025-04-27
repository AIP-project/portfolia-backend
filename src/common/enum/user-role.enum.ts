import { registerEnumType } from "@nestjs/graphql"

export enum UserRole {
  USER = "USER",
  MANAGER = "MANAGER",
  ADMIN = "ADMIN",
}

registerEnumType(UserRole, {
  name: "UserRole", // GraphQL 스키마에서 사용될 이름
})
