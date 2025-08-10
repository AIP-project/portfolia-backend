import { ArgsType, Field } from "@nestjs/graphql"
import { IsOptional, IsString } from "class-validator"
import { PageSearchArgs } from "../../../common"
import { UserRole } from "@prisma/client"

@ArgsType()
export class UsersArgs extends PageSearchArgs {
  @Field(() => String, { nullable: true, description: "사용자 이름" })
  @IsOptional()
  @IsString()
  name?: string

  @Field(() => String, { nullable: true, description: "사용자 이메일" })
  @IsOptional()
  @IsString()
  email?: string

  @Field(() => UserRole, { nullable: true, description: "사용자 역할" })
  @IsOptional()
  role?: UserRole
}
