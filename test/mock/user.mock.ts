import { faker } from "@faker-js/faker/locale/ko"
import { CurrencyType, Token, UserRole } from "../../src/common"
import { User } from "../../src/user/dto/users.model"
import { UserState } from "../../src/common/enum/user-state.enum"

export const generateMockUser = (data?: Partial<User>): User => {
  return {
    id: faker.number.int(),
    name: faker.person.fullName(),
    password: faker.internet.password(),
    email: faker.internet.email(),
    phone: faker.phone.number(),
    profileImg: faker.image.url(),
    role: faker.helpers.arrayElement(Object.values(UserRole)),
    state: faker.helpers.arrayElement(Object.values(UserState)),
    currency: faker.helpers.arrayElement(Object.values(CurrencyType)),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...data,
  }
}

export const generateMockTokens = (data?: Partial<Token>): Token => {
  return {
    accessToken: faker.string.ulid(),
    refreshToken: faker.string.ulid(),
    ...data,
  }
}
