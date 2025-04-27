import { Injectable, Logger } from "@nestjs/common"
import { Redis } from "ioredis"
import { InjectRedis } from "@nestjs-modules/ioredis"

@Injectable()
export class DistributeLockService {
  private readonly logger = new Logger(DistributeLockService.name)
  private readonly redis: Redis

  constructor(@InjectRedis() redis: Redis) {
    this.redis = redis
    this.logger.debug(`Redis connection options: ${JSON.stringify(redis.options)}`)
  }

  async acquireLock(key: string, ttlSeconds: number, maxRetries = 3, retryDelayMs = 1000): Promise<boolean> {
    let retries = 0
    // 해시 태그 사용 - 같은 슬롯에 배치하기 위함
    const lockKey = `{lock}:${key}`
    const lockValue = Date.now().toString() // 현재 시간을 값으로 사용

    // 락 획득을 위한 Lua 스크립트
    const acquireLockScript = `
      if redis.call('exists', KEYS[1]) == 0 then
        return redis.call('setex', KEYS[1], ARGV[1], ARGV[2])
      end
      return nil
    `

    while (retries < maxRetries) {
      try {
        // Lua 스크립트 실행: lockKey, ttlSeconds, lockValue를 인자로 전달
        const result = await this.redis.eval(
          acquireLockScript,
          1, // 키 개수
          lockKey, // KEYS[1]
          ttlSeconds, // ARGV[1]
          lockValue, // ARGV[2]
        )

        if (result) {
          this.logger.debug(`Successfully acquired lock: ${key}`)
          return true
        }

        this.logger.debug(`Failed to acquire lock: ${key}, attempt ${retries + 1} of ${maxRetries}`)
      } catch (error) {
        this.logger.debug(`Error acquiring lock: ${key}`, error.message)

        // 클러스터 관련 오류인 경우 특별 처리
        if (error.message && error.message.includes("CROSSSLOT")) {
          this.logger.error(`Redis cluster CROSSSLOT error. Keys must be in the same hash slot.`)
        }

        // 마지막 재시도가 아니면 계속 진행
        if (retries === maxRetries - 1) {
          throw error
        }
      }

      retries++
      if (retries < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
      }
    }

    this.logger.debug(`Failed to acquire lock: ${key} after ${maxRetries} attempts`)
    return false
  }

  async releaseLock(key: string): Promise<boolean> {
    // 해시 태그를 사용하여 락 키 생성
    const lockKey = `{lock}:${key}`

    try {
      const result = await this.redis.del(lockKey)

      const lockReleased = result === 1

      if (lockReleased) {
        this.logger.debug(`Successfully released lock: ${key}`)
        return true
      }

      this.logger.debug(`Failed to release lock: ${key}, lock not found or already released`)
      return false
    } catch (error) {
      this.logger.error(`Error releasing lock: ${key}`, error)
      return false
    }
  }
}
