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
import { calLineNumber } from "./utils/cal-line-number";
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
  let list = fs.readdirSync(dir)
  let pending = list.length;
  if (!pending) return done(null, results);
  list.forEach(function(file) {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file)
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
};

const done = (moduleName: string) => {
  return  (error: any, results: string []) => {
    if (error) {
      // console.log(error);
      return;
    }
    results.filter(s => s.endsWith('.js')).forEach(fileDir => {
      const buf = fs.readFileSync(fileDir);
      const code = buf.toString();
      const flag = isMaliciousHttpRequest(code, moduleName, fileDir.substring(pathOffset));
    })
  }
}

function sleep(ms:number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export const scanDependency = async (
  owner: string,
  repoName: string
) => {
  console.log(chalk.bgYellowBright('Malicious Code Scan:'));
  const repoPath = `https://github.com/${owner}/${repoName}`;
  const nodeModulesDir = path.join(process.cwd(), "scan-dependency/node_modules");
  try {
    await git.clone({fs, http, dir, url: repoPath});
    let exec = require('child_process').exec;
    await exec('npm install --prefix scan-dependency --loglevel=error 2> /dev/null', (error: any, stdout: any, stderr: any) => {
      if (error) {
        console.log(error);
        return
      }
      fs.readdirSync(nodeModulesDir)
      .filter(s => fs.statSync(`${nodeModulesDir}/${s}`).isDirectory())
      .forEach(moduleName => {
        const moduleDir = path.join(process.cwd(), `scan-dependency/node_modules/${moduleName}`);
        dirWalk(moduleDir, done(moduleName));
      })
      if (!foundRisk) {
        console.log("No risk found")
      }
      fs.rmdirSync("scan-dependency", { recursive: true });
     })
  } catch (e) {
    console.log(e)
  }
}

export const detectRisk = (code: any, moduleName: string, fileDir: string) => {
  let ast = null
  try {
    code = removeShebang(code)
    ast = acorn.parse(code, { sourceType: "module", ecmaVersion: 2020 })
  } catch (e) {
    return false
  }

  try {
    foldConstant(ast)
  } catch (e) {
  }

  markEncodedString(ast)
  let malicious_req_call_nodes = passes.findExistsDataExchange(ast)
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
      console.log(`- ${report_string} in ${fileDir} line ${calLineNumber(code, req_node.start)}::`)
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
      console.log(`- ${report_string} in ${fileDir} line ${calLineNumber(code, func_node.start)}:`)
      const report_source = code.substring(func_node.start, func_node.end)
      if (report_source.length > maxReportStringLength) {
        console.log(report_source.substring(0, maxReportStringLength) + "...")
      } else {
        console.log(report_source.substring(0, maxReportStringLength))
      }
    }
  })

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
    return false
  }
}

