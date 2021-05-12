export const removeShebang = (code: string) => {
  let firstNewLineIndex = code.indexOf('\n')
  let firstHash = code.indexOf('#!')
  if (firstNewLineIndex >= 0 && firstHash >= 0 && firstHash < firstNewLineIndex) {
    return code.substring(firstNewLineIndex)
  } else {
    return code
  }
}
