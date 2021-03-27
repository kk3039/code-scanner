import * as acorn from 'acorn'
function is_malicious_http_request(code: string): boolean {
  const ast = acorn.parse(code, { ecmaVersion: 2020, locations: true });
  return false;
}

export { is_malicious_http_request }