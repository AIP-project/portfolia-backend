import * as shell from "shelljs"
import { TargetStage } from "./config"
import { col } from "./shell.color"
import { getCommonEnv } from "./util"

const imageDeploy = async () => {
  const stage = process.argv[2] as TargetStage
  const title = "Aip Project Backend Image Deploy"
  const { imageName, artifactUrl } = getCommonEnv(stage)

  if (!stage) {
    shell.echo(`${col.fgRed(String(title))} 🚨 Stage is not defined\n`)
    process.exit(1) // 오류 발생 시 프로세스 종료 및 오류 코드 반환
  }

  shell.echo(`${col.fgMagenta(String(`[${stage}] ${title} Init 🏖`))}\n`)

  const buildCommand = `yarn docker:build ${stage} ${imageName}`

  const buildResult = shell.exec(buildCommand)

  if (buildResult.code !== 0) {
    shell.echo(`${col.fgRed(String(title))} 🚨 NestJs Build failed\n`)
    process.exit(1) // 오류 발생 시 프로세스 종료 및 오류 코드 반환
  }

  const dockerTagCommand = `docker tag ${imageName} ${artifactUrl}`

  shell.echo(`${col.fgYellow(`📃 ${dockerTagCommand}`)}\n`)

  const dockerTagResult = shell.exec(dockerTagCommand)

  if (dockerTagResult.code !== 0) {
    shell.echo(`${col.fgRed(String(title))} 🚨Docker Tag failed\n`)
    process.exit(1) // 오류 발생 시 프로세스 종료 및 오류 코드 반환
  }

  const dockerPushCommand = `docker push ${artifactUrl}`

  shell.echo(`${col.fgYellow(`📃 ${dockerPushCommand}`)}\n`)

  const dockerPushResult = shell.exec(dockerPushCommand)

  if (dockerPushResult.code !== 0) {
    shell.echo(`${col.fgRed(String(title))} 🚨 Docker Gcp Push Login failed\n`)
    process.exit(1) // 오류 발생 시 프로세스 종료 및 오류 코드 반환
  }
}

imageDeploy().then(() => shell.echo(`${col.fgMagenta(String("Image Deploy Done 🏖️"))}\n`))
