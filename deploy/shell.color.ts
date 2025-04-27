const colorRef = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",

  fgBlack: "\x1b[30m",
  fgRed: "\x1b[31m",
  fgGreen: "\x1b[32m",
  fgYellow: "\x1b[33m",
  fgBlue: "\x1b[34m",
  fgMagenta: "\x1b[35m",
  fgCyan: "\x1b[36m",
  fgWhite: "\x1b[37m",

  bgBlack: "\x1b[40m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
  bgWhite: "\x1b[47m",
}

const colored = (color: string, text: string) => {
  return `${color}${text}${colorRef.reset}`
}

export const col = {
  reset: (text: string) => colored(colorRef.reset, text),
  bright: (text: string) => colored(colorRef.bright, text),
  dim: (text: string) => colored(colorRef.dim, text),
  underscore: (text: string) => colored(colorRef.underscore, text),
  blink: (text: string) => colored(colorRef.blink, text),
  reverse: (text: string) => colored(colorRef.reverse, text),
  hidden: (text: string) => colored(colorRef.hidden, text),
  fgBlack: (text: string) => colored(colorRef.fgBlack, text),
  fgRed: (text: string) => colored(colorRef.fgRed, text),
  fgGreen: (text: string) => colored(colorRef.fgGreen, text),
  fgYellow: (text: string) => colored(colorRef.fgYellow, text),
  fgBlue: (text: string) => colored(colorRef.fgBlue, text),
  fgMagenta: (text: string) => colored(colorRef.fgMagenta, text),
  fgCyan: (text: string) => colored(colorRef.fgCyan, text),
  fgWhite: (text: string) => colored(colorRef.fgWhite, text),
  bgBlack: (text: string) => colored(colorRef.bgBlack, text),
  bgRed: (text: string) => colored(colorRef.bgRed, text),
  bgGreen: (text: string) => colored(colorRef.bgGreen, text),
  bgYellow: (text: string) => colored(colorRef.bgYellow, text),
  bgBlue: (text: string) => colored(colorRef.bgBlue, text),
  bgMagenta: (text: string) => colored(colorRef.bgMagenta, text),
  bgCyan: (text: string) => colored(colorRef.bgCyan, text),
  bgWhite: (text: string) => colored(colorRef.bgWhite, text),
}
