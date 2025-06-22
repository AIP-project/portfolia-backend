import { ObjectType } from "@nestjs/graphql"
import { Paginated } from "../../common"
import { CoinSummary } from "./coin-summary.model"

@ObjectType()
export class CoinSummaries extends Paginated(CoinSummary) {}
