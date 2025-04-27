import { registerEnumType } from "@nestjs/graphql"

export enum LocationType {
  KR = "korea",
  US = "usa",
  SG = "singapore",
  ETC = "etc",
}

registerEnumType(LocationType, {
  name: "LocationType", // GraphQL 스키마에서 사용될 이름
})
