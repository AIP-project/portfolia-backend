import { ObjectType } from "@nestjs/graphql"
import { Paginated } from "../../common"
import { LiabilitiesTransaction } from "./liabilities-transaction.model"

@ObjectType()
export class LiabilitiesTransactions extends Paginated(LiabilitiesTransaction) {}
