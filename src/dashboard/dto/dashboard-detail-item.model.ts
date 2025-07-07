import { Field, Float, Int, ObjectType } from "@nestjs/graphql"
import { AccountType, CurrencyType } from "@prisma/client"

@ObjectType({ description: "대시보드 상세 정보 아이템" })
export class DashboardDetailItem {
  @Field(() => Int, { description: "계좌 ID" })
  accountId!: number

  @Field(() => String, { description: "계좌 이름" })
  accountName!: string

  @Field(() => String, { description: "종목 이름" })
  name!: string

  @Field(() => AccountType, { description: "계좌 타입" })
  accountType!: AccountType

  @Field(() => String, { description: "에셋 타입" })
  assetType!: string

  @Field(() => CurrencyType, { description: "통화" })
  currency!: CurrencyType

  @Field(() => Float, { description: "구매 당시 금액" })
  purchaseAmount!: number

  @Field(() => Float, { description: "현재 가치 금액" })
  currentValue!: number

  @Field(() => Float, { description: "기본통화로 변환된 현재 가치 금액" })
  currentValueInDefaultCurrency!: number

  @Field(() => Float, { description: "미실현 손익" })
  unrealizedPnL!: number

  @Field(() => Float, { description: "기본통화로 변환된 미실현 손익" })
  unrealizedPnLInDefaultCurrency!: number

  @Field(() => Float, { description: "미실현 손익률 (%)" })
  unrealizedPnLPercentage!: number
}
