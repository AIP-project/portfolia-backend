import { ObjectType } from "@nestjs/graphql"
import { Paginated } from "../../../common"
import { StockSummary } from "./stock-summary.model"

@ObjectType()
export class StockSummaries extends Paginated(StockSummary) {}
