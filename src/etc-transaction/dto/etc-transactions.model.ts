import { ObjectType } from "@nestjs/graphql"
import { Paginated } from "../../common"
import { EtcTransaction } from "../entities/etc-transaction.entity"

@ObjectType()
export class EtcTransactions extends Paginated(EtcTransaction) {}
