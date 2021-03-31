import * as acorn from 'acorn'
import * as walk from 'acorn-walk'
import { is_valid_url } from './utils/str_utils'
import git from "isomorphic-git";
import fs from "fs";
import http from "isomorphic-git/http/node";
import path from "path";
type ANode = acorn.Node

const dir = path.join(process.cwd(), "scan-dependency");

type doneType = (error: any, results: string []) => void

const dirWalk = function(dir: string, done: doneType) {
  var results: string[] = [];
  fs.readdir(dir, function(err: any, list) {
    if (err) return done(err, []);
    var pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(function(file) {
      file = path.resolve(dir, file);
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          dirWalk(file, function(err, res) {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          results.push(file);
          if (!--pending) done(null, results);
        }
      });
    });
  });
};

const done = (moduleName: string) => {
  return  (error: any, results: string []) => {
    if (error) {
      console.log(error);
      return;
    }
    results.filter(s => s.endsWith('.js')).forEach(fileDir => {
      const buf = fs.readFileSync(fileDir);
      const code = buf.toString();
      const flag = isMaliciousHttpRequest(code);
      if (flag) {
        console.log(`- ${moduleName} found potentially malicious http request`);
      }
    })
  }
}

export const scanDependency = async (
  owner: string,
  repoName: string
) => {
  const repoPath = `https://github.com/${owner}/${repoName}`;
  await git.clone({fs, http, dir, url: repoPath});
  let exec = require('child_process').exec;
  exec('npm install --prefix scan-dependency').stderr.pipe(process.stderr);
  console.log('Malicious Network Request Scan:');

  const nodeModulesDir = path.join(process.cwd(), "scan-dependency/node_modules");
  fs.readdirSync(nodeModulesDir)
    .filter(s => fs.statSync(`${nodeModulesDir}/${s}`).isDirectory())
    .forEach(moduleName => {
      const moduleDir = path.join(process.cwd(), `scan-dependency/node_modules/${moduleName}`);
      dirWalk(moduleDir, done(moduleName));
  })
}

function isMaliciousHttpRequest(code: string): boolean {

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
    Identifier(node: acorn.Node) {
      let id = node as any
      if (http_alias_symbols.has(id.name as string)) {
        http_infected_nodes.add(node)
      }
    },
    VariableDeclarator(node: any) {
      let decl = node as any
      if (decl.id.type as string === 'Identifier') {
        if (is_infected(decl.init as ANode)) {
          http_alias_symbols.add(decl.id.name)
        }
      }
    },
    AssignmentExpression(node: any) {
      let expr = node as any
      if (expr.left.type as string === 'Identifier') {
        if (is_infected(expr.right as ANode)) {
          http_alias_symbols.add(expr.left.name)
        }
      }
    },
    ArrayExpression(node: acorn.Node) {
      // array expr can be infected by its elements
      let expr = node as any
      let elements = expr.elements as Array<ANode>
      if (elements.some((v) => { return http_infected_nodes.has(v) })) {
        http_infected_nodes.add(node)
      }
    },
    MemberExpression(node: acorn.Node) {
      let expr = node as any
      let callee = expr.object
      let member = expr.property
      if (http_infected_nodes.has(member) || http_infected_nodes.has(callee)) {
        http_infected_nodes.add(node)
      }
    },
    ObjectExpression(node: acorn.Node) {
      let expr = node as any
      let fields = expr.properties as Array<ANode>
      if (fields.some((v) => { return http_infected_nodes.has(v) })) {
        http_infected_nodes.add(node)
      }
    },
    Property(node: acorn.Node) {
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
    Identifier(node: acorn.Node) {
      let id = node as any
      if (func_alias_symbols.has(id.name as string)) {
        func_infected_nodes.add(node)
      }
    },
    VariableDeclarator(node: any) {
      let decl = node as any
      if (decl.id.type as string === 'Identifier') {
        if (is_infected(decl.init as ANode)) {
          func_alias_symbols.add(decl.id.name)
        }
      }
    },
    AssignmentExpression(node: any) {
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

export { isMaliciousHttpRequest }
