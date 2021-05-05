import git from "isomorphic-git";
import fs from "fs";
import http from "isomorphic-git/http/node";
import path from "path";
import  load  from "ast-flow-graph";
import {parseLocalFile} from "./parse"
import * as Styx from "styx";

const dir = path.join(process.cwd(), "detect-prototype-pollution");

export const scanPrototypePollution = async (owner: string, repoName: string,) => {
    const repoPath = `https://github.com/${owner}/${repoName}`;
    await git.clone({ fs, http, dir, url: repoPath });
    const packagePath = `${dir}/package.json`;
    console.log("Prototype pollution detection:")
    if (fs.existsSync(packagePath)) {
      fs.readFile(packagePath, 'utf8', function (err, data) {
        if (err) {
          console.log(err);
          return;
        }
        const res: string = "" //to be filled in
        if (res) {
          console.log(res);
        } else {
          console.log('No possible phishing package found :D');
        }
  
      });
    } else {
      console.log('`package.json` not found')
    }
  }
  
const ast = parseLocalFile("/Users/ylu/Documents/code-scanner/src/test/sample-code/malicious-request-obf-1.js" )


var flowProgram = Styx.parse(ast);
var cfg_json = Styx.exportAsJson(flowProgram);
console.log(cfg_json)