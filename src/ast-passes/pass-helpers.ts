import * as acorn from 'acorn'
import * as walk from 'acorn-walk'
type ANode = acorn.Node

export function is_identifier(node: any): boolean {
    return node.type === 'Identifier'
}


export function get_infect_function(alias_symbols: Set<string>, infect_nodes: Set<ANode>): (node: ANode) => boolean {
    return (node: ANode) => {
        let is_target_id = is_identifier(node) && alias_symbols.has((node as any).name as string)
        return infect_nodes.has(node) || is_target_id
    }
}

export const findsFunctionCall = (ast: any, targetFunctions: Set<string>) => {
    // first pass, find http and its alias

    let infected_nodes = new Set<ANode>()
    let is_infected = get_infect_function(targetFunctions, infected_nodes)
    walk.simple(ast, {
        Identifier(node: acorn.Node) {
            let id = node as any
            if (targetFunctions.has(id.name as string)) {
                infected_nodes.add(node)
            }
        },
        VariableDeclarator(node: any) {
            let decl = node as any
            if (decl.id.type as string === 'Identifier') {
                if (is_infected(decl.init as ANode)) {
                    targetFunctions.add(decl.id.name)
                }
            }
        },
        AssignmentExpression(node: any) {
            let expr = node as any
            if (expr.left.type as string === 'Identifier') {
                if (is_infected(expr.right as ANode)) {
                    targetFunctions.add(expr.left.name)
                }
            }
        },
        ArrayExpression(node: acorn.Node) {
            // array expr can be infected by its elements
            let expr = node as any
            let elements = expr.elements as Array<ANode>
            if (elements.some((v) => { return infected_nodes.has(v) })) {
                infected_nodes.add(node)
            }
        },
        MemberExpression(node: acorn.Node) {
            let expr = node as any
            let callee = expr.object
            let member = expr.property
            if (infected_nodes.has(member) || infected_nodes.has(callee)) {
                infected_nodes.add(node)
            }
        },
        ObjectExpression(node: acorn.Node) {
            let expr = node as any
            let fields = expr.properties as Array<ANode>
            if (fields.some((v) => { return infected_nodes.has(v) })) {
                infected_nodes.add(node)
            }
        },
        Property(node: acorn.Node) {
            let expr = node as any
            if (is_infected(expr.value)) {
                infected_nodes.add(node)
            }
        }
    })
    return infected_nodes
}