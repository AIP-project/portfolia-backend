export const mockEntityManager = {
  transaction: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  merge: jest.fn(),
  find: jest.fn(),
}

export const createMockRepository = () => ({
  exists: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  manager: mockEntityManager,
})

export const resetAllMocks = () => {
  jest.clearAllMocks()

  // EntityManager 모의 초기화
  mockEntityManager.transaction.mockReset()
  mockEntityManager.save.mockReset()
  mockEntityManager.findOne.mockReset()
  mockEntityManager.merge.mockReset()

  // 트랜잭션 기본 구현 설정
  mockEntityManager.transaction.mockImplementation(async (cb) => {
    return cb(mockEntityManager)
  })
}

export const createMockPasswordService = () => ({
  hashPassword: jest.fn(),
  validatePassword: jest.fn(),
})

export const createMockJwtService = () => ({
  generateTokens: jest.fn(),
  verify: jest.fn(),
})
