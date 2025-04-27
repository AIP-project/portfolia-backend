import { Field, Float, ObjectType } from "@nestjs/graphql"
import { DashboardDetail } from "./dashboard-detail.model"

@ObjectType({ description: "대시보드 정보" })
export class Dashboard {
  @Field(() => [DashboardDetail], { description: "자산" })
  asset!: Array<DashboardDetail>

  @Field(() => [DashboardDetail], { description: "부채" })
  liabilities!: Array<DashboardDetail>

  @Field(() => [DashboardDetail], { description: "현금" })
  cash!: Array<DashboardDetail>

  @Field(() => Float, { description: "자산 총 합" })
  assetTotalAmount!: number

  @Field(() => Float, { description: "부채 총 합" })
  liabilitiesTotalAmount!: number

  @Field(() => Float, { description: "현금 총 합" })
  cashTotalAmount!: number
}
