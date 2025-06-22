import { ObjectType } from "@nestjs/graphql"
import { Paginated } from "../../common"
import { StockTransaction } from "./stock-transaction.model"

@ObjectType()
export class StockTransactions extends Paginated(StockTransaction) {}
