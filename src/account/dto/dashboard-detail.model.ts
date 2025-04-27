import { Field, Float, ObjectType } from "@nestjs/graphql"

@ObjectType({ description: "대시보드 상세 정보" })
export class DashboardDetail {
  @Field(() => String, { description: "이름" })
  name!: string

  @Field(() => Float, { description: "금액" })
  amount!: number
}
