import { ObjectType } from "@nestjs/graphql"
import { Paginated } from "../../../common"
import { User } from "./user.model"

@ObjectType({ description: "사용자 목록" })
export class Users extends Paginated(User) {}
