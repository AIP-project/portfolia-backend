import { ObjectType } from "@nestjs/graphql"
import { Paginated } from "../../common"
import { CoinTransaction } from "../entities"

@ObjectType()
export class CoinTransactions extends Paginated(CoinTransaction) {}
