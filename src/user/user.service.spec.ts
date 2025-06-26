import { Test, TestingModule } from "@nestjs/testing"
import { UserService } from "./user.service"
import { User } from "./dto/users.model"
import {
  BadRequestException,
  CustomJwtService,
  ErrorMessage,
  ForbiddenException,
  InvalidTokenException,
  JwtPayload,
  NotFoundException,
  PasswordService,
  TokenType,
  UserRole,
  ValidationException,
} from "../common"
import { PrismaService } from "../common/prisma"
import { SignInInput, SignUpInput, UpdateUserInput, UsersArgs } from "./dto"
import { UserState } from "../common/enum/user-state.enum"
import {
  createMockJwtService,
  createMockPasswordService,
  createMockPrismaService,
  generateMockTokens,
  generateMockUser,
  resetAllMocks,
} from "../../test/mock"
import { CommonInput } from "../common/dto/common.input"

describe("UserService", () => {
  let service: UserService

  const mockPrismaService = createMockPrismaService()
  const mockPasswordService = createMockPasswordService()
  const mockJwtService = createMockJwtService()

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: PasswordService,
          useValue: mockPasswordService,
        },
        {
          provide: CustomJwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile()

    service = module.get<UserService>(UserService)

    resetAllMocks()
  })

  describe("signUp", () => {
    describe("cleanSignUpData", () => {
      it("이메일/비밀번호로 유효한 데이터 정리 성공", async () => {
        // Given
        const signUpInput: SignUpInput = {
          email: "test@example.com",
          password: "Password123!",
          name: "Test User",
          phone: "010-1234-5678",
        }

        const hashedPassword = "hashedPassword123"

        mockUserRepository.exists.mockResolvedValue(false)
        mockPasswordService.hashPassword.mockResolvedValue(hashedPassword)

        // When
        const result = await service["cleanSignUpData"](signUpInput)

        // Then
        expect(result).toEqual({
          email: signUpInput.email,
          password: hashedPassword,
          name: signUpInput.name,
          phone: signUpInput.phone,
        })
        expect(mockUserRepository.exists).toHaveBeenCalledWith({
          where: { email: signUpInput.email },
        })
        expect(mockPasswordService.hashPassword).toHaveBeenCalledWith(signUpInput.password)
      })

      it("이메일 또는 비밀번호 누락 시 실패", async () => {
        // Given
        const signUpInput: SignUpInput = {
          name: "Test User",
          email: undefined,
        }

        // When & Then
        await expect(service["cleanSignUpData"](signUpInput)).rejects.toThrow(ValidationException)
        await expect(service["cleanSignUpData"](signUpInput)).rejects.toThrow(ErrorMessage.MSG_PARAMETER_REQUIRED)
      })

      it("이메일 형식이 올바르지 않은 경우 실패", async () => {
        // Given
        const signUpInput: SignUpInput = {
          email: "invalid-email",
          password: "Password123!",
          name: "Test User",
        }

        // When & Then
        await expect(service["cleanSignUpData"](signUpInput)).rejects.toThrow(ValidationException)
      })

      it("이미 존재하는 이메일인 경우 실패", async () => {
        // Given
        const signUpInput: SignUpInput = {
          email: "existing@example.com",
          password: "Password123!",
          name: "Test User",
        }

        mockUserRepository.exists.mockResolvedValue(true)

        // When & Then
        await expect(service["cleanSignUpData"](signUpInput)).rejects.toThrow(ValidationException)
        await expect(service["cleanSignUpData"](signUpInput)).rejects.toThrow(ErrorMessage.MSG_EMAIL_ALREADY_EXISTS)
      })

      it("비밀번호 형식이 올바르지 않은 경우 실패", async () => {
        // Given
        const signUpInput: SignUpInput = {
          email: "test@example.com",
          password: "weak", // 간단한 비밀번호
          name: "Test User",
        }

        mockUserRepository.exists.mockResolvedValue(false)

        // When & Then
        await expect(service["cleanSignUpData"](signUpInput)).rejects.toThrow(ValidationException)
      })

      it("소셜 로그인 시도 시 NotImplemented 에러 발생", async () => {
        // Given
        const signUpInput: SignUpInput = {
          email: undefined,
          snsType: "GOOGLE",
          snsId: "google123",
          name: "Social User",
          phone: "010-9876-5432",
        }

        // When & Then
        await expect(service["cleanSignUpData"](signUpInput)).rejects.toThrow(BadRequestException)
        await expect(service["cleanSignUpData"](signUpInput)).rejects.toThrow(ErrorMessage.MSG_NOT_IMPLEMENTED)
      })
    })

    describe("txSignUp", () => {
      it("트랜잭션 내에서 사용자 저장 성공", async () => {
        // Given
        const signUpInput: SignUpInput = {
          email: "test@example.com",
          password: "hashedPassword123",
          name: "Test User",
          phone: "010-1234-5678",
        }

        const savedUser = generateMockUser({
          email: signUpInput.email,
          password: signUpInput.password,
          name: signUpInput.name,
          phone: signUpInput.phone,
        })

        mockEntityManager.save.mockResolvedValue(savedUser)

        // When
        const result = await service["txSignUp"](signUpInput)

        // Then
        expect(mockEntityManager.transaction).toHaveBeenCalled()
        expect(mockEntityManager.save).toHaveBeenCalledWith(User, signUpInput)
        expect(result).toEqual(savedUser)
      })
    })

    describe("postSignUp", () => {
      it("사용자 정보로 JWT 토큰 생성 성공", async () => {
        // Given
        const user = generateMockUser({
          id: 1,
          email: "test@example.com",
          role: UserRole.USER,
        })

        const tokens = generateMockTokens()

        mockJwtService.generateTokens.mockResolvedValue(tokens)

        // When
        const result = await service["postSignUp"](user)

        // Then
        expect(mockJwtService.generateTokens).toHaveBeenCalledWith({
          id: user.id,
          role: user.role,
          email: user.email,
        })
        expect(result).toEqual(tokens)
      })
    })

    it("이메일/비밀번호로 회원가입 전체 플로우 성공", async () => {
      // Given
      const signUpInput: SignUpInput = {
        email: "test@example.com",
        password: "Password123!",
        name: "Test User",
        phone: "010-1234-5678",
      }

      const hashedPassword = "hashedPassword123"

      const savedUser = generateMockUser({
        email: signUpInput.email,
        password: hashedPassword,
        name: signUpInput.name,
        phone: signUpInput.phone,
      })

      const tokens = generateMockTokens()

      mockUserRepository.exists.mockResolvedValue(false)
      mockPasswordService.hashPassword.mockResolvedValue(hashedPassword)
      mockEntityManager.save.mockResolvedValue(savedUser)
      mockJwtService.generateTokens.mockResolvedValue(tokens)

      // When
      const result = await service.signUp(signUpInput)

      // Then
      expect(mockUserRepository.exists).toHaveBeenCalledWith({
        where: { email: signUpInput.email },
      })
      expect(mockPasswordService.hashPassword).toHaveBeenCalledWith(signUpInput.password)
      expect(mockEntityManager.transaction).toHaveBeenCalled()
      expect(mockEntityManager.save).toHaveBeenCalledWith(User, {
        email: signUpInput.email,
        password: hashedPassword,
        name: signUpInput.name,
        phone: signUpInput.phone,
      })
      expect(mockJwtService.generateTokens).toHaveBeenCalledWith({
        id: savedUser.id,
        role: savedUser.role,
        email: savedUser.email,
      })
      expect(result).toEqual(tokens)
    })
  })

  describe("signIn", () => {
    it("이메일/비밀번호로 로그인 성공", async () => {
      // Given
      const signInInput: SignInInput = {
        email: "test@example.com",
        password: "Password123!",
      }

      const user = generateMockUser({
        email: signInInput.email,
        password: "hashedPassword123",
      })

      const tokens = generateMockTokens()

      mockUserRepository.findOne.mockResolvedValue(user)
      mockPasswordService.validatePassword.mockResolvedValue(true)
      mockJwtService.generateTokens.mockResolvedValue(tokens)

      // When
      const result = await service.signIn(signInInput)

      // Then
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: signInInput.email, state: UserState.ACTIVE },
      })
      expect(mockPasswordService.validatePassword).toHaveBeenCalledWith(signInInput.password, user.password)
      expect(mockJwtService.generateTokens).toHaveBeenCalledWith({
        id: user.id,
        role: user.role,
        email: user.email,
      })
      expect(result).toEqual(tokens)
    })

    it("사용자를 찾을 수 없는 경우 로그인 실패", async () => {
      // Given
      const signInInput: SignInInput = {
        email: "nonexistent@example.com",
        password: "Password123!",
      }

      mockUserRepository.findOne.mockResolvedValue(null)

      // When & Then
      await expect(service.signIn(signInInput)).rejects.toThrow(ValidationException)
      await expect(service.signIn(signInInput)).rejects.toThrow(ErrorMessage.MSG_NOT_FOUND_USER)
    })

    it("비밀번호가 일치하지 않는 경우 로그인 실패", async () => {
      // Given
      const signInInput: SignInInput = {
        email: "test@example.com",
        password: "WrongPassword!",
      }

      const user = generateMockUser({
        email: signInInput.email,
        password: "hashedPassword123",
      })

      mockUserRepository.findOne.mockResolvedValue(user)
      mockPasswordService.validatePassword.mockResolvedValue(false)

      // When & Then
      await expect(service.signIn(signInInput)).rejects.toThrow(ValidationException)
      await expect(service.signIn(signInInput)).rejects.toThrow(ErrorMessage.MSG_PASSWORD_NOT_MATCH)
    })

    it("소셜 로그인 시도 시 NotImplemented 에러 발생", async () => {
      // Given
      const signInInput: SignInInput = {
        snsType: "GOOGLE",
        snsId: "google123",
      }

      // When & Then
      await expect(service.signIn(signInInput)).rejects.toThrow(ValidationException)
      await expect(service.signIn(signInInput)).rejects.toThrow(ErrorMessage.MSG_INTERNAL_SERVER_ERROR)
    })

    it("필수 파라미터 없는 경우 로그인 실패", async () => {
      // Given
      const signInInput: SignInInput = {
        // 아무 필드도 없음
      }

      // When & Then
      await expect(service.signIn(signInInput)).rejects.toThrow(ValidationException)
      await expect(service.signIn(signInInput)).rejects.toThrow(ErrorMessage.MSG_PARAMETER_REQUIRED)
    })
  })

  // 추가 테스트 코드
  describe("users", () => {
    it("유저 리스트 조회 성공", async () => {
      // Given
      const usersArgs = new UsersArgs()
      usersArgs.page = 1
      usersArgs.take = 10
      usersArgs.sortBy = [{ field: "createdAt", direction: false }]
      usersArgs.name = "test"
      usersArgs.email = "example"
      usersArgs.role = UserRole.USER

      const mockUsers = [
        generateMockUser({ name: "Test User 1", email: "test1@example.com" }),
        generateMockUser({ name: "Test User 2", email: "test2@example.com" }),
      ]

      const total = 2
      mockUserRepository.findAndCount.mockResolvedValue([mockUsers, total])

      // When
      const result = await service.users(usersArgs)

      // Then
      expect(mockUserRepository.findAndCount).toHaveBeenCalledWith({
        where: [{ name: expect.any(Object) }, { email: expect.any(Object) }, { role: UserRole.USER }],
        skip: 0,
        take: 10,
        order: { createdAt: "DESC" },
      })
      expect(result).toEqual({
        edges: mockUsers,
        pageInfo: {
          total,
          page: 1,
          take: 10,
          hasNextPage: false,
          totalPages: 1,
        },
      })
    })

    it("기본 정렬로 유저 리스트 조회 성공", async () => {
      // Given
      const usersArgs = new UsersArgs()
      usersArgs.sortBy = []

      const mockUsers = [
        generateMockUser({ name: "Test User 1", email: "test1@example.com" }),
        generateMockUser({ name: "Test User 2", email: "test2@example.com" }),
      ]

      const total = 2
      mockUserRepository.findAndCount.mockResolvedValue([mockUsers, total])

      // When
      const result = await service.users(usersArgs)

      // Then
      expect(mockUserRepository.findAndCount).toHaveBeenCalledWith({
        where: [],
        skip: 0,
        take: 10,
        order: { createdAt: "ASC" },
      })
      expect(result.edges).toEqual(mockUsers)
    })
  })

  describe("me", () => {
    it("내 정보 조회 성공", async () => {
      // Given
      const jwtPayload: JwtPayload = {
        id: 1,
        role: UserRole.USER,
        email: "test@example.com",
      }

      const mockUser = generateMockUser({
        id: jwtPayload.id,
        email: jwtPayload.email,
        role: jwtPayload.role,
      })

      mockUserRepository.findOne.mockResolvedValue(mockUser)

      // When
      const result = await service.me(jwtPayload)

      // Then
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: jwtPayload.id },
      })
      expect(result).toEqual(mockUser)
    })
  })

  describe("user", () => {
    it("특정 사용자 조회 성공", async () => {
      // Given
      const userId = 1
      const mockUser = generateMockUser({ id: userId })

      mockUserRepository.findOne.mockResolvedValue(mockUser)

      // When
      const result = await service.user(userId)

      // Then
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
      })
      expect(result).toEqual(mockUser)
    })
  })

  describe("updateUser", () => {
    describe("cleanUpdateUser", () => {
      it("일반 사용자가 자신의 정보 업데이트 성공", async () => {
        // Given
        const jwtPayload: JwtPayload = {
          id: 1,
          role: UserRole.USER,
          email: "test@example.com",
        }

        const updateUserInput: UpdateUserInput = {
          name: "Updated Name",
          phone: "010-9876-5432",
        }

        mockUserRepository.exists.mockResolvedValue(true)

        // When
        const result = await service["cleanUpdateUser"](jwtPayload, updateUserInput)

        // Then
        expect(result).toEqual({
          ...updateUserInput,
          id: jwtPayload.id,
        })
        expect(mockUserRepository.exists).toHaveBeenCalledWith({
          where: { id: jwtPayload.id },
        })
      })

      it("일반 사용자가 다른 사용자 정보 업데이트 시도 시 실패", async () => {
        // Given
        const jwtPayload: JwtPayload = {
          id: 1,
          role: UserRole.USER,
          email: "test@example.com",
        }

        const updateUserInput: UpdateUserInput = {
          id: 2, // 다른 사용자 ID
          name: "Updated Name",
        }

        // When & Then
        await expect(service["cleanUpdateUser"](jwtPayload, updateUserInput)).rejects.toThrow(ForbiddenException)
        await expect(service["cleanUpdateUser"](jwtPayload, updateUserInput)).rejects.toThrow(
          ErrorMessage.MSG_FORBIDDEN_ERROR,
        )
      })

      it("일반 사용자가 역할 또는 상태 변경 시도 시 실패", async () => {
        // Given
        const jwtPayload: JwtPayload = {
          id: 1,
          role: UserRole.USER,
          email: "test@example.com",
        }

        const updateUserInput: UpdateUserInput = {
          role: UserRole.ADMIN,
        }

        // When & Then
        await expect(service["cleanUpdateUser"](jwtPayload, updateUserInput)).rejects.toThrow(ForbiddenException)
        await expect(service["cleanUpdateUser"](jwtPayload, updateUserInput)).rejects.toThrow(
          ErrorMessage.MSG_FORBIDDEN_ERROR,
        )
      })

      it("관리자가 다른 사용자 정보 업데이트 성공", async () => {
        // Given
        const jwtPayload: JwtPayload = {
          id: 1,
          role: UserRole.ADMIN,
          email: "admin@example.com",
        }

        const updateUserInput: UpdateUserInput = {
          id: 2,
          name: "Updated By Admin",
          role: UserRole.USER,
          state: UserState.INACTIVE,
        }

        mockUserRepository.exists.mockResolvedValue(true)

        // When
        const result = await service["cleanUpdateUser"](jwtPayload, updateUserInput)

        // Then
        expect(result).toEqual(updateUserInput)
        expect(mockUserRepository.exists).toHaveBeenCalledWith({
          where: { id: updateUserInput.id },
        })
      })

      it("관리자가 ID 없이 요청 시 자신의 정보 업데이트", async () => {
        // Given
        const jwtPayload: JwtPayload = {
          id: 1,
          role: UserRole.ADMIN,
          email: "admin@example.com",
        }

        const updateUserInput: UpdateUserInput = {
          name: "Updated Admin Name",
        }

        mockUserRepository.exists.mockResolvedValue(true)

        // When
        const result = await service["cleanUpdateUser"](jwtPayload, updateUserInput)

        // Then
        expect(result).toEqual({
          ...updateUserInput,
          id: jwtPayload.id,
        })
      })

      it("존재하지 않는 사용자 ID로 업데이트 시도 시 실패", async () => {
        // Given
        const jwtPayload: JwtPayload = {
          id: 1,
          role: UserRole.ADMIN,
          email: "admin@example.com",
        }

        const updateUserInput: UpdateUserInput = {
          id: 999,
          name: "Nonexistent User",
        }

        mockUserRepository.exists.mockResolvedValue(false)

        // When & Then
        await expect(service["cleanUpdateUser"](jwtPayload, updateUserInput)).rejects.toThrow(ValidationException)
        await expect(service["cleanUpdateUser"](jwtPayload, updateUserInput)).rejects.toThrow(
          ErrorMessage.MSG_NOT_FOUND_USER,
        )
      })
    })

    describe("txUpdateUser", () => {
      it("사용자 정보 업데이트 트랜잭션 성공", async () => {
        // Given
        const updateUserInput: UpdateUserInput = {
          id: 1,
          name: "Updated Name",
          phone: "010-9876-5432",
        }

        const existingUser = generateMockUser({
          id: updateUserInput.id,
          name: "Original Name",
          phone: "010-1234-5678",
        })

        const updatedUser = generateMockUser({
          id: updateUserInput.id,
          name: updateUserInput.name,
          phone: updateUserInput.phone,
        })

        mockEntityManager.findOne.mockResolvedValue(existingUser)
        mockEntityManager.merge.mockReturnValue(updatedUser)
        mockEntityManager.save.mockResolvedValue(updatedUser)

        // When
        const result = await service["txUpdateUser"](updateUserInput)

        // Then
        expect(mockEntityManager.transaction).toHaveBeenCalled()
        expect(mockEntityManager.findOne).toHaveBeenCalledWith(User, {
          where: { id: updateUserInput.id },
        })
        expect(mockEntityManager.merge).toHaveBeenCalledWith(User, existingUser, updateUserInput)
        expect(mockEntityManager.save).toHaveBeenCalledWith(User, updatedUser)
        expect(result).toEqual(updatedUser)
      })
    })

    it("사용자 정보 업데이트 전체 플로우 성공", async () => {
      // Given
      const jwtPayload: JwtPayload = {
        id: 1,
        role: UserRole.USER,
        email: "test@example.com",
      }

      const updateUserInput: UpdateUserInput = {
        name: "Updated Name",
        phone: "010-9876-5432",
      }

      const existingUser = generateMockUser({
        id: jwtPayload.id,
        name: "Original Name",
        phone: "010-1234-5678",
        password: "hashedPassword123",
      })

      const updatedUser = generateMockUser({
        id: jwtPayload.id,
        name: updateUserInput.name,
        phone: updateUserInput.phone,
        password: "hashedPassword123",
      })

      mockUserRepository.exists.mockResolvedValue(true)
      mockEntityManager.findOne.mockResolvedValue(existingUser)
      mockEntityManager.merge.mockReturnValue(updatedUser)
      mockEntityManager.save.mockResolvedValue(updatedUser)

      // When
      const result = await service.updateUser(jwtPayload, updateUserInput)

      // Then
      expect(mockUserRepository.exists).toHaveBeenCalledWith({
        where: { id: jwtPayload.id },
      })
      expect(mockEntityManager.findOne).toHaveBeenCalledWith(User, {
        where: { id: jwtPayload.id },
      })
      expect(mockEntityManager.merge).toHaveBeenCalledWith(User, existingUser, {
        ...updateUserInput,
        id: jwtPayload.id,
      })
      expect(mockEntityManager.save).toHaveBeenCalledWith(User, updatedUser)

      // 비밀번호는 제외되어야 함
      const { password, ...expectedResult } = updatedUser
      expect(result).toEqual(expectedResult)
    })
  })

  describe("refreshToken", () => {
    it("유효한 리프레시 토큰으로 토큰 갱신 성공", async () => {
      // Given
      const commonInput: CommonInput = {
        value1: "valid-refresh-token",
      }

      const decodedPayload: JwtPayload = {
        id: 1,
        role: UserRole.USER,
        email: "test@example.com",
      }

      const user = generateMockUser({
        id: decodedPayload.id,
        email: decodedPayload.email,
        role: decodedPayload.role,
      })

      const tokens = generateMockTokens()

      mockJwtService.verify.mockResolvedValue(decodedPayload)
      mockUserRepository.findOne.mockResolvedValue(user)
      mockJwtService.generateTokens.mockResolvedValue(tokens)

      // When
      const result = await service.refreshToken(commonInput)

      // Then
      expect(mockJwtService.verify).toHaveBeenCalledWith(commonInput.value1, TokenType.REFRESH)
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: decodedPayload.id, state: UserState.ACTIVE },
      })
      expect(mockJwtService.generateTokens).toHaveBeenCalledWith({
        id: user.id,
        role: user.role,
        email: user.email,
      })
      expect(result).toEqual(tokens)
    })

    it("잘못된 리프레시 토큰으로 요청 시 실패", async () => {
      // Given
      const commonInput: CommonInput = {
        value1: "invalid-refresh-token",
      }

      mockJwtService.verify.mockResolvedValue(null)

      // When & Then
      await expect(service.refreshToken(commonInput)).rejects.toThrow(InvalidTokenException)
      await expect(service.refreshToken(commonInput)).rejects.toThrow(ErrorMessage.MSG_INVALID_TOKEN)
    })

    it("비활성화된 사용자의 리프레시 토큰으로 요청 시 실패", async () => {
      // Given
      const commonInput: CommonInput = {
        value1: "valid-refresh-token",
      }

      const decodedPayload: JwtPayload = {
        id: 1,
        role: UserRole.USER,
        email: "test@example.com",
      }

      mockJwtService.verify.mockResolvedValue(decodedPayload)
      mockUserRepository.findOne.mockResolvedValue(null) // 사용자가 없거나 비활성화됨

      // When & Then
      await expect(service.refreshToken(commonInput)).rejects.toThrow(NotFoundException)
      await expect(service.refreshToken(commonInput)).rejects.toThrow(ErrorMessage.MSG_NOT_FOUND_USER)
    })
  })
})
