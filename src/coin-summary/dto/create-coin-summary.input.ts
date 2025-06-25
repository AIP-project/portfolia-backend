import { InputType, OmitType } from "@nestjs/graphql"
import { CoinSummaryInput } from "./coin-summary.input"

@InputType()
export class CreateCoinSummaryInput extends OmitType(CoinSummaryInput, ["id"]) {}
