import { Module } from "@nestjs/common"
import { UserService } from "./user.service"
import { AuthModule, PasswordModule } from "../common"
import { UserResolver } from "./user.resolver"

@Module({
  imports: [PasswordModule, AuthModule],
  providers: [UserResolver, UserService],
})
export class UserModule {}
