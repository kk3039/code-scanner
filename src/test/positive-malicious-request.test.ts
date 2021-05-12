import { isMaliciousHttpRequest } from '../detect-malicious-request'
import fs from 'fs'

const sample_code_dir = './src/test/sample-code'

fs.readdirSync(sample_code_dir)
  .filter(s => s.startsWith('malicious-request'))
  .filter(s => fs.statSync(`${sample_code_dir}/${s}`).isFile())
  .forEach(filename => {
    describe(`[${filename}] should be detected as malicious`, () => {
      test("is_malicious_request should return true", () => {
        const buf = fs.readFileSync(`${sample_code_dir}/${filename}`);
        const code = buf.toString();
        expect(isMaliciousHttpRequest(code)).toBeTruthy();
      });
    });
})


