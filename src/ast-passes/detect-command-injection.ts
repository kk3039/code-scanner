import * as acorn from 'acorn'
import { findsFunctionCall, get_infect_function, is_identifier } from './pass-helpers'
type ANode = acorn.Node

export const findPowerfulFunctions = (ast: any) =>{
    let infected_nodes = new Set<ANode>()
    let alias_symbols = new Set<string>(['eval','exec'])
    infected_nodes = findsFunctionCall(ast, alias_symbols)
}