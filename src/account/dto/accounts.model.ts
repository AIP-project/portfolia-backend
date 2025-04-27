import { ObjectType } from "@nestjs/graphql"
import { Paginated } from "../../common"
import { Account } from "../entities/account.entity"

@ObjectType({ description: "계좌 목록" })
export class Accounts extends Paginated(Account) {}
