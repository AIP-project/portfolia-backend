import { Module } from "@nestjs/common"
import { UserService } from "./user.service"
import { AuthModule, PasswordModule } from "../common"
import { User } from "./entities/user.entity"
import { TypeOrmModule } from "@nestjs/typeorm"
import { UserResolver } from "./user.resolver"

@Module({
  imports: [TypeOrmModule.forFeature([User]), PasswordModule, AuthModule],
  providers: [UserResolver, UserService],
})
export class UserModule {}
