import * as shell from "shelljs"
import { TargetStage } from "./config"
import { col } from "./shell.color"
import * as path from "path"
import { getCommonEnv } from "./util"

const terraformDeploy = async () => {
  const stage = process.argv[2] as TargetStage
  const title = "Aip Project Backend Service Deploy"

  if (!stage) {
    shell.echo(`${col.fgRed(String(title))} 🚨 Stage is not defined\n`)
    process.exit(1) // 오류 발생 시 프로세스 종료 및 오류 코드 반환
  }

  const terraformDir = path.join(__dirname, "./terraform")

  shell.echo(`${col.fgMagenta(String(`[${stage}] ${title} Init 🏖`))}\n`)

  const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (!credentials) {
    // 환경변수가 없을 경우 기본 키 파일의 절대 경로 설정
    const keyPath = path.resolve(__dirname, "./keys/gcp-depoly-key.json")

    // 키 파일 존재 여부 확인
    if (!shell.test("-f", keyPath)) {
      shell.echo(`${col.fgRed(String(title))} 🚨 GCP credentials file not found at ${keyPath}\n`)
      process.exit(1) // 오류 발생 시 프로세스 종료 및 오류 코드 반환
    }

    process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath
  }

  // -chdir 옵션 사용
  const initResult = shell.exec(`terraform -chdir=${terraformDir} init -backend-config=${stage}.hcl`)
  if (initResult.code !== 0) {
    shell.echo(`${col.fgRed(String(title))} 🚨 Terraform initialization failed\n`)
    process.exit(1) // 오류 발생 시 프로세스 종료 및 오류 코드 반환
  }

  let applyCommand = `terraform -chdir=${terraformDir} apply -auto-approve `

  const { artifactUrl, gcpProjectId, gcpRegion } = getCommonEnv(stage)
  for (const [key, value] of Object.entries({ artifactUrl, gcpProjectId, gcpRegion })) {
    applyCommand += `-var="${key}=${value}" `
  }

  applyCommand += `-var="stage=${stage}"`

  shell.echo(`${col.fgYellow(`📃 ${applyCommand}`)}\n`)
  const applyResult = shell.exec(applyCommand)
  // const applyResult = shell.exec(`terraform -chdir=${terraformDir} destroy -auto-approve -var="stage=${stage}"`)

  if (applyResult.code === 0) {
    shell.echo(`${col.fgGreen(String(`${stage} 환경 배포 완료! 🚀`))}`)
  } else {
    shell.echo(`${col.fgRed(String(`${stage} 환경 배포 실패 😢`))}`)
    process.exit(1) // 오류 발생 시 프로세스 종료 및 오류 코드 반환
  }
}

terraformDeploy().then(() => shell.echo(`${col.fgMagenta(String("Service Deploy Done 🏖️"))}\n`))
