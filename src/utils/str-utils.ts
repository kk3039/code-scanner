const linkify = require('linkifyjs')
function is_valid_url(url: any): boolean {
  if (url && typeof url === "string") {
    return linkify.test(url)
  }
    return false
}

export {is_valid_url}
