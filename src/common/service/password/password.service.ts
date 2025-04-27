import { Injectable, Logger } from "@nestjs/common"
import { compare, hash } from "bcrypt"

@Injectable()
export class PasswordService {
  private readonly logger = new Logger(PasswordService.name)

  constructor() {}

  validatePassword(password: string, hashedPassword: string): Promise<boolean> {
    return compare(password, hashedPassword)
  }

  hashPassword(password: string): Promise<string> {
    return hash(password, 10)
  }
}
