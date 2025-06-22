import { registerEnumType } from "@nestjs/graphql"

export enum LocationType {
  KR = "KR",
  US = "US",
  SG = "SG",
  ETC = "ETC",
}

registerEnumType(LocationType, {
  name: "LocationType", // GraphQL 스키마에서 사용될 이름
})
