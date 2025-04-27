import { registerEnumType } from "@nestjs/graphql"

export enum UserState {
  ACTIVE = "ACTIVE", // 활성 상태
  INACTIVE = "INACTIVE", // 비활성 상태
  PENDING = "PENDING", // 이메일 인증 대기 등 가입 승인 대기
  SUSPENDED = "SUSPENDED", // 일시 정지
  BANNED = "BANNED", // 영구 정지
  DORMANT = "DORMANT", // 휴면 계정
  DELETED = "DELETED", // 탈퇴/삭제된 계정
}

registerEnumType(UserState, {
  name: "UserState", // GraphQL 스키마에서 사용될 이름
})
