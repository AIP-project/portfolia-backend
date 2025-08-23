import { ArgsType, Field } from "@nestjs/graphql"
import { IsNumber, IsOptional } from "class-validator"
import { PageSearchArgs } from "../../../common"

@ArgsType()
export class CoinSummariesArgs extends PageSearchArgs {
  @Field(() => Number, { nullable: false, description: "계좌 ID" })
  @IsOptional()
  @IsNumber()
  accountId!: number
}
