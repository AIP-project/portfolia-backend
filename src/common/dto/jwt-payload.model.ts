import { CurrencyType, UserRole } from "@prisma/client"

export class JwtPayload {
  id: number
  email?: string
  name?: string
  role: UserRole
  currency: CurrencyType
}
