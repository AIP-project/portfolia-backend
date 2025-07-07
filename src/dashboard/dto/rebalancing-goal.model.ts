import { Field, ObjectType } from "@nestjs/graphql"

@ObjectType({ description: "리밸런싱 목표 정보" })
export class RebalancingGoal {
  @Field({ description: "리밸런싱 목표 ID" })
  id?: number

  @Field({ description: "사용자 ID" })
  userId!: number

  @Field({ description: "목표 타입" })
  goalType!: string

  @Field({ description: "참조 ID" })
  referenceId!: string

  @Field({ description: "목표 비율 (0-100%)", nullable: true })
  targetRatio?: number

  @Field(() => Date, { description: "생성일", nullable: true })
  createdAt!: Date

  @Field(() => Date, { description: "수정일", nullable: true })
  updatedAt!: Date
}
