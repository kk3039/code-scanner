const linkify = require('linkifyjs')
function is_valid_url(url: string): boolean {
  return linkify.test(url)
}

export {is_valid_url}