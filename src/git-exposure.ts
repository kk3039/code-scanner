import git, {
  WalkerEntry,
  WalkerMap,
  ReadCommitResult,
  TREE,
} from "isomorphic-git";
// import path
import http from "isomorphic-git/http/node";
// import diff from 'diff-lines'
import { regexes } from "./utils/git-exposure-regex";

const path = require("path");
const diff = require("diff-lines");
const fs = require("fs");

const dir = path.join(process.cwd(), "test-clone");

const prepareCharSet = (allChar: string, set: Set<String>) => {
  for (const c of allChar) {
    set.add(c);
  }
};

const BASE64_CHARS_set: Set<string> = new Set();
const HEX_CHARS_set: Set<string> = new Set();
const chunkSize = 20;

const BASE64_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
const HEX_CHARS = "1234567890abcdefABCDEF";

prepareCharSet(BASE64_CHARS, BASE64_CHARS_set);
prepareCharSet(HEX_CHARS, HEX_CHARS_set);

// clone repo, get all commits, iterate all commits and diff every two
const detectGitExposure = async (repoPath: string, maxDepth: number) => {
  console.log("hello");
  await git.clone({ fs, http, dir, url: repoPath });
  let commits = await git.log({
    fs,
    dir,
    depth: maxDepth,
  });
  const commitList = commits.map((commit: ReadCommitResult) => commit.oid);
  for (let i = 0; i < commitList.length - 2; i++) {
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
  await git.walk({ fs, trees: [currTree, nextTree], map });
};

// a map function used by `git.walk` to use in the recursive comparison
const map: WalkerMap = async (
  filepath: string,
  entries: Array<WalkerEntry> | null
) => {
  const [curr, next] = entries as Array<WalkerEntry>;
  if ((await curr.type()) === "blob" && (await next.type()) === "blob") {
    const currContent = (await curr.content()) as Uint8Array;
    const nextContent = (await next.content()) as Uint8Array;
    diffWorker(
      currContent.toString(),
      nextContent.toString(),
      await curr.oid(),
      await next.oid()
    );
  }
};

// it is supposed to call `findRegex` and `findEntropy` which are two ways of searching for possible sensitive information
const diffWorker = (
  currContent: string,
  nextContent: string,
  currCommit: string,
  nextCommit: string
) => {
  const contentDiff = diff(currContent, nextContent);
  // const findRegexRes = await findRegex(contentDiff, currCommit, nextCommit);
  // console.log(findRegexRes);
};

// find sensitive information by regex
const findRegex = (
  contentDiff: string,
  currCommit: string,
  nextCommit: string
) => {
  let result = "";
  for (const regex in regexes) {
    const pattern = new RegExp(regexes[regex]);
    let match = pattern.exec(contentDiff);
    while (match) {
      result += "Possible sensitive information exposure: ${}";
    }
  }
};

// following is a function used in detecting encrypted information,
// it is commented because some error inside it block the execution

// const findEntropy = async (contentDiff: string, currCommit: string, nextCommit: string) => {
//   const base64Chunk = chunkString(contentDiff, BASE64_CHARS_set)
//   const hexChunk = chunkString(contentDiff, HEX_CHARS_set)
//   let possibleSensitive = ""
//   for (const chunk of base64Chunk) {
//     const entropy = calcShannonEntropy(chunk, BASE64_CHARS)
//     if (entropy > 4.5) {
//       possibleSensitive += ""
//     }
//   }
// }

// const calcShannonEntropy = (input: string, charString: string): number => {
//   const charMap: Map<String, number> = new Map()
//   let entropy: number = 0
//   for (const char of charString) {
//     charMap.set(char, 0)
//   }
//   for (const char of input) {
//     charMap.set(char, charMap.get(char) + 1)
//   }
//   const lengthOfInput = input.length
//   for (const char of charString) {
//     const px = charMap.get(char) / lengthOfInput
//     if (px > 0) {
//       entropy += px
//     }
//   }
//   return entropy
// }

const chunkString = (input: string, charSet: Set<string>): Array<string> => {
  let count = 0;
  let chunk = "";
  let result = [];
  for (let char of input) {
    if (charSet.has(char)) {
      chunk += char;
      count++;
    } else {
      if (count >= chunkSize) {
        result.push(chunk);
      }
      chunk = "";
      count = 0;
    }
  }
  if (count >= chunkSize) {
    result.push(chunk);
  }
  return result;
};

detectGitExposure("https://github.com/wsghlby/vulnerability-test", 20).then(
  () => {
    console.log("finish");
  }
);
