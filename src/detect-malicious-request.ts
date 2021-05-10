import * as acorn from 'acorn'
import * as walk from 'acorn-walk'

import git from "isomorphic-git";
import fs from "fs";
import http from "isomorphic-git/http/node";
import path from "path";
import * as passes from "./ast-passes/detect-data-exchange";
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

  let func_infected_nodes = passes.sendsRequestsToExternal(ast)
  let str_infected_nodes = passes.checkIfContainsURL(ast)
  let malicious_req_call = passes.ifExistsDataExchange(ast, func_infected_nodes, str_infected_nodes)

  return malicious_req_call.size > 0
}

export { isMaliciousHttpRequest }
