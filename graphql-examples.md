# GraphQL API 사용 예시

## 인증 (Authentication)

### 회원가입
```graphql
mutation SignUp {
  signUp(input: {
    email: "user@example.com"
    password: "securePassword123!"
    name: "홍길동"
    currency: KRW
  }) {
    accessToken
    refreshToken
  }
}
```

### 로그인
```graphql
mutation SignIn {
  signIn(input: {
    email: "user@example.com"
    password: "securePassword123!"
  }) {
    accessToken
    refreshToken
  }
}
```

### 토큰 재발급
```graphql
mutation RefreshToken {
  refreshToken(input: {
    refreshToken: "your-refresh-token-here"
  }) {
    accessToken
    refreshToken
  }
}
```

### 내 정보 조회
```graphql
query Me {
  me {
    id
    email
    name
    role
    currency
    state
    createdAt
    updatedAt
  }
}
```

### 사용자 정보 수정
```graphql
mutation UpdateUser {
  updateUser(input: {
    name: "김철수"
    currency: USD
  }) {
    accessToken
    refreshToken
  }
}
```

## 계좌 관리 (Account Management)

### 계좌 생성 - 은행 계좌
```graphql
mutation CreateBankAccount {
  createAccount(input: {
    nickName: "우리은행 주거래"
    type: BANK
    note: "월급 통장"
    bankSummary: {
      name: "우리은행"
      balance: 5000000
      currency: KRW
    }
  }) {
    id
    nickName
    type
    note
    createdAt
    bankSummary {
      id
      name
      balance
      currency
    }
  }
}
```

### 계좌 생성 - 주식 계좌
```graphql
mutation CreateStockAccount {
  createAccount(input: {
    nickName: "미래에셋 주식"
    type: STOCK
    note: "국내주식 투자용"
    stockSummary: {
      name: "미래에셋증권"
      totalBuyPrice: 10000000
      totalEvaluationPrice: 12000000
      quantity: 100
      currency: KRW
    }
  }) {
    id
    nickName
    type
    stockSummary {
      id
      name
      totalBuyPrice
      totalEvaluationPrice
      quantity
      currency
    }
  }
}
```

### 계좌 생성 - 암호화폐 계좌
```graphql
mutation CreateCoinAccount {
  createAccount(input: {
    nickName: "업비트 거래소"
    type: COIN
    note: "암호화폐 투자"
    coinSummary: {
      name: "업비트"
      totalBuyPrice: 5000000
      totalEvaluationPrice: 6000000
      quantity: 0.5
      currency: KRW
    }
  }) {
    id
    nickName
    type
    coinSummary {
      id
      name
      totalBuyPrice
      totalEvaluationPrice
      quantity
    }
  }
}
```

### 계좌 목록 조회
```graphql
query GetAccounts {
  accounts(
    page: 1
    take: 10
    sortBy: [{ field: "createdAt", direction: false }]
    type: BANK
  ) {
    data {
      id
      nickName
      type
      note
      createdAt
      bankSummary {
        balance
        currency
      }
      stockSummary {
        totalEvaluationPrice
        currency
      }
      coinSummary {
        totalEvaluationPrice
        currency
      }
    }
    pageInfo {
      page
      take
      totalCount
      totalPages
      hasNextPage
    }
  }
}
```

### 계좌 상세 조회
```graphql
query GetAccount {
  account(id: 1) {
    id
    nickName
    type
    note
    createdAt
    updatedAt
    bankSummary {
      id
      name
      balance
      currency
      balanceKRW
    }
    stockSummary {
      id
      name
      totalBuyPrice
      totalEvaluationPrice
      totalReturnPrice
      totalReturnRate
      currency
    }
    coinSummary {
      id
      name
      totalBuyPrice
      totalEvaluationPrice
      totalReturnPrice
      totalReturnRate
      currency
    }
  }
}
```

### 계좌 정보 수정
```graphql
mutation UpdateAccount {
  updateAccount(input: {
    id: 1
    nickName: "우리은행 메인"
    note: "주거래 통장 (급여)"
  }) {
    id
    nickName
    note
    updatedAt
  }
}
```

## 은행 거래 (Bank Transactions)

### 은행 거래 생성
```graphql
mutation CreateBankTransaction {
  createBankTransaction(input: {
    accountId: 1
    type: INCOME
    transactionDate: "2024-01-15"
    name: "1월 급여"
    amount: 3500000
    balance: 8500000
    currency: KRW
    note: "월급"
  }) {
    id
    type
    transactionDate
    name
    amount
    balance
    currency
    note
  }
}
```

### 은행 거래 목록 조회
```graphql
query GetBankTransactions {
  bankTransactions(
    accountId: 1
    page: 1
    take: 20
    type: INCOME
    fromTransactionDate: "2024-01-01"
    toTransactionDate: "2024-01-31"
  ) {
    data {
      id
      type
      transactionDate
      name
      amount
      balance
      currency
      note
      createdAt
    }
    pageInfo {
      page
      take
      totalCount
      totalPages
      hasNextPage
    }
  }
}
```

### 은행 거래 수정
```graphql
mutation UpdateBankTransaction {
  updateBankTransaction(input: {
    id: 1
    name: "1월 급여 (보너스 포함)"
    amount: 4000000
    balance: 9000000
    note: "월급 + 성과급"
  }) {
    id
    name
    amount
    balance
    note
    updatedAt
  }
}
```

### 은행 거래 삭제
```graphql
mutation DeleteBankTransaction {
  deleteBankTransaction(id: 1)
}
```

## 주식 거래 (Stock Transactions)

### 주식 거래 생성 - 매수
```graphql
mutation CreateStockBuyTransaction {
  createStockTransaction(input: {
    accountId: 2
    type: BUY
    transactionDate: "2024-01-10"
    name: "삼성전자"
    symbol: "005930"
    price: 75000
    quantity: 10
    amount: 750000
    currency: KRW
    note: "분할 매수 1차"
  }) {
    id
    type
    transactionDate
    name
    symbol
    price
    quantity
    amount
    currency
    note
  }
}
```

### 주식 거래 생성 - 매도
```graphql
mutation CreateStockSellTransaction {
  createStockTransaction(input: {
    accountId: 2
    type: SELL
    transactionDate: "2024-01-20"
    name: "삼성전자"
    symbol: "005930"
    price: 80000
    quantity: 5
    amount: 400000
    currency: KRW
    note: "일부 익절"
  }) {
    id
    type
    transactionDate
    name
    symbol
    price
    quantity
    amount
  }
}
```

### 주식 거래 목록 조회
```graphql
query GetStockTransactions {
  stockTransactions(
    accountId: 2
    page: 1
    take: 10
    symbol: "005930"
    type: BUY
  ) {
    data {
      id
      type
      transactionDate
      name
      symbol
      price
      quantity
      amount
      currency
      note
    }
    pageInfo {
      page
      take
      totalCount
    }
  }
}
```

### 주식 요약 정보 조회
```graphql
query GetStockSummaries {
  stockSummaries(accountId: 2) {
    data {
      id
      name
      symbol
      totalBuyPrice
      totalEvaluationPrice
      totalReturnPrice
      totalReturnRate
      quantity
      averagePrice
      currentPrice
      currency
    }
    pageInfo {
      totalCount
    }
  }
}
```

## 암호화폐 거래 (Cryptocurrency Transactions)

### 암호화폐 거래 생성
```graphql
mutation CreateCoinTransaction {
  createCoinTransaction(input: {
    accountId: 3
    type: BUY
    transactionDate: "2024-01-05"
    name: "비트코인"
    symbol: "BTC"
    price: 50000000
    quantity: 0.1
    amount: 5000000
    currency: KRW
    note: "장기 투자"
  }) {
    id
    type
    transactionDate
    name
    symbol
    price
    quantity
    amount
    currency
  }
}
```

### 암호화폐 거래 목록 조회
```graphql
query GetCoinTransactions {
  coinTransactions(
    accountId: 3
    page: 1
    take: 10
    symbol: "BTC"
  ) {
    data {
      id
      type
      transactionDate
      name
      symbol
      price
      quantity
      amount
      currency
      note
    }
    pageInfo {
      page
      take
      totalCount
    }
  }
}
```

### 암호화폐 요약 정보 조회
```graphql
query GetCoinSummaries {
  coinSummaries(accountId: 3) {
    data {
      id
      name
      symbol
      totalBuyPrice
      totalEvaluationPrice
      totalReturnPrice
      totalReturnRate
      quantity
      averagePrice
      currentPrice
      currency
      evaluationKRW
    }
    pageInfo {
      totalCount
    }
  }
}
```

## 기타 자산 거래 (Other Assets)

### 기타 자산 거래 생성
```graphql
mutation CreateEtcTransaction {
  createEtcTransaction(input: {
    accountId: 4
    type: BUY
    transactionDate: "2024-01-01"
    name: "금 1온스"
    amount: 2500000
    currency: KRW
    note: "안전자산 투자"
  }) {
    id
    type
    transactionDate
    name
    amount
    currency
    note
  }
}
```

### 기타 자산 거래 목록 조회
```graphql
query GetEtcTransactions {
  etcTransactions(
    accountId: 4
    page: 1
    take: 10
  ) {
    data {
      id
      type
      transactionDate
      name
      amount
      currency
      note
    }
    pageInfo {
      totalCount
    }
  }
}
```

## 부채 관리 (Liabilities)

### 부채 거래 생성
```graphql
mutation CreateLiabilitiesTransaction {
  createLiabilitiesTransaction(input: {
    accountId: 5
    type: LOAN
    transactionDate: "2024-01-01"
    name: "주택담보대출"
    amount: 200000000
    currency: KRW
    note: "아파트 구매 대출"
  }) {
    id
    type
    transactionDate
    name
    amount
    currency
    note
  }
}
```

### 부채 상환 기록
```graphql
mutation CreateLiabilitiesPayment {
  createLiabilitiesTransaction(input: {
    accountId: 5
    type: REPAYMENT
    transactionDate: "2024-01-25"
    name: "1월 대출 상환"
    amount: 1500000
    currency: KRW
    note: "원금 500000 + 이자 1000000"
  }) {
    id
    type
    transactionDate
    name
    amount
  }
}
```

## 가격 이력 (Price History)

### 주식 가격 이력 조회
```graphql
query GetStockPriceHistory {
  stockPriceHistory(
    accountId: 2
    page: 1
    take: 30
  ) {
    data {
      id
      symbol
      price
      currency
      createdAt
    }
    pageInfo {
      totalCount
    }
  }
}
```

### 암호화폐 가격 이력 조회
```graphql
query GetCoinPriceHistory {
  coinPriceHistory(
    accountId: 3
    page: 1
    take: 30
  ) {
    data {
      id
      symbol
      price
      currency
      createdAt
    }
    pageInfo {
      totalCount
    }
  }
}
```

### 최신 암호화폐 가격 조회 (Public)
```graphql
query GetLatestCoinPrices {
  latestCoinPrices {
    symbol
    price
    currency
    updatedAt
  }
}
```

## 환율 정보 (Exchange Rates)

### 환율 조회
```graphql
query GetExchangeRates {
  exchangeRates {
    base
    currency
    rate
    updatedAt
  }
}
```

### 특정 통화 환율 조회
```graphql
query GetExchangeRate {
  exchangeRate(currency: USD) {
    base
    currency
    rate
    updatedAt
  }
}
```

## 관리자 기능 (Admin Only)

### 사용자 목록 조회
```graphql
query GetUsers {
  users(
    page: 1
    take: 10
    role: USER
  ) {
    data {
      id
      email
      name
      role
      state
      currency
      createdAt
    }
    pageInfo {
      page
      take
      totalCount
      totalPages
      hasNextPage
    }
  }
}
```

### 특정 사용자 조회
```graphql
query GetUser {
  user(id: 1) {
    id
    email
    name
    role
    state
    currency
    createdAt
    updatedAt
  }
}
```

## 복합 쿼리 예시

### 전체 자산 현황 조회
```graphql
query GetTotalAssets {
  accounts(page: 1, take: 100) {
    data {
      id
      nickName
      type
      bankSummary {
        balance
        balanceKRW
      }
      stockSummary {
        totalEvaluationPrice
        evaluationKRW
        totalReturnRate
      }
      coinSummary {
        totalEvaluationPrice
        evaluationKRW
        totalReturnRate
      }
      etcSummary {
        totalAmount
        totalAmountKRW
      }
      liabilitiesSummary {
        totalAmount
        totalAmountKRW
      }
    }
  }
}
```

### 특정 계좌의 모든 정보 조회
```graphql
query GetAccountFullInfo($accountId: Float!) {
  account(id: $accountId) {
    id
    nickName
    type
    note
    createdAt
    stockSummary {
      id
      name
      totalBuyPrice
      totalEvaluationPrice
      totalReturnPrice
      totalReturnRate
      currency
    }
  }
  stockTransactions(accountId: $accountId, page: 1, take: 10) {
    data {
      id
      type
      transactionDate
      name
      symbol
      price
      quantity
      amount
    }
    pageInfo {
      totalCount
    }
  }
  stockSummaries(accountId: $accountId) {
    data {
      id
      name
      symbol
      quantity
      averagePrice
      currentPrice
      totalReturnRate
    }
  }
}
```

## 헤더 설정

모든 인증이 필요한 요청에는 Authorization 헤더를 포함해야 합니다:

```json
{
  "Authorization": "Bearer YOUR_ACCESS_TOKEN_HERE"
}
```

## GraphQL Variables 사용 예시

```graphql
mutation CreateAccountWithVariables($input: CreateAccountInput!) {
  createAccount(input: $input) {
    id
    nickName
    type
  }
}
```

Variables:
```json
{
  "input": {
    "nickName": "새 계좌",
    "type": "BANK",
    "note": "테스트 계좌",
    "bankSummary": {
      "name": "국민은행",
      "balance": 1000000,
      "currency": "KRW"
    }
  }
}
```

## 에러 처리

GraphQL 에러 응답 예시:
```json
{
  "errors": [
    {
      "message": "Forbidden resource",
      "extensions": {
        "code": "FORBIDDEN",
        "response": {
          "statusCode": 403,
          "message": "Forbidden resource"
        }
      }
    }
  ],
  "data": null
}
```

## Pagination 파라미터

- `page`: 페이지 번호 (기본값: 1)
- `take`: 한 페이지당 항목 수 (기본값: 10)
- `sortBy`: 정렬 기준 배열
  - `field`: 정렬할 필드명
  - `direction`: true(오름차순) / false(내림차순)

## Enum 타입들

### UserRole
- `ADMIN`: 관리자
- `USER`: 일반 사용자

### UserState
- `ACTIVE`: 활성
- `INACTIVE`: 비활성
- `DELETED`: 삭제됨

### AccountType
- `BANK`: 은행
- `STOCK`: 주식
- `COIN`: 암호화폐
- `ETC`: 기타
- `LIABILITIES`: 부채

### TransactionType
- `BUY`: 매수
- `SELL`: 매도
- `INCOME`: 수입
- `EXPENSE`: 지출
- `LOAN`: 대출
- `REPAYMENT`: 상환

### CurrencyType
- `KRW`: 한국 원
- `USD`: 미국 달러
- `EUR`: 유로
- `JPY`: 일본 엔
- `CNY`: 중국 위안
- `GBP`: 영국 파운드

### SummaryType
- `CASH`: 현금
- `STOCK`: 주식
- `COIN`: 암호화폐