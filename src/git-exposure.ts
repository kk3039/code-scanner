import git, {
  WalkerEntry,
  WalkerMap,
  ReadCommitResult,
  TREE,
} from "isomorphic-git";
// import path
import http from "isomorphic-git/http/node";
import { regexes } from "./utils/git-exposure-regex";
import path from "path";
import fs from "fs";
import chalk from 'chalk';

const TextDecoder = require("text-encoding").TextDecoder;
const diff = require("diff-lines");
const textDecoder = new TextDecoder();
const dir = path.join(process.cwd(), "test-clone");

type MatchResult = {
  vulnName: string;
  matchString: string;
  number: number;
};

const prepareCharSet = (allChar: string, set: Set<String>) => {
  for (const c of allChar) {
    set.add(c);
  }
};

const BASE64_CHARS_set: Set<string> = new Set();
const HEX_CHARS_set: Set<string> = new Set();

const BASE64_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
const HEX_CHARS = "1234567890abcdefABCDEF";

prepareCharSet(BASE64_CHARS, BASE64_CHARS_set);
prepareCharSet(HEX_CHARS, HEX_CHARS_set);

// clone repo, get all commits, iterate all commits and diff every two
export const scanGitLogs = async (
  owner: string,
  repoName: string,
  maxDepth: number
) => {
  console.log(chalk.bgCyanBright('Git Exposure Scan:'));
  const repoPath = `https://github.com/${owner}/${repoName}`;
  await git.clone({ fs, http, dir, url: repoPath });
  let commits = await git.log({
    fs,
    dir,
    depth: maxDepth,
  });
  const commitList = commits.map((commit: ReadCommitResult) => commit.oid);

  for (let i = 0; i < commitList.length - 1; i++) {
    let curCommit = commitList[i];
    let nextCommit = commitList[i + 1];
    await diffCommit(curCommit, nextCommit);
  }
  fs.rmdirSync("test-clone", { recursive: true });
};

// TODO: try to get `Walker` of two commits for the `git.walk` to do recursive comparison
const diffCommit = async (currCommit: string, nextCommit: string) => {
  const currTree = TREE({ ref: currCommit });
  const nextTree = TREE({ ref: nextCommit });
  await git.walk({ fs, dir, trees: [currTree, nextTree], map });
};

// a map function used by `git.walk` to use in the recursive comparison
const map: WalkerMap = async (
  filepath: string,
  entries: Array<WalkerEntry> | null
) => {
  const [curr, next] = entries as Array<WalkerEntry>;
  if (
    curr &&
    next &&
    (await curr.type()) === "blob" &&
    (await next.type()) === "blob"
  ) {
    const currContent = textDecoder.decode(
      (await curr.content()) as Uint8Array
    );
    const nextContent = textDecoder.decode(
      (await next.content()) as Uint8Array
    );
    // generate ids
    const Aoid = await curr.oid();
    const Boid = await next.oid();

    // determine modification type
    let type = "equal";
    if (Aoid !== Boid) {
      type = "modify";
    }
    if (Aoid === undefined) {
      type = "add";
    }
    if (Boid === undefined) {
      type = "remove";
    }
    if (Aoid === undefined && Boid === undefined) {
      console.log("Something weird happened:");
      console.log(curr);
      console.log(next);
    }

    const contentDiff = diff(currContent.toString(), nextContent.toString());
    // it is supposed to call `findRegex` and `findEntropy` which are two ways of searching for possible sensitive information
    const findRegexRes = findRegex(contentDiff);
    printResults(findRegexRes, Aoid, Boid);
  }
};

// find sensitive information by regex
const findRegex = (contentDiff: string) => {
  var result = [];
  for (const regex in regexes) {
    const pattern = new RegExp(regexes[regex]);
    let match = pattern.exec(contentDiff);

    if (match && match.length > 0) {
      result.push({
        vulnName: regex,
        matchString: match[0],
        number: match.length,
      } as MatchResult);
    }
  }
  return result;
};

const printResults = (
  resList: MatchResult[],
  commitA: string,
  commitB: string
) => {
  if (resList.length > 0) {
    console.log(
      `Detected sensitive information in git commits ${commitA} and ${commitB}:`
    );
    resList.forEach((res) => {
      console.log(
        `${res.vulnName}: ${res.matchString} appearances: ${res.number}`
      );
    });
  }
};
