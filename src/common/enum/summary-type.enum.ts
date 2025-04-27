import { registerEnumType } from "@nestjs/graphql"

export enum SummaryType {
  CASH = "CASH", // 예수금
  SUMMARY = "SUMMARY", // 보유 항목 요약
}

registerEnumType(SummaryType, {
  name: "SummaryType", // GraphQL 스키마에서 사용될 이름
})
