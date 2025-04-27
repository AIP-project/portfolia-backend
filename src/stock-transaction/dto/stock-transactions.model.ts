import { ObjectType } from "@nestjs/graphql"
import { Paginated } from "../../common"
import { StockTransaction } from "../entities/stock-transaction.entity"

@ObjectType()
export class StockTransactions extends Paginated(StockTransaction) {}
