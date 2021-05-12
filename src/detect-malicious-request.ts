import * as acorn from 'acorn'
import * as walk from 'acorn-walk'

import git from "isomorphic-git";
import fs from "fs";
import http from "isomorphic-git/http/node";
import path from "path";
import * as passes from "./ast-passes/detect-data-exchange";
import { findPowerfulFunctions } from "./ast-passes/detect-command-injection";
import { foldConstant } from "./ast-passes/string-const-folding";
import { markEncodedString } from "./ast-passes/detect-encoded-string";
import { removeShebang } from "./utils/remove-shebang";
import chalk from 'chalk';
type ANode = acorn.Node

const dir = path.join(process.cwd(), "scan-dependency");

const maxReportStringLength = 100;
let foundRisk = false
//
const pathOffset = process.cwd().length + "/scan-dependency/".length

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
      const flag = isMaliciousHttpRequest(code, moduleName, fileDir.substring(pathOffset));
      // if (flag) {
      //   console.log(`- ${moduleName} found potentially malicious http request`);
      // }
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
  await exec('npm install --prefix scan-dependency --loglevel=error 2> /dev/null').stderr.pipe(process.stderr);
  console.log(chalk.bgYellowBright('Malicious Code Scan:'));

  const nodeModulesDir = path.join(process.cwd(), "scan-dependency/node_modules");
  fs.readdirSync(nodeModulesDir)
    .filter(s => fs.statSync(`${nodeModulesDir}/${s}`).isDirectory())
    .forEach(moduleName => {
      const moduleDir = path.join(process.cwd(), `scan-dependency/node_modules/${moduleName}`);
      dirWalk(moduleDir, done(moduleName));
  })
  if (!foundRisk) {
    console.log(chalk.bgRedBright("not risk found"))
  }
  // fs.rmdirSync("scan-dependency", { recursive: true });
}

export const detectRisk = (code: any, moduleName: string, fileDir: string) => {
  let ast = null
  try {
    code = removeShebang(code)
    ast = acorn.parse(code, { sourceType: "module", ecmaVersion: 2020 })
  } catch (e) {
    // console.log(`path: ${fileDir}`)
    // console.log(e)
    // console.log(code)
    return
  }

  // console.log('about to foldConstant')
  try {
    foldConstant(ast)
  } catch (e) {
    // console.log(e)
    // return
  }

  // console.log('about to markEncodedString')
  markEncodedString(ast)
  // console.log('about to findExistsDataExchange')
  let malicious_req_call_nodes = passes.findExistsDataExchange(ast)
  // console.log('about to findPowerfulFunctions')
  let powerful_function_nodes = findPowerfulFunctions(ast)

  // detect combination of data exchange & powerful function & encoded string
  let found_powerful_function_node= new Set<ANode>()

  malicious_req_call_nodes.forEach(req_node => {
    let has_powerful_function = false
    let has_encoded_string = false
    let detect_risk = false
    let report_string = null
    walk.full(req_node, (node:any) => {
      if (powerful_function_nodes.has(node)) {
        has_powerful_function = true
        found_powerful_function_node.add(node)
      }
      if (node.isEncodedString) {
        has_encoded_string = true
        // found_encoded_string_node.add(node)
      }
    })
    if (has_encoded_string && has_powerful_function) {
      report_string = "Found data exchange & powerful function & encoded string"
    } else if (has_encoded_string){
      report_string = "Found data exchange & encoded string"
    } else if (has_powerful_function) {
      report_string = "Found data exchange & powerful function"
    } else {
      report_string = "Found data exchange"
    }
    if (report_string) {
      console.log(`- ${report_string} in ${fileDir}:`)
      const report_source = code.substring(req_node.start, req_node.end)
      if (report_source.length > maxReportStringLength) {
        console.log(report_source.substring(0, maxReportStringLength) + "...")
      } else {
        console.log(report_source.substring(0, maxReportStringLength))
      }
    }
  })
  // detect powerful function & encoded string and not appear in http request
  powerful_function_nodes.forEach(func_node => {
    // console.log(func_node)
    let has_encoded_string = false
    let report_string = ""
    if (found_powerful_function_node.has(func_node)) {
      return
    }
    walk.full(func_node, (node:any) => {
      if (node.isEncodedString) {
        has_encoded_string = true
      }
    })
    if (has_encoded_string) {
      report_string = "Found powerful function & encoded string"
    } else {
      report_string = "Found powerful function"
    }
    if (report_string) {
      console.log(`- ${report_string} in ${fileDir}:`)
      const report_source = code.substring(func_node.start, func_node.end)
      if (report_source.length > maxReportStringLength) {
        console.log(report_source.substring(0, maxReportStringLength) + "...")
      } else {
        console.log(report_source.substring(0, maxReportStringLength))
      }
    }
  })
  // console.log("==================")

  // walk.full(ast, node => {
  //   console.log(node)
  // })

  return malicious_req_call_nodes.size > 0 || powerful_function_nodes.size > 0;
}

function isMaliciousHttpRequest(code: string, moduleName: string, fileDir: string): boolean {

  /**
   * i dont think there is any elegant solution to the case of w
   * unless we interprete the program i.e. almost run the program
   */

  if (detectRisk(code, moduleName, fileDir)) {
    foundRisk = true
    return true
  } else {
    // console.log(`Found no risk in ${moduleName}`)
    return false
  }
}

// export { isMaliciousHttpRequest }
