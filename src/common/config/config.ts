import type { ConfigType } from "./config.interface"
import * as path from "node:path"
import * as fs from "node:fs"

const loadSecretFromFile = (filename: string): string | undefined => {
  const keyPath = path.resolve(__dirname, "../../../../deploy/keys", filename)
  try {
    if (fs.existsSync(keyPath)) {
      return fs.readFileSync(keyPath, "utf8").trim()
    }
  } catch (error) {
    console.warn(`파일에서 시크릿을 로드할 수 없습니다: ${filename}`)
  }
  return undefined
}

export default (): ConfigType => ({
  nest: {
    port: parseInt(process.env.PORT!, 10) || 3100,
    environment: process.env.NEST_ENVIRONMENT,
  },
  security: {
    jwtAccessPrivateKey: process.env.JWT_ACCESS_PRIVATE_KEY,
    jwtAccessPublicKey: process.env.JWT_ACCESS_PUBLIC_KEY,
    jwtRefreshPrivateKey: process.env.JWT_REFRESH_PRIVATE_KEY,
    jwtRefreshPublicKey: process.env.JWT_REFRESH_PUBLIC_KEY,
    cryptoAlgorithm: process.env.CRYPTO_ALGORITHM,
    cryptoSecretKey: process.env.CRYPTO_SECRET_KEY,
    cryptoIv: process.env.CRYPTO_IV,
    jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  },
  database: {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT!, 10) || 5432,
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    name: process.env.DATABASE_NAME,
    synchronize: process.env.DATABASE_SYNCHRONIZE === "true",
  },
  interface: {
    stockSearchApiUrl: process.env.STOCK_SEARCH_API_URL,
    stockInfoApiUrl: process.env.STOCK_INFO_API_URL,
    stockPriceApiUrl: process.env.STOCK_PRICE_API_URL,
    coinMarketCapApiKey: process.env.COIN_MARKET_CAP_API_KEY || loadSecretFromFile("coin-market-cap.key"),
    // coinInfoApiUrl: process.env.COIN_INFO_API_URL,
    coinPriceApiUrl: process.env.COIN_PRICE_API_URL,
    exchangeRateApiKey: process.env.EXCHANGE_RATE_API_KEY || loadSecretFromFile("open-exchange-rate.key"),
    // coinInfoApiUrl: process.env.COIN_INFO_API_URL,
    exchangeRateApiUrl: process.env.EXCHANGE_RATE_API_URL,
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT!, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
    tls: process.env.REDIS_TLS === "true",
  },
})
