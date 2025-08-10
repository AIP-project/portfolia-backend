import { ArgsType, Field } from "@nestjs/graphql"
import { IsNumber, IsOptional, IsString } from "class-validator"
import { PageSearchArgs } from "../../../common"
import { AccountType } from "@prisma/client"

@ArgsType()
export class AccountsArgs extends PageSearchArgs {
  @Field(() => String, { nullable: true, description: "계좌 이름" })
  @IsOptional()
  @IsString()
  name?: string

  @Field(() => AccountType, { nullable: true, description: "계좌 타입" })
  @IsOptional()
  type?: AccountType

  @Field(() => Number, { nullable: true, description: "사용자 ID" })
  @IsOptional()
  @IsNumber()
  userId?: number
}
