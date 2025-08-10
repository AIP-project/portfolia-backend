import { Field, InputType } from "@nestjs/graphql"
import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from "class-validator"

@InputType({ description: "리밸런싱 목표 수정 입력 타입" })
export class UpdateRebalancingGoalInput {
  @Field({ description: "리밸런싱 목표 ID" })
  @IsNotEmpty({ message: "리밸런싱 목표 ID는 필수입니다" })
  @IsNumber()
  id!: number

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
  @IsNumber({ maxDecimalPlaces: 2 }, { message: "소수점 둘째 자리까지 입력 가능합니다" })
  @Min(0, { message: "목표 비율은 0% 이상이어야 합니다" })
  @Max(100, { message: "목표 비율은 100% 이하여야 합니다" })
  targetRatio?: number

  @Field({ nullable: true, description: "삭제 여부" })
  @IsOptional()
  isDelete?: boolean
}
