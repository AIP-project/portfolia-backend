import { ObjectType } from "@nestjs/graphql"
import { Paginated } from "../../../common"
import { EtcTransaction } from "./etc-transaction.model"

@ObjectType()
export class EtcTransactions extends Paginated(EtcTransaction) {}
