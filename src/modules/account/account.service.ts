import { Injectable, Logger } from "@nestjs/common"
import { AccountInput, CreateAccountInput, UpdateAccountInput } from "./inputs"
import { AccountsArgs } from "./inputs/accounts.args"
import { Account } from "./models"
import { ErrorMessage, ForbiddenException, JwtPayload, ValidationException } from "../../common"
import { PrismaService } from "../../common/prisma"
import { AccountType, Prisma, SummaryType, UserRole } from "@prisma/client"
import { CleanedCreateAccountInput, CleanedUpdateAccountInput } from "./types/cleaned-account-input.type"

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name)

  constructor(private readonly prisma: PrismaService) {}

  private async commonCheckAccount(jwtPayload: JwtPayload, accountInput: AccountInput) {
    const cleanInput = new AccountInput()
    if (jwtPayload.role !== UserRole.ADMIN) {
      if (accountInput.userId) throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)
      cleanInput.userId = jwtPayload.id
    } else {
      if (!accountInput.userId) cleanInput.userId = jwtPayload.id
      else cleanInput.userId = accountInput.userId
    }

    if (!cleanInput.userId) throw new ValidationException(ErrorMessage.MSG_PARAMETER_REQUIRED)

    return { ...accountInput, ...cleanInput }
  }

  async createAccount(jwtPayload: JwtPayload, createAccountInput: CreateAccountInput) {
    // Step 1: Clean and validate input
    const cleanInput = await this.cleanCreateAccount(jwtPayload, createAccountInput)
    
    // Step 2: Execute transaction
    const account = await this.txCreateAccount(cleanInput)
    
    // Step 3: Post-transaction operations
    return await this.postCreateAccount(account)
  }

  private async cleanCreateAccount(jwtPayload: JwtPayload, createAccountInput: CreateAccountInput): Promise<CleanedCreateAccountInput> {
    const cleanInput = await this.commonCheckAccount(jwtPayload, createAccountInput)
    
    let summaryName = ""
    if (createAccountInput.type === AccountType.BANK) {
      if (!createAccountInput.bankSummary?.name) {
        throw new ValidationException(ErrorMessage.MSG_PARAMETER_REQUIRED)
      }
      summaryName = createAccountInput.bankSummary.name
    } else if (createAccountInput.type === AccountType.STOCK) {
      if (!createAccountInput.stockSummary?.name) {
        throw new ValidationException(ErrorMessage.MSG_PARAMETER_REQUIRED)
      }
      summaryName = createAccountInput.stockSummary.name
    } else if (createAccountInput.type === AccountType.COIN) {
      if (!createAccountInput.coinSummary?.name) {
        throw new ValidationException(ErrorMessage.MSG_PARAMETER_REQUIRED)
      }
      summaryName = createAccountInput.coinSummary.name
    }
    
    return {
      ...createAccountInput,
      ...cleanInput,
      nickName: createAccountInput.nickName || summaryName
    } as CleanedCreateAccountInput
  }

  private async txCreateAccount(cleanInput: CleanedCreateAccountInput) {
    return this.prisma.$transaction(async (prisma) => {
      const { bankSummary, stockSummary, coinSummary, userId, ...accountInput } = cleanInput
      const account = await prisma.account.create({
        data: {
          ...accountInput,
          nickName: accountInput.nickName!,
          userId: userId,
        },
      })

      if (account.type === AccountType.BANK) {
        await prisma.bankSummary.create({
          data: { accountId: account.id, currency: bankSummary.currency, ...bankSummary },
        })
      } else if (account.type === AccountType.STOCK) {
        await prisma.stockSummary.create({
          data: {
            accountId: account.id,
            type: SummaryType.CASH,
            currency: stockSummary.currency,
            ...stockSummary,
          },
        })
      } else if (account.type === AccountType.COIN) {
        await prisma.coinSummary.create({
          data: {
            accountId: account.id,
            type: SummaryType.CASH,
            currency: coinSummary.currency,
            ...coinSummary,
          },
        })
      } else if (account.type === AccountType.ETC) {
        await prisma.etcSummary.create({
          data: { accountId: account.id },
        })
      } else if (account.type === AccountType.LIABILITIES) {
        await prisma.liabilitiesSummary.create({
          data: { accountId: account.id },
        })
      }
      return account
    })
  }

  async accounts(jwtPayload: JwtPayload, accountsArgs: AccountsArgs) {
    const { page = 1, take = 10, sortBy = [], name, type, userId } = accountsArgs
    const skip = (page - 1) * take

    let searchUserId = jwtPayload.id
    if (jwtPayload.role !== UserRole.ADMIN) {
      if (userId) throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)
      searchUserId = jwtPayload.id
    } else {
      if (userId) searchUserId = userId
    }

    const whereConditions: Prisma.AccountWhereInput = {
      isDelete: false,
    }

    if (searchUserId) whereConditions.userId = searchUserId
    if (name) whereConditions.nickName = { contains: name }
    if (type) whereConditions.type = type

    // Order by 설정
    const orderBy: Prisma.AccountOrderByWithRelationInput =
      sortBy.length > 0
        ? sortBy.reduce(
            (acc, { field, direction }) => ({
              ...acc,
              [field]: direction ? "asc" : "desc",
            }),
            {},
          )
        : { createdAt: "asc" } // 기본 정렬

    const [accounts, total] = await Promise.all([
      this.prisma.account.findMany({
        where: whereConditions,
        skip,
        take,
        orderBy,
      }),
      this.prisma.account.count({
        where: whereConditions,
      }),
    ])

    const totalPages = Math.ceil(total / take)

    return {
      edges: accounts,
      pageInfo: {
        total,
        page,
        take,
        hasNextPage: page < totalPages,
        totalPages,
      },
    }
  }

  async account(jwtPayload: JwtPayload, id: number) {
    const account = await this.prisma.account.findFirst({
      where: { id: id, isDelete: false },
    })

    if (!account) throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (account.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    return account
  }

  async updateAccount(jwtPayload: JwtPayload, updateAccountInput: UpdateAccountInput) {
    // Step 1: Clean and validate input
    const cleanInput = await this.cleanUpdateAccount(jwtPayload, updateAccountInput)
    
    // Step 2: Execute transaction
    const account = cleanInput.isDelete 
      ? await this.txDeleteAccount(cleanInput)
      : await this.txUpdateAccount(cleanInput)
    
    // Step 3: Post-transaction operations
    return await this.postUpdateAccount(account)
  }

  private async cleanUpdateAccount(jwtPayload: JwtPayload, updateAccountInput: UpdateAccountInput): Promise<CleanedUpdateAccountInput> {
    const cleanInput = await this.commonCheckAccount(jwtPayload, updateAccountInput)
    const existingAccount = await this.prisma.account.findFirst({
      where: { id: cleanInput.id, isDelete: false },
    })
    
    if (!existingAccount) {
      throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    }
    if (existingAccount.userId !== cleanInput.userId) {
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)
    }
    
    return { ...updateAccountInput, ...cleanInput } as CleanedUpdateAccountInput
  }

  private async txUpdateAccount(cleanInput: CleanedUpdateAccountInput) {
    return this.prisma.account.update({
      where: { id: cleanInput.id },
      data: cleanInput,
    })
  }

  /**
   * 계정 삭제를 위한 트랜잭션 함수
   * 계정과 관련된 모든 summary와 transaction을 함께 삭제 처리
   */
  private async txDeleteAccount(cleanInput: CleanedUpdateAccountInput) {
    return this.prisma.$transaction(async (prisma) => {
      // 계정 정보 조회
      const existingAccount = await prisma.account.findUnique({
        where: { id: cleanInput.id },
      })

      if (!existingAccount) {
        throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
      }

      const accountId = existingAccount.id

      // 계정 타입에 따라 관련 엔티티 삭제
      switch (existingAccount.type) {
        case AccountType.BANK:
          await this.txDeleteBankEntities(prisma, accountId)
          break
        case AccountType.STOCK:
          await this.txDeleteStockEntities(prisma, accountId)
          break
        case AccountType.COIN:
          await this.txDeleteCoinEntities(prisma, accountId)
          break
        case AccountType.ETC:
          await this.txDeleteEtcEntities(prisma, accountId)
          break
        case AccountType.LIABILITIES:
          await this.txDeleteLiabilitiesEntities(prisma, accountId)
          break
      }

      // 계정 자체를 논리적으로 삭제 (isDelete = true)
      return prisma.account.update({
        where: { id: existingAccount.id },
        data: { isDelete: true },
      })
    })
  }

  /**
   * 은행 계정 관련 엔티티 삭제 트랜잭션 함수
   */
  private async txDeleteBankEntities(prisma: Prisma.TransactionClient, accountId: number) {
    // 은행 요약 정보 삭제
    await prisma.bankSummary.updateMany({
      where: { accountId },
      data: { isDelete: true },
    })

    // 은행 거래 정보 삭제
    await prisma.bankTransaction.updateMany({
      where: { accountId },
      data: { isDelete: true },
    })
  }

  /**
   * 주식 계정 관련 엔티티 삭제 트랜잭션 함수
   */
  private async txDeleteStockEntities(prisma: Prisma.TransactionClient, accountId: number) {
    // 주식 요약 정보 삭제
    await prisma.stockSummary.updateMany({
      where: { accountId },
      data: { isDelete: true },
    })

    // 주식 거래 정보 삭제
    await prisma.stockTransaction.updateMany({
      where: { accountId },
      data: { isDelete: true },
    })
  }

  /**
   * 코인 계정 관련 엔티티 삭제 트랜잭션 함수
   */
  private async txDeleteCoinEntities(prisma: Prisma.TransactionClient, accountId: number) {
    // 코인 요약 정보 삭제
    await prisma.coinSummary.updateMany({
      where: { accountId },
      data: { isDelete: true },
    })

    // 코인 거래 정보 삭제
    await prisma.coinTransaction.updateMany({
      where: { accountId },
      data: { isDelete: true },
    })
  }

  /**
   * 기타 계정 관련 엔티티 삭제 트랜잭션 함수
   */
  private async txDeleteEtcEntities(prisma: Prisma.TransactionClient, accountId: number) {
    // 기타 요약 정보 삭제
    await prisma.etcSummary.updateMany({
      where: { accountId },
      data: { isDelete: true },
    })

    // 기타 거래 정보 삭제
    await prisma.etcTransaction.updateMany({
      where: { accountId },
      data: { isDelete: true },
    })
  }

  /**
   * 부채 계정 관련 엔티티 삭제 트랜잭션 함수
   */
  private async txDeleteLiabilitiesEntities(prisma: Prisma.TransactionClient, accountId: number) {
    // 부채 요약 정보 삭제
    await prisma.liabilitiesSummary.updateMany({
      where: { accountId },
      data: { isDelete: true },
    })

    // 부채 거래 정보 삭제
    await prisma.liabilitiesTransaction.updateMany({
      where: { accountId },
      data: { isDelete: true },
    })
  }

  /**
   * Post-transaction operations for account creation
   */
  private async postCreateAccount(account: Account) {
    // Log account creation
    this.logger.log(`Account created: ${account.id} for user: ${account.userId}`)
    
    // Return the account as-is (can add caching, notifications, etc. later)
    return account
  }

  /**
   * Post-transaction operations for account update
   */
  private async postUpdateAccount(account: Account) {
    // Log account update
    if (account.isDelete) {
      this.logger.log(`Account soft deleted: ${account.id}`)
    } else {
      this.logger.log(`Account updated: ${account.id}`)
    }
    
    // Return the account as-is (can add cache invalidation, etc. later)
    return account
  }
}
