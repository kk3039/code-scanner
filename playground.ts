import * as acorn from 'acorn'
import * as walk from 'acorn-walk'
import {foldConstant} from './src/utils/string-const-folding'

const code = `
var x = () => {2}
var y = x()
`

const ast = acorn.parse(code, {ecmaVersion: "latest"}) as any
foldConstant(ast)
walk.full(ast, node => {
    console.log(node)
})
