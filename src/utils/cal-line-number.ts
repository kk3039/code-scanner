export const calLineNumber = (code: string, startLocation: number) => {
  let line = 0;
  for (var i = 0; i < code.length; i++) {
    const c = code.charAt(i)
    if (c === '\n') {
      line += 1
    }
    if (startLocation === i) {
      return line
    }
  }
  return -1
}
