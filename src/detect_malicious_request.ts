import * as acorn from 'acorn'
import * as walk from 'acorn-walk'
import { is_valid_url } from './utils/str_utils'
type ANode = acorn.Node
function is_malicious_http_request(code: string): boolean {

  /**
   * i dont think there is any elegant solution to the case of w
   * unless we interprete the program i.e. almost run the program
   */
  let ast = acorn.parse(code, { ecmaVersion: 2020 })

  function is_identifier(node: any): boolean {
    return node.type === 'Identifier'
  }

  function get_infect_function(alias_symbols: Set<string>, infect_nodes: Set<ANode>): (node: ANode) => boolean {
    return (node: ANode) => {
      let is_target_id = is_identifier(node) && alias_symbols.has((node as any).name as string)
      return infect_nodes.has(node) || is_target_id
    }
  }

  // first pass, find http and its alias
  let http_infected_nodes = new Set<ANode>()
  let http_alias_symbols = new Set<string>(['http', 'https', 'http2', 'axios'])
  let is_infected = get_infect_function(http_alias_symbols, http_infected_nodes)
  walk.simple(ast, {
    Identifier(node) {
      let id = node as any
      if (http_alias_symbols.has(id.name as string)) {
        http_infected_nodes.add(node)
      }
    },
    VariableDeclarator(node) {
      let decl = node as any
      if (decl.id.type as string === 'Identifier') {
        if (is_infected(decl.init as ANode)) {
          http_alias_symbols.add(decl.id.name)
        }
      }
    },
    AssignmentExpression(node) {
      let expr = node as any
      if (expr.left.type as string === 'Identifier') {
        if (is_infected(expr.right as ANode)) {
          http_alias_symbols.add(expr.left.name)
        }
      }
    },
    ArrayExpression(node) {
      // array expr can be infected by its elements
      let expr = node as any
      let elements = expr.elements as Array<ANode>
      if (elements.some((v) => { return http_infected_nodes.has(v) })) {
        http_infected_nodes.add(node)
      }
    },
    MemberExpression(node) {
      let expr = node as any
      let callee = expr.object
      let member = expr.property
      if (http_infected_nodes.has(member) || http_infected_nodes.has(callee)) {
        http_infected_nodes.add(node)
      }
    },
    ObjectExpression(node) {
      let expr = node as any
      let fields = expr.properties as Array<ANode>
      if (fields.some((v) => { return http_infected_nodes.has(v) })) {
        http_infected_nodes.add(node)
      }
    },
    Property(node) {
      let expr = node as any
      if (is_infected(expr.value)) {
        http_infected_nodes.add(node)
      }
    }
  })

  let func_alias_symbols = new Set<string>()
  let func_infected_nodes = new Set<ANode>(http_infected_nodes)
  let target_func = new Set<string>(['get', 'post', 'request', 'option', 'put', 'delete'])
  is_infected = get_infect_function(func_alias_symbols, func_infected_nodes)

  function is_target_function_call(node: ANode): boolean {
    if (node === null) {
      return false;
    } else {
      return is_identifier(node) && target_func.has((node as any).name)
    }
  }

  walk.simple(ast, {
    Identifier(node) {
      let id = node as any
      if (func_alias_symbols.has(id.name as string)) {
        func_infected_nodes.add(node)
      }
    },
    VariableDeclarator(node) {
      let decl = node as any
      if (decl.id.type as string === 'Identifier') {
        if (is_infected(decl.init as ANode)) {
          func_alias_symbols.add(decl.id.name)
        }
      }
    },
    AssignmentExpression(node) {
      let expr = node as any
      if (expr.left.type as string === 'Identifier') {
        if (is_infected(expr.right as ANode)) {
          func_alias_symbols.add(expr.left.name)
        }
      }
    },
    MemberExpression(node) {
      let expr = node as any
      let callee = expr.object
      let member = expr.property
      let is_callee_suspect_node = func_infected_nodes.has(callee) || http_infected_nodes.has(callee)
      if (is_callee_suspect_node && is_target_function_call(member)) {
        func_infected_nodes.add(node)
      }
    },
    ArrayExpression(node) {
      // array expr can be infected by its elements
      let expr = node as any
      let elements = expr.elements as Array<ANode>
      if (elements.some((v) => { return func_infected_nodes.has(v) })) {
        func_infected_nodes.add(node)
      }
    },
  })

  let str_alias = new Set<string>()
  let str_nodes = new Set<ANode>()

  is_infected = get_infect_function(str_alias, str_nodes)
  // TODO, further detail string alias (just like http)
  walk.simple(ast, {
    TemplateElement(node) {
      let temp = node as any
      if (is_valid_url(String(temp.raw)) || is_valid_url(String(temp.cooked))) {
        str_nodes.add(node)
      }
    },
    Literal(node) {
      let literal = node as any
      if (is_valid_url(String(literal.value))) {
        str_nodes.add(node)
      }
    },
    Identifier(node) {
      let id = node as any
      if (str_alias.has(id.name as string)) {
        str_nodes.add(node)
      }
    },
    VariableDeclarator(node) {
      let decl = node as any
      if (decl.id.type as string === 'Identifier') {
        if (is_infected(decl.init as ANode)) {
          str_alias.add(decl.id.name)
        }
      }
    },
    AssignmentExpression(node) {
      let expr = node as any
      if (expr.left.type as string === 'Identifier') {
        if (is_infected(expr.right as ANode)) {
          str_alias.add(expr.left.name)
        }
      }
    },
    ObjectExpression(node) {
      let expr = node as any
      let fields = expr.properties as Array<ANode>
      if (fields.some((v) => { return str_nodes.has(v) })) {
        str_nodes.add(node)
      }
    },
    Property(node) {
      let expr = node as any
      if (is_infected(expr.value)) {
        str_nodes.add(node)
      }
    }
  })

  // find possible calling
  let malicious_req_call = new Set<ANode>()
  walk.simple(ast, {
    CallExpression(node) {
      let expr = node as any
      let callee = expr.callee
      let argList = expr.arguments as Array<ANode>
      if (func_infected_nodes.has(callee) && argList.some(arg => str_nodes.has(arg))) {
        // find possible malicious request
        malicious_req_call.add(node)
      }
    }
  })

  return malicious_req_call.size > 0
}

export { is_malicious_http_request }