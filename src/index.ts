import { parseLocalFile, parseGithubFile } from "./parse";
import { scanGitLogs } from "./git-exposure";
import { scanPhishingPackage } from "./detect-phishing-package";

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
  parseGithubFile(owner, repo, path);
  scanGitLogs(owner, repo, 20);
  scanPhishingPackage(owner, repo);
}
