import { Field, Float, ObjectType } from "@nestjs/graphql"
import { AccountType } from "@prisma/client"

@ObjectType({ description: "대시보드 아이템" })
export class DashboardItem {
  @Field(() => Number, { description: "계좌 ID" })
  accountId!: number

  @Field(() => String, { description: "이름" })
  name!: string

  @Field(() => Float, { description: "금액" })
  amount!: number

  @Field(() => AccountType, { description: "계좌 타입" })
  type!: AccountType
}
