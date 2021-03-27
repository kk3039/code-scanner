import {is_malicious_http_request} from '../src/detect_malicious_request'
import fs from 'fs'

describe("This is a simple test", () => {
  test("Check the sampleFunction function", () => {
    const buf = fs.readFileSync('./test/sample_code/malicious_request_1.js')
    const code = buf.toString;
    console.log(code)
    expect(is_malicious_http_request("hello")).toBeFalsy()
  });
});

