import { Field, Float, ObjectType } from "@nestjs/graphql"
import { DashboardItem } from "./dashboard-item.model"
import { DashboardDetailItem } from "./dashboard-detail-item.model"

@ObjectType({ description: "대시보드 정보" })
export class Dashboard {
  @Field(() => [DashboardItem], { description: "자산" })
  asset!: Array<DashboardItem>

  @Field(() => [DashboardItem], { description: "부채" })
  liabilities!: Array<DashboardItem>

  @Field(() => [DashboardItem], { description: "현금" })
  cash!: Array<DashboardItem>

  @Field(() => Float, { description: "자산 총 합" })
  assetTotalAmount!: number

  @Field(() => Float, { description: "부채 총 합" })
  liabilitiesTotalAmount!: number

  @Field(() => Float, { description: "현금 총 합" })
  cashTotalAmount!: number

  @Field(() => [DashboardDetailItem], { description: "대시보드 상세 정보" })
  details!: Array<DashboardDetailItem>
}
