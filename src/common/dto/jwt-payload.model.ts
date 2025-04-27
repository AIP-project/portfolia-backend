import { CurrencyType, UserRole } from "../enum"

export class JwtPayload {
  id: number
  email?: string
  name?: string
  role: UserRole
  currency: CurrencyType
}
