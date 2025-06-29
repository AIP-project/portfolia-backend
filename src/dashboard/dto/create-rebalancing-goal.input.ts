import { Field, InputType, OmitType } from "@nestjs/graphql"
import { IsNotEmpty } from "class-validator"
import { RebalancingGoalInput } from "./rebalancing-goal.input"

@InputType({ description: "리밸런싱 목표 생성 입력 타입" })
export class CreateRebalancingGoalInput extends OmitType(RebalancingGoalInput, ["id"]) {
  @Field({ description: "목표 타입" })
  @IsNotEmpty({ message: "목표 타입은 필수입니다" })
  goalType!: string
}
