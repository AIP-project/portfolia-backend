import { ObjectType } from "@nestjs/graphql"
import { Paginated } from "../../common"
import { StockSummary } from "../entities"

@ObjectType()
export class StockSummaries extends Paginated(StockSummary) {}
