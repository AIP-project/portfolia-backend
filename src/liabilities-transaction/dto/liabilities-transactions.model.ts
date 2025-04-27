import { ObjectType } from "@nestjs/graphql"
import { Paginated } from "../../common"
import { LiabilitiesTransaction } from "../entities"

@ObjectType()
export class LiabilitiesTransactions extends Paginated(LiabilitiesTransaction) {}
