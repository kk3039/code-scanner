import * as acorn from 'acorn'
import * as walk from 'acorn-walk'
import { intersection, map } from 'lodash';
import {foldConstant} from './src/utils/string-const-folding'

const code = `
var a = {}
a.b = (x) => {
    return x+1
}
a.b(2)
`

// eval/exec => dangerous function powerful api
// http.get && eval => backdoor
// http.get => possible network connection with 'url'
// ..... && string is encoded => highly possible backdoor with unknown encoded string


const ast = acorn.parse(code, {ecmaVersion: "latest"}) as any
foldConstant(ast)
walk.full(ast, node => {
    console.log(node)
})
