import { Field, InputType } from "@nestjs/graphql"
import { IsNumber, IsOptional, IsString, Max, Min } from "class-validator"

@InputType({ description: "리밸런싱 목표 입력 타입" })
export class RebalancingGoalInput {
  @Field({ nullable: true, description: "리밸런싱 목표 ID" })
  @IsOptional()
  @IsNumber()
  id?: number

  @Field({ nullable: true, description: "사용자 ID" })
  @IsOptional()
  @IsNumber()
  userId?: number

  @Field({ nullable: true, description: "목표 타입" })
  @IsOptional()
  @IsString()
  goalType?: string

  @Field({ nullable: true, description: "참조 ID" })
  @IsOptional()
  @IsString()
  referenceId?: string

  @Field({ nullable: true, description: "목표 비율 (0-100%)" })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: "목표 비율은 0% 이상이어야 합니다" })
  @Max(100, { message: "목표 비율은 100% 이하여야 합니다" })
  targetRatio?: number
}
