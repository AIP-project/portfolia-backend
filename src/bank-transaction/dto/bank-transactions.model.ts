import { ObjectType } from "@nestjs/graphql"
import { Paginated } from "../../common"
import { BankTransaction } from "./bank-transaction.model"

@ObjectType()
export class BankTransactions extends Paginated(BankTransaction) {}
