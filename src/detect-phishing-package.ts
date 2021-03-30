import { mostDependent } from './utils/1000-most-dependent-upon';
import git from "isomorphic-git";
import fs from "fs";
import http from "isomorphic-git/http/node";
import path from "path";
const reportSimilarity = 0.5;

const dir = path.join(process.cwd(), "detect-phishing");

export const scanPhishingPackage = async (owner: string, repoName: string,) => {
  const repoPath = `https://github.com/${owner}/${repoName}`;
  await git.clone({ fs, http, dir, url: repoPath });
  const packagePath = `${dir}/package.json`;
  console.log("Phishing package detection:")
  if (fs.existsSync(packagePath)) {
    fs.readFile(packagePath, 'utf8', function (err, data) {
      if (err) {
        console.log('error in reading `package.json`');
        console.log(err);
        return;
      }
      const obj = JSON.parse(data);
      const dependencies = obj["dependencies"];
      const depList: string [] = [];
      for (const dep in dependencies) {
        if (dependencies.hasOwnProperty(dep)) {
          depList.push(dep);
        }
      }
      const res: string = phishingDetect(depList);
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

const phishingDetect = (packages: string []): string => {
  let result: string = '';
  packages.forEach(packageName => {
    let mostSimilarPackage = null;
    let mostSimilarity = 0;
    mostDependent.forEach(dependentName => {
      let similarity = calcSimilarity(packageName, dependentName);
      if (similarity > reportSimilarity && similarity > mostSimilarity) {
        mostSimilarPackage = dependentName;
        mostSimilarity = similarity;
      }
    });
    if (mostSimilarity > 0) {
      result += `- The dependent package "${packageName}" looks similar to the popular package "${mostSimilarPackage}" \
with ${mostSimilarity.toFixed(3)} similarity. It's possible a phishing package.\n`;
    }
  });
  return result;
}

// similarity calculation code found in https://stackoverflow.com/a/36566052
const calcSimilarity = (s1: string, s2: string): number => {
  let longer = s1;
  let shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  let longerLength = longer.length;
  if (longerLength == 0) {
    return 1.0;
  }
  return (longerLength - editDistance(longer, shorter)) / longerLength;
}


const editDistance = (s1: string, s2: string): number => {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();

  let costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i == 0)
        costs[j] = j;
      else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) != s2.charAt(j - 1))
            newValue = Math.min(Math.min(newValue, lastValue),
              costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0)
      costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}
