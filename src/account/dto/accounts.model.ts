import { ObjectType } from "@nestjs/graphql"
import { Paginated } from "../../common"
import { Account } from "./account.model"


@ObjectType({ description: "계좌 목록" })
export class Accounts extends Paginated(Account) {}