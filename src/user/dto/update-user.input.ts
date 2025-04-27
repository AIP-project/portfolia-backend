import { Field, InputType, OmitType } from "@nestjs/graphql"
import { UserInput } from "./user.input"
import { IsEnum, IsNumber, IsOptional } from "class-validator"
import { UserRole } from "../../common"

@InputType({ description: "사용자 정보 업데이트 입력 타입" })
export class UpdateUserInput extends OmitType(UserInput, ["email"]) {
  @Field({ nullable: true, description: "사용자 ID / 관리자만 사용 하는 필드" })
  @IsOptional()
  @IsNumber()
  id?: number

  @Field(() => UserRole, { nullable: true, description: "사용자 역할 / 관리자만 사용 하는 필드" })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole
}
