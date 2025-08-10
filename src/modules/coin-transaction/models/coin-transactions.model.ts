import { ObjectType } from "@nestjs/graphql"
import { Paginated } from "../../../common"
import { CoinTransaction } from "./coin-transaction.model"

@ObjectType()
export class CoinTransactions extends Paginated(CoinTransaction) {}
