import { parseLocalFile, parseGithubFile } from "./parse";
import { scanGitLogs } from "./git-exposure";
import { scanPhishingPackage } from "./detect-phishing-package";
import { scanDependency } from "./detect-malicious-request";
import fs from "fs";
// import { scanDependency } from "./ast-passes/detect-malicious-request";

require('dotenv').config()

const detect = async (owner: string, repo: string, path: string) => {
  try {
    // parseGithubFile(owner, repo, path);
    await scanGitLogs(owner, repo, 20);
    await scanPhishingPackage(owner, repo);
    await scanDependency(owner, repo);
  } catch (e) {
    // Deal with the fact the chain failed
  }

}

const main = async () => {
  if (process.argv[2] == "local") {
    const filename = process.argv[3];
    if (!filename) {
      throw Error("Please provide a file path");
    }
    parseLocalFile(filename);
  } else {
    const owner = process.argv[2];
    const repo = process.argv[3];
    const path = process.argv[4] ? process.argv[4] : "";
    if (!owner || !repo) {
      throw Error("Please provide owner and repository name to the github repo");
    }
    await detect(owner, repo, path);
  }
}

main().then(() => {
  // console.log("success")
}).catch((err) => {
  console.log(err)
});



