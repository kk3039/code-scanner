import git from "isomorphic-git";
import fs from "fs";
import http from "isomorphic-git/http/node";
import path from "path";
import CFG from "ast-flow-graph";

const dir = path.join(process.cwd(), "detect-prototype-pollution");

function buildCFG(src: string){
    const cfg_configs = {
        parser:    {
            loc:          true,
            range:        true,
            comment:      true,
            tokens:       true,
            ecmaVersion:  9,
            sourceType:   'module',
            ecmaFeatures: {
                impliedStrict: true,
                experimentalObjectRestSpread: true
            }
        }
    } 
    const cfg = new CFG( src, cfg_configs);
    cfg.generate();
    console.log(cfg.toString())
    return ""
}

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
        const res: string = buildCFG(data);
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
  
  const data = fs.readFileSync( "/Users/ylu/Documents/code-scanner/node_modules/ast-flow-graph/test-data/cfg-test-03.js", 'utf8' )
    buildCFG(data);

