# Transfer API Documentation

## 개요
계좌 간 잔액 이체를 위한 GraphQL API입니다. 은행, 주식, 코인 계좌 간 자유로운 자금 이체를 지원합니다.

## GraphQL Query

### accountsByCurrency
통화별 계좌 목록을 조회합니다. 이체 가능한 계좌를 선택할 때 사용합니다.

```graphql
query AccountsByCurrency($input: AccountsByCurrencyInput!) {
  accountsByCurrency(input: $input) {
    id
    nickName
    type
    currency
    balance
    isDelete
  }
}
```

## GraphQL Mutation

### transferBalance
계좌 간 잔액을 이체합니다.

```graphql
mutation TransferBalance($input: CreateTransferInput!) {
  transferBalance(input: $input) {
    success
    fromTransaction {
      id
      accountId
      amount
      type
      transactionDate
      description
    }
    toTransaction {
      id
      accountId
      amount
      type
      transactionDate
      description
    }
    message
  }
}
```

## Input Types

### AccountsByCurrencyInput
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| currency | CurrencyType | ✅ | 조회할 통화 타입 (KRW, USD 등) |

#### 예제 Input
```json
{
  "input": {
    "currency": "KRW"
  }
}
```

### CreateTransferInput
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| fromAccountId | Int | ✅ | 출금 계좌 ID |
| toAccountId | Int | ✅ | 입금 계좌 ID |
| amount | Float | ✅ | 이체 금액 (최소: 0.01) |
| transactionDate | DateTime | ✅ | 거래일시 (ISO 8601 형식) |
| description | String | ❌ | 메모 (선택사항) |

#### 예제 Input
```json
{
  "input": {
    "fromAccountId": 1,
    "toAccountId": 2,
    "amount": 10000,
    "transactionDate": "2025-08-23T12:00:00Z",
    "description": "월급 이체"
  }
}
```

## Output Types

### AccountWithBalance
| 필드 | 타입 | Nullable | 설명 |
|------|------|----------|------|
| id | Int | ❌ | 계좌 ID |
| nickName | String | ❌ | 계좌 이름 |
| type | AccountType | ❌ | 계좌 타입 (BANK, STOCK, COIN 등) |
| currency | CurrencyType | ❌ | 통화 타입 |
| balance | Float | ❌ | 현재 잔액 |
| isDelete | Boolean | ❌ | 계좌 삭제 여부 |

### TransferResult
| 필드 | 타입 | Nullable | 설명 |
|------|------|----------|------|
| success | Boolean | ❌ | 이체 성공 여부 |
| fromTransaction | TransferTransaction | ❌ | 출금 트랜잭션 정보 |
| toTransaction | TransferTransaction | ❌ | 입금 트랜잭션 정보 |
| message | String | ✅ | 결과 메시지 |

### TransferTransaction
| 필드 | 타입 | 설명 |
|------|------|------|
| id | Int | 트랜잭션 ID |
| accountId | Int | 계좌 ID |
| amount | Float | 거래 금액 |
| type | String | 거래 유형 (DEPOSIT, WITHDRAWAL, BUY, SELL) |
| transactionDate | DateTime | 거래일시 |
| description | String | 거래 설명 |

## 지원되는 계좌 타입 조합

| 출금 계좌 | 입금 계좌 | 지원 여부 | 조건 |
|-----------|-----------|-----------|------|
| Bank | Bank | ✅ | 같은 통화 |
| Bank | Stock (CASH) | ✅ | 같은 통화 |
| Bank | Coin (CASH) | ✅ | 같은 통화 |
| Stock (CASH) | Bank | ✅ | 같은 통화 |
| Stock (CASH) | Stock (CASH) | ✅ | 같은 통화 |
| Stock (CASH) | Coin (CASH) | ✅ | 같은 통화 |
| Coin (CASH) | Bank | ✅ | 같은 통화 |
| Coin (CASH) | Stock (CASH) | ✅ | 같은 통화 |
| Coin (CASH) | Coin (CASH) | ✅ | 같은 통화 |

> ⚠️ **중요**: 
> - Stock과 Coin 계좌는 반드시 `type=CASH`인 Summary가 있어야 이체가 가능합니다.
> - **모든 이체는 같은 통화 간에만 가능합니다** (예: KRW → KRW, USD → USD)

## 트랜잭션 기록 방식

### Bank 계좌
- **출금**: `BankTransaction` 생성, `type=WITHDRAWAL`
- **입금**: `BankTransaction` 생성, `type=DEPOSIT`
- **Summary 업데이트**: `balance` 필드 증감

### Stock 계좌
- **출금**: `StockTransaction` 생성, `type=SELL`, `symbol="TRANSFER"`
- **입금**: `StockTransaction` 생성, `type=BUY`, `symbol="TRANSFER"`
- **Summary 업데이트**: `type=CASH`인 Summary의 `amount` 필드 증감

### Coin 계좌
- **출금**: `CoinTransaction` 생성, `type=SELL`, `symbol="TRANSFER"`
- **입금**: `CoinTransaction` 생성, `type=BUY`, `symbol="TRANSFER"`
- **Summary 업데이트**: `type=CASH`인 Summary의 `amount` 필드 증감

## 에러 코드

| 에러 코드 | 메시지 | 설명 |
|-----------|--------|------|
| VALIDATION_ERROR | 금액은 0보다 커야 합니다. | amount가 0 이하인 경우 |
| VALIDATION_ERROR | 같은 계좌로는 이체할 수 없습니다. | fromAccountId와 toAccountId가 동일한 경우 |
| VALIDATION_ERROR | 계좌를 찾을 수 없습니다. | 존재하지 않는 계좌 ID |
| VALIDATION_ERROR | 잔액이 부족합니다. | 출금 계좌의 잔액이 부족한 경우 |
| VALIDATION_ERROR | 현금 타입의 요약정보를 찾을 수 없습니다. | Stock/Coin 계좌에 CASH 타입 Summary가 없는 경우 |
| VALIDATION_ERROR | 서로 다른 통화 간에는 이체할 수 없습니다. | 출금/입금 계좌의 통화가 다른 경우 |
| FORBIDDEN | 권한이 없습니다. | 본인 계좌가 아닌 경우 (ADMIN 제외) |

## 실제 사용 예제

### 1. 통화별 계좌 조회
```graphql
query {
  accountsByCurrency(input: { currency: KRW }) {
    id
    nickName
    type
    currency
    balance
  }
}
```

#### 성공 응답
```json
{
  "data": {
    "accountsByCurrency": [
      {
        "id": 1,
        "nickName": "주거래계좌",
        "type": "BANK",
        "currency": "KRW",
        "balance": 1500000
      },
      {
        "id": 3,
        "nickName": "키움증권",
        "type": "STOCK",
        "currency": "KRW",
        "balance": 500000
      },
      {
        "id": 5,
        "nickName": "업비트",
        "type": "COIN",
        "currency": "KRW",
        "balance": 300000
      }
    ]
  }
}
```

### 2. 은행 → 은행 이체
```graphql
mutation {
  transferBalance(input: {
    fromAccountId: 1,
    toAccountId: 2,
    amount: 50000,
    transactionDate: "2025-08-23T09:00:00Z",
    description: "생활비 이체"
  }) {
    success
    fromTransaction {
      id
      amount
      type
      description
    }
    toTransaction {
      id
      amount
      type
      description
    }
    message
  }
}
```

#### 성공 응답
```json
{
  "data": {
    "transferBalance": {
      "success": true,
      "fromTransaction": {
        "id": 101,
        "amount": 50000,
        "type": "WITHDRAWAL",
        "description": "Transfer to 급여계좌"
      },
      "toTransaction": {
        "id": 102,
        "amount": 50000,
        "type": "DEPOSIT",
        "description": "Transfer from 주거래계좌"
      },
      "message": "이체가 성공적으로 완료되었습니다."
    }
  }
}
```

### 3. 주식 계좌 → 은행 이체
```graphql
mutation {
  transferBalance(input: {
    fromAccountId: 3,  # 주식 계좌
    toAccountId: 1,    # 은행 계좌
    amount: 100000,
    transactionDate: "2025-08-23T10:00:00Z",
    description: "투자금 회수"
  }) {
    success
    fromTransaction {
      id
      amount
      type
    }
    toTransaction {
      id
      amount
      type
    }
    message
  }
}
```

### 4. 에러 케이스 - 잔액 부족
```graphql
mutation {
  transferBalance(input: {
    fromAccountId: 1,
    toAccountId: 2,
    amount: 99999999,  # 잔액보다 큰 금액
    transactionDate: "2025-08-23T10:00:00Z"
  }) {
    success
    message
  }
}
```

#### 에러 응답
```json
{
  "errors": [
    {
      "message": "잔액이 부족합니다.",
      "extensions": {
        "code": "VALIDATION_ERROR"
      }
    }
  ]
}
```

### 5. 에러 케이스 - 통화 불일치
```graphql
mutation {
  transferBalance(input: {
    fromAccountId: 1,  # KRW 계좌
    toAccountId: 5,    # USD 계좌
    amount: 10000,
    transactionDate: "2025-08-23T10:00:00Z",
    description: "통화 변환 시도"
  }) {
    success
    message
  }
}
```

#### 에러 응답
```json
{
  "errors": [
    {
      "message": "서로 다른 통화 간에는 이체할 수 없습니다.",
      "extensions": {
        "code": "VALIDATION_ERROR"
      }
    }
  ]
}
```

## 인증 및 권한

### 헤더 설정
```http
Authorization: Bearer {JWT_TOKEN}
```

### 권한 규칙
- **일반 사용자**: 본인 소유 계좌 간 이체만 가능
- **ADMIN**: 모든 계좌 간 이체 가능
- 출금 계좌와 입금 계좌 모두 사용자가 소유해야 함

## 주의사항

1. **트랜잭션 보장**: 모든 이체 작업은 DB 트랜잭션으로 처리되어 원자성이 보장됩니다.
2. **실시간 잔액 확인**: 이체 전 실시간으로 잔액을 확인하므로 동시 이체 시에도 안전합니다.
3. **CASH 타입 확인**: Stock/Coin 계좌는 반드시 `type=CASH`인 Summary가 있어야 합니다.
4. **소수점 처리**: 금액은 Decimal 타입으로 처리되어 정확한 계산이 보장됩니다.
5. **이체 기록**: 모든 이체는 양쪽 계좌에 트랜잭션으로 기록됩니다.
6. **통화 일치 필수**: 이체는 반드시 같은 통화 간에만 가능합니다 (KRW↔KRW, USD↔USD 등).

## 구현 체크리스트 (프론트엔드)

- [ ] JWT 토큰 헤더 설정
- [ ] 계좌 목록 조회 API 연동
- [ ] 통화별 계좌 조회 API 연동 (accountsByCurrency)
- [ ] 잔액 확인 로직
- [ ] 이체 가능 계좌 필터링 (CASH 타입, 동일 통화)
- [ ] 에러 메시지 처리
- [ ] 성공 시 잔액 갱신
- [ ] 트랜잭션 히스토리 표시

## 관련 API

- `accounts`: 계좌 목록 조회
- `accountsByCurrency`: 통화별 계좌 목록 및 잔액 조회
- `bankSummary`: 은행 계좌 잔액 조회
- `stockSummaries`: 주식 계좌 CASH 잔액 조회
- `coinSummaries`: 코인 계좌 CASH 잔액 조회
- `bankTransactions`: 은행 거래 내역
- `stockTransactions`: 주식 거래 내역
- `coinTransactions`: 코인 거래 내역

## 문의사항

이체 관련 추가 기능이나 문의사항은 백엔드 팀에 문의해주세요.