import { Test, TestingModule } from "@nestjs/testing"
import { AccountService } from "./account.service"
import { getRepositoryToken } from "@nestjs/typeorm"
import { Account } from "./entities/account.entity"
import {
  AccountType,
  CurrencyType,
  ErrorMessage,
  ForbiddenException,
  JwtPayload,
  LocationType,
  UserRole,
} from "../common"
import { AccountsArgs, CreateAccountInput, UpdateAccountInput } from "./dto"
import { BankSummary } from "../bank-summary/entities"
import { createMockRepository, mockEntityManager, resetAllMocks } from "../../test/mock"

import {
  generateMockAccount,
  generateMockBankSummary,
  generateMockCoinSummary,
  generateMockEtcSummary,
  generateMockLiabilitiesSummary,
  generateMockStockSummary,
} from "../../test/mock/account.mock"

describe("AccountService", () => {
  let service: AccountService

  const mockAccountRepository = createMockRepository()

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountService,
        {
          provide: getRepositoryToken(Account),
          useValue: mockAccountRepository,
        },
      ],
    }).compile()

    service = module.get<AccountService>(AccountService)

    resetAllMocks()
  })

  describe("commonCheckAccount", () => {
    it("관리자가 자신의 계정 확인 성공", async () => {
      // Given
      const jwtPayload: JwtPayload = {
        id: 1,
        role: UserRole.ADMIN,
        email: "admin@example.com",
      }

      const accountInput = {
        name: "Admin Account",
      }

      mockAccountRepository.exists.mockResolvedValue(false)

      // When
      const result = await service["commonCheckAccount"](jwtPayload, accountInput)

      // Then
      expect(result).toEqual({
        ...accountInput,
        userId: jwtPayload.id,
      })
    })

    it("관리자가 다른 사용자의 계정 확인 성공", async () => {
      // Given
      const jwtPayload: JwtPayload = {
        id: 1,
        role: UserRole.ADMIN,
        email: "admin@example.com",
      }

      const accountInput = {
        userId: 2,
        name: "User Account",
      }

      mockAccountRepository.exists.mockResolvedValue(false)

      // When
      const result = await service["commonCheckAccount"](jwtPayload, accountInput)

      // Then
      expect(result).toEqual({
        ...accountInput,
        userId: accountInput.userId,
      })
    })
    it("일반 사용자가 자신의 계정 확인 성공", async () => {
      // Given
      const jwtPayload: JwtPayload = {
        id: 1,
        role: UserRole.USER,
        email: "test@example.com",
      }

      const accountInput = {
        name: "Test Account",
      }

      mockAccountRepository.exists.mockResolvedValue(false)

      // When
      const result = await service["commonCheckAccount"](jwtPayload, accountInput)

      // Then
      expect(result).toEqual({
        ...accountInput,
        userId: jwtPayload.id,
      })
    })

    it("일반 사용자가 다른 사용자의 계정 접근 시도 시 실패", async () => {
      // Given
      const jwtPayload: JwtPayload = {
        id: 1,
        role: UserRole.USER,
        email: "test@example.com",
      }

      const accountInput = {
        userId: 2,
        name: "Test Account",
      }

      // When & Then
      await expect(service["commonCheckAccount"](jwtPayload, accountInput)).rejects.toThrow(ForbiddenException)
      await expect(service["commonCheckAccount"](jwtPayload, accountInput)).rejects.toThrow(
        ErrorMessage.MSG_FORBIDDEN_ERROR,
      )
    })

    it("동일한 계정 이름이 존재하는 경우 실패", async () => {
      // Given
      const jwtPayload: JwtPayload = {
        id: 1,
        role: UserRole.USER,
        email: "test@example.com",
      }

      const accountInput = {
        name: "Existing Account",
      }

      mockAccountRepository.exists.mockResolvedValue(true)

      // When & Then
      await expect(service["commonCheckAccount"](jwtPayload, accountInput)).rejects.toThrow(ForbiddenException)
      await expect(service["commonCheckAccount"](jwtPayload, accountInput)).rejects.toThrow(
        ErrorMessage.MSG_ACCOUNT_NAME_ALREADY_EXISTS,
      )
    })
  })

  describe("createAccount", () => {
    it("관리자가 다른 사용자의 계좌 생성 성공", async () => {
      // Given
      const jwtPayload: JwtPayload = {
        id: 1,
        role: UserRole.ADMIN,
        email: "admin@example.com",
      }

      const createAccountInput: CreateAccountInput = {
        userId: 2,
        name: "User Bank Account",
        type: AccountType.BANK,
        location: LocationType.KR,
        currency: CurrencyType.SGD,
        bankSummary: {
          balance: 500000,
          accountNumber: "1234567890",
          bankName: "Test Bank",
          bankCode: "001",
        },
      }

      const mockAccount = generateMockAccount({
        id: 1,
        userId: createAccountInput.userId,
        name: createAccountInput.name,
        type: createAccountInput.type,
        location: createAccountInput.location,
      })

      const mockBankSummary = generateMockBankSummary({
        accountId: mockAccount.id,
        ...createAccountInput.bankSummary,
      })

      mockAccountRepository.exists.mockResolvedValue(false)
      mockEntityManager.save.mockResolvedValueOnce(mockAccount)
      mockEntityManager.save.mockResolvedValueOnce(mockBankSummary)

      // When
      const result = await service.createAccount(jwtPayload, createAccountInput)

      // Then
      expect(result).toEqual(mockAccount)
      expect(mockEntityManager.transaction).toHaveBeenCalled()
    })
    it("계좌 생성 성공", async () => {
      // Given
      const jwtPayload: JwtPayload = {
        id: 1,
        role: UserRole.USER,
        email: "test@example.com",
      }

      const createAccountInput: CreateAccountInput = {
        name: "New Bank Account",
        type: AccountType.BANK,
        location: LocationType.KR,
        currency: CurrencyType.KRW,
        bankSummary: {
          balance: 1000000,
          bankName: "우리은행",
          bankCode: "020",
          accountNumber: "1234567890",
        },
      }

      const mockAccount = generateMockAccount({
        id: 1,
        userId: jwtPayload.id,
        name: createAccountInput.name,
        type: createAccountInput.type,
        location: createAccountInput.location,
      })

      const mockBankSummary = generateMockBankSummary({
        accountId: mockAccount.id,
        ...createAccountInput.bankSummary,
      })

      mockAccountRepository.exists.mockResolvedValue(false)
      mockEntityManager.save.mockResolvedValueOnce(mockAccount)
      mockEntityManager.save.mockResolvedValueOnce(mockBankSummary)

      // When
      const result = await service.createAccount(jwtPayload, createAccountInput)

      // Then
      expect(result).toEqual(mockAccount)
      expect(mockEntityManager.transaction).toHaveBeenCalled()
      expect(mockEntityManager.save).toHaveBeenCalledWith(Account, expect.any(Object))
      expect(mockEntityManager.save).toHaveBeenCalledWith(BankSummary, expect.any(Object))
    })
  })

  describe("accounts", () => {
    it("관리자가 특정 사용자의 계좌 목록 조회 성공", async () => {
      // Given
      const jwtPayload: JwtPayload = {
        id: 1,
        role: UserRole.ADMIN,
        email: "admin@example.com",
      }

      const accountsArgs = new AccountsArgs()
      accountsArgs.userId = 2
      accountsArgs.page = 1
      accountsArgs.take = 10
      accountsArgs.sortBy = [{ field: "name", direction: true }]
      accountsArgs.location = LocationType.KR

      const mockAccounts = [
        generateMockAccount({ userId: 2, name: "User Account 1" }),
        generateMockAccount({ userId: 2, name: "User Account 2" }),
      ]

      const total = 2
      mockAccountRepository.findAndCount.mockResolvedValue([mockAccounts, total])

      // When
      const result = await service.accounts(jwtPayload, accountsArgs)

      // Then
      expect(mockAccountRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.arrayContaining([
            { user: { id: accountsArgs.userId } },
            { isDelete: false },
            { location: LocationType.KR },
          ]),
          order: { name: "ASC" },
        }),
      )
      expect(result.edges).toEqual(mockAccounts)
    })

    it("빈 정렬 조건으로 계좌 목록 조회 성공", async () => {
      // Given
      const jwtPayload: JwtPayload = {
        id: 1,
        role: UserRole.USER,
        email: "test@example.com",
      }

      const accountsArgs = new AccountsArgs()
      accountsArgs.sortBy = []

      const mockAccounts = [generateMockAccount({ userId: 1 })]
      const total = 1
      mockAccountRepository.findAndCount.mockResolvedValue([mockAccounts, total])

      // When
      await service.accounts(jwtPayload, accountsArgs)

      // Then
      expect(mockAccountRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { createdAt: "ASC" },
        }),
      )
    })

    it("일반 사용자가 다른 사용자의 계좌 목록 조회 시도 시 실패", async () => {
      // Given
      const jwtPayload: JwtPayload = {
        id: 1,
        role: UserRole.USER,
        email: "test@example.com",
      }

      const accountsArgs = new AccountsArgs()
      accountsArgs.userId = 2

      // When & Then
      await expect(service.accounts(jwtPayload, accountsArgs)).rejects.toThrow(ForbiddenException)
      await expect(service.accounts(jwtPayload, accountsArgs)).rejects.toThrow(ErrorMessage.MSG_FORBIDDEN_ERROR)
    })
    it("계좌 목록 조회 성공", async () => {
      // Given
      const jwtPayload: JwtPayload = {
        id: 1,
        role: UserRole.USER,
        email: "test@example.com",
      }

      const accountsArgs = new AccountsArgs()
      accountsArgs.page = 1
      accountsArgs.take = 10
      accountsArgs.name = "test"
      accountsArgs.type = AccountType.BANK

      const mockAccounts = [
        generateMockAccount({ name: "Test Account 1", type: AccountType.BANK }),
        generateMockAccount({ name: "Test Account 2", type: AccountType.BANK }),
      ]

      const total = 2
      mockAccountRepository.findAndCount.mockResolvedValue([mockAccounts, total])

      // When
      const result = await service.accounts(jwtPayload, accountsArgs)

      // Then
      expect(mockAccountRepository.findAndCount).toHaveBeenCalled()
      expect(result).toEqual({
        edges: mockAccounts,
        pageInfo: {
          total,
          page: 1,
          take: 10,
          hasNextPage: false,
          totalPages: 1,
        },
      })
    })
  })

  describe("account", () => {
    it("관리자가 다른 사용자의 계좌 조회 성공", async () => {
      // Given
      const jwtPayload: JwtPayload = {
        id: 1,
        role: UserRole.ADMIN,
        email: "admin@example.com",
      }

      const accountId = 1
      const mockAccount = generateMockAccount({
        id: accountId,
        userId: 2,
      })

      mockAccountRepository.findOne.mockResolvedValue(mockAccount)

      // When
      const result = await service.account(jwtPayload, accountId)

      // Then
      expect(result).toEqual(mockAccount)
    })

    it("일반 사용자가 다른 사용자의 계좌 조회 시도 시 실패", async () => {
      // Given
      const jwtPayload: JwtPayload = {
        id: 1,
        role: UserRole.USER,
        email: "test@example.com",
      }

      const accountId = 1
      const mockAccount = generateMockAccount({
        id: accountId,
        userId: 2,
      })

      mockAccountRepository.findOne.mockResolvedValue(mockAccount)

      // When & Then
      await expect(service.account(jwtPayload, accountId)).rejects.toThrow(ForbiddenException)
      await expect(service.account(jwtPayload, accountId)).rejects.toThrow(ErrorMessage.MSG_FORBIDDEN_ERROR)
    })
    it("단일 계좌 조회 성공", async () => {
      // Given
      const jwtPayload: JwtPayload = {
        id: 1,
        role: UserRole.USER,
        email: "test@example.com",
      }

      const accountId = 1
      const mockAccount = generateMockAccount({
        id: accountId,
        userId: jwtPayload.id,
      })

      mockAccountRepository.findOne.mockResolvedValue(mockAccount)

      // When
      const result = await service.account(jwtPayload, accountId)

      // Then
      expect(result).toEqual(mockAccount)
      expect(mockAccountRepository.findOne).toHaveBeenCalledWith({
        where: { id: accountId, isDelete: false },
      })
    })

    it("존재하지 않는 계좌 조회 시 실패", async () => {
      // Given
      const jwtPayload: JwtPayload = {
        id: 1,
        role: UserRole.USER,
        email: "test@example.com",
      }

      const accountId = 999
      mockAccountRepository.findOne.mockResolvedValue(null)

      // When & Then
      await expect(service.account(jwtPayload, accountId)).rejects.toThrow(ForbiddenException)
      await expect(service.account(jwtPayload, accountId)).rejects.toThrow(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    })
  })

  describe("updateAccount", () => {
    it("존재하지 않는 계좌 업데이트 시도 시 실패", async () => {
      // Given
      const jwtPayload: JwtPayload = {
        id: 1,
        role: UserRole.USER,
        email: "test@example.com",
      }

      const updateAccountInput: UpdateAccountInput = {
        id: 999,
        name: "Nonexistent Account",
      }

      mockAccountRepository.exists.mockResolvedValue(false)
      mockAccountRepository.findOne.mockResolvedValue(null)

      // When & Then
      await expect(service.updateAccount(jwtPayload, updateAccountInput)).rejects.toThrow(ForbiddenException)
      await expect(service.updateAccount(jwtPayload, updateAccountInput)).rejects.toThrow(
        ErrorMessage.MSG_NOT_FOUND_ACCOUNT,
      )
    })

    it("다른 사용자의 계좌 업데이트 시도 시 실패", async () => {
      // Given
      const jwtPayload: JwtPayload = {
        id: 1,
        role: UserRole.USER,
        email: "test@example.com",
      }

      const updateAccountInput: UpdateAccountInput = {
        id: 1,
        name: "Other User Account",
      }

      const existingAccount = generateMockAccount({
        id: updateAccountInput.id,
        userId: 2,
        name: "Original Account Name",
      })

      mockAccountRepository.exists.mockResolvedValue(false)
      mockAccountRepository.findOne.mockResolvedValue(existingAccount)

      // When & Then
      await expect(service.updateAccount(jwtPayload, updateAccountInput)).rejects.toThrow(ForbiddenException)
      await expect(service.updateAccount(jwtPayload, updateAccountInput)).rejects.toThrow(
        ErrorMessage.MSG_FORBIDDEN_ERROR,
      )
    })
    it("계좌 정보 업데이트 성공", async () => {
      // Given
      const jwtPayload: JwtPayload = {
        id: 1,
        role: UserRole.USER,
        email: "test@example.com",
      }

      const updateAccountInput: UpdateAccountInput = {
        id: 1,
        name: "Updated Account Name",
      }

      const existingAccount = generateMockAccount({
        id: updateAccountInput.id,
        userId: jwtPayload.id,
        name: "Original Account Name",
      })

      const updatedAccount = generateMockAccount({
        id: updateAccountInput.id,
        userId: jwtPayload.id,
        name: updateAccountInput.name,
      })

      mockAccountRepository.exists.mockResolvedValue(false)
      mockAccountRepository.findOne.mockResolvedValue(existingAccount)
      mockEntityManager.findOne.mockResolvedValue(existingAccount)
      mockEntityManager.merge.mockReturnValue(updatedAccount)
      mockEntityManager.save.mockResolvedValue(updatedAccount)

      // When
      const result = await service.updateAccount(jwtPayload, updateAccountInput)

      // Then
      expect(result).toEqual(updatedAccount)
      expect(mockEntityManager.transaction).toHaveBeenCalled()
      expect(mockEntityManager.save).toHaveBeenCalledWith(Account, updatedAccount)
    })
  })

  describe("Summary Resolvers", () => {
    const jwtPayload: JwtPayload = {
      id: 1,
      role: UserRole.USER,
      email: "test@example.com",
    }

    describe("resolveBankSummary", () => {
      it("은행 계좌 요약 정보 조회 성공", async () => {
        // Given
        const account = generateMockAccount({
          id: 1,
          userId: jwtPayload.id,
          type: AccountType.BANK,
        })

        const bankSummary = generateMockBankSummary({
          accountId: account.id,
        })

        mockAccountRepository.manager.findOne.mockResolvedValue(bankSummary)

        // When
        const result = await service.resolveBankSummary(jwtPayload, account)

        // Then
        expect(result).toEqual(bankSummary)
      })

      it("은행 계좌가 아닌 경우 null 반환", async () => {
        // Given
        const account = generateMockAccount({
          id: 1,
          userId: jwtPayload.id,
          type: AccountType.STOCK,
        })

        // When
        const result = await service.resolveBankSummary(jwtPayload, account)

        // Then
        expect(result).toBeNull()
      })
    })

    describe("resolveStockSummaries", () => {
      it("주식 계좌 요약 정보 조회 성공", async () => {
        // Given
        const account = generateMockAccount({
          id: 1,
          userId: jwtPayload.id,
          type: AccountType.STOCK,
        })

        const stockSummaries = [
          generateMockStockSummary({ accountId: account.id }),
          generateMockStockSummary({ accountId: account.id }),
        ]

        mockAccountRepository.manager.find.mockResolvedValue(stockSummaries)

        // When
        const result = await service.resolveStockSummaries(jwtPayload, account)

        // Then
        expect(result).toEqual(stockSummaries)
      })

      it("주식 계좌가 아닌 경우 [] 반환", async () => {
        // Given
        const account = generateMockAccount({
          id: 1,
          userId: jwtPayload.id,
          type: AccountType.BANK,
        })

        // When
        const result = await service.resolveStockSummaries(jwtPayload, account)

        // Then
        expect(result).toMatchObject([])
      })
    })

    describe("resolveCoinSummaries", () => {
      it("코인 계좌 요약 정보 조회 성공", async () => {
        // Given
        const account = generateMockAccount({
          id: 1,
          userId: jwtPayload.id,
          type: AccountType.COIN,
        })

        const coinSummaries = [
          generateMockCoinSummary({ accountId: account.id }),
          generateMockCoinSummary({ accountId: account.id }),
        ]

        mockAccountRepository.manager.find.mockResolvedValue(coinSummaries)

        // When
        const result = await service.resolveCoinSummaries(jwtPayload, account)

        // Then
        expect(result).toEqual(coinSummaries)
      })

      it("코인 계좌가 아닌 경우 [] 반환", async () => {
        // Given
        const account = generateMockAccount({
          id: 1,
          userId: jwtPayload.id,
          type: AccountType.BANK,
        })

        // When
        const result = await service.resolveCoinSummaries(jwtPayload, account)

        // Then
        expect(result).toMatchObject([])
      })
    })

    describe("resolveEtcSummary", () => {
      it("기타 자산 요약 정보 조회 성공", async () => {
        // Given
        const account = generateMockAccount({
          id: 1,
          userId: jwtPayload.id,
          type: AccountType.ETC,
        })

        const etcSummary = generateMockEtcSummary({
          accountId: account.id,
        })

        mockAccountRepository.manager.findOne.mockResolvedValue(etcSummary)

        // When
        const result = await service.resolveEtcSummary(jwtPayload, account)

        // Then
        expect(result).toEqual(etcSummary)
      })

      it("기타 계좌가 아닌 경우 null 반환", async () => {
        // Given
        const account = generateMockAccount({
          id: 1,
          userId: jwtPayload.id,
          type: AccountType.BANK,
        })

        // When
        const result = await service.resolveEtcSummary(jwtPayload, account)

        // Then
        expect(result).toBeNull()
      })
    })

    describe("resolveLiabilitiesSummary", () => {
      it("부채 요약 정보 조회 성공", async () => {
        // Given
        const account = generateMockAccount({
          id: 1,
          userId: jwtPayload.id,
          type: AccountType.LIABILITIES,
        })

        const liabilitiesSummary = generateMockLiabilitiesSummary({
          accountId: account.id,
        })

        mockAccountRepository.manager.findOne.mockResolvedValue(liabilitiesSummary)

        // When
        const result = await service.resolveLiabilitiesSummary(jwtPayload, account)

        // Then
        expect(result).toEqual(liabilitiesSummary)
      })

      it("부채 계좌가 아닌 경우 null 반환", async () => {
        // Given
        const account = generateMockAccount({
          id: 1,
          userId: jwtPayload.id,
          type: AccountType.BANK,
        })

        // When
        const result = await service.resolveLiabilitiesSummary(jwtPayload, account)

        // Then
        expect(result).toBeNull()
      })
    })
  })
})
