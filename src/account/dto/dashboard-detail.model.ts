import { Field, Float, ObjectType } from "@nestjs/graphql"
import { AccountType } from "@prisma/client"

@ObjectType({ description: "대시보드 상세 정보" })
export class DashboardDetail {
  @Field(() => String, { description: "이름" })
  name!: string

  @Field(() => Float, { description: "금액" })
  amount!: number

  @Field(() => AccountType, { description: "계좌 타입" })
  type!: AccountType
}
