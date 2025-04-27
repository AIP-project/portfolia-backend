import { ObjectType } from "@nestjs/graphql"
import { Paginated } from "../../common"
import { BankTransaction } from "../entities/bank-transaction.entity"

@ObjectType()
export class BankTransactions extends Paginated(BankTransaction) {}
