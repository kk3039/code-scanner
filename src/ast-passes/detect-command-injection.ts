import * as acorn from 'acorn'
import { findsFunctionCall, get_infect_function, is_identifier } from './pass-helpers'
import * as walk from "acorn-walk";
type ANode = acorn.Node

const findCallNode = (ast: any, infected_nodes: any) => {
    let call_nodes = new Set<ANode>()

    walk.simple(ast, {
        CallExpression(node) {
            let expr = node as any
            let callee = expr.callee
            let argList = expr.arguments as Array<ANode>
            if (infected_nodes.has(callee) && argList.length > 0) {
                // find possible malicious request
                call_nodes.add(node)
            }
        }
    })
    return call_nodes
}

export const findPowerfulFunctions = (ast: any) =>{
    let infected_nodes = new Set<ANode>()
    let alias_symbols = new Set<string>(['eval','exec'])
    infected_nodes = findsFunctionCall(ast, alias_symbols)
    return findCallNode(ast, infected_nodes)
}
