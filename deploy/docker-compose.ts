import * as shell from "shelljs"
import { col } from "./shell.color"

const imageBuild = async () => {
  const title = "Aip Project Docker Compose"
  const dockerPath = "docker-compose.yml"

  shell.echo(`${col.fgMagenta(String(`${title} Init 🏖`))}\n`)

  shell.echo(`${col.fgCyan(String(`${title}`))} 🚀 NestJs Build\n`)

  const nestCommand = "yarn build"

  const nestResult = shell.exec(nestCommand)

  if (nestResult.code !== 0) {
    shell.echo(`${col.fgRed(String(title))} 🚨 NestJs Build failed\n`)
    return
  }
  shell.echo(`${col.fgGreen(String(`${title}`))} 🌝 NestJs Build Success\n`)

  const buildCommand = `docker-compose -f ${dockerPath} build`

  const buildResult = shell.exec(buildCommand)

  if (buildResult.code !== 0) {
    shell.echo(`${col.fgRed(String(title))} 🚨 Docker Compose Build failed\n`)
    return
  }
  shell.echo(`${col.fgGreen(String(`${title}`))} 🌝 Docker Compose Build Success\n`)

  const executeCommand = `docker-compose -f ${dockerPath} up -d`

  const executeResult = shell.exec(executeCommand)

  if (executeResult.code !== 0) {
    shell.echo(`${col.fgRed(String(title))} 🚨 Docker Compose Up failed\n`)
    return
  }
  shell.echo(`${col.fgGreen(String(`${title}`))} 🌝 Docker Compose Up Success\n`)
}

imageBuild().then(() => shell.echo(`${col.fgMagenta(String("Docker Compose Done 🏖️"))}\n`))
