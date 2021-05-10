import git from "isomorphic-git";
import fs from "fs";
import http from "isomorphic-git/http/node";
import path from "path";
import axios from "axios"
const reportSimilarity = 0.5;

const dir = path.join(process.cwd(), "detect-phishing");
const npm_data_path = `${process.cwd()}/npm_data.json`

const MIN_DEPENDENT_REPOS_COUNT = 200
const MIN_STARS = 100
const MIN_RANK = 17
const MIN_VERION_NUMBER = 5

export const getNpmData = async () => {
  let npm_data = null
  let str_temp = ""
  let is_first_write = true
  if (!fs.existsSync(npm_data_path)) {
    fs.writeFileSync(npm_data_path, "{\"data\":[", { flag: 'a+' })
    for (let page = 1; page < 5; page++) {
      let pageNumber = `&page=${page}`
      npm_data = await axios.get(`https://libraries.io/api/search?order=desc&platforms=npm&sort=rank${page != 1 ? pageNumber : ""}`)
      npm_data.data.map((p_obj: any) => {
        let { dependent_repos_count, forks, name, rank, stars } = p_obj
        let temp = { dependent_repos_count, forks, name, rank, stars }
        if (is_first_write) {
          str_temp += JSON.stringify(temp)
          is_first_write = false
        }
        else {
          str_temp += "," + JSON.stringify(temp)
        }
      })
      fs.writeFileSync(npm_data_path, str_temp, { flag: 'a+' })
      str_temp = ""
    }
    fs.writeFileSync(npm_data_path, "]}", { flag: 'a+' })
    console.log("saved!")
  }
}


export const scanPhishingPackage = async (owner: string, repoName: string,) => {
  const repoPath = `https://github.com/${owner}/${repoName}`;
  await git.clone({ fs, http, dir, url: repoPath });
  const packagePath = `${dir}/package.json`;
  console.log("Phishing package detection:")
  if (fs.existsSync(packagePath)) {
    const data = fs.readFileSync(packagePath, 'utf8')
    const obj = JSON.parse(data);
    const dependencies = obj["dependencies"];
    const depList: string[] = [];
    for (const dep in dependencies) {
      if (dependencies.hasOwnProperty(dep)) {
        depList.push(dep);
      }
    }
    const res: string = await phishingDetect(depList);
    if (res) {
      console.log(res);
    } else {
      console.log('No possible phishing package found :D');
    }
  } else {
    console.log('`package.json` not found')
  }
}

const isSuspicious = (dependent_repos_count: number, stars: number, rank: number, numberOfVersions: number) => {
  return dependent_repos_count < MIN_DEPENDENT_REPOS_COUNT || stars < MIN_STARS || rank < MIN_RANK || numberOfVersions < MIN_VERION_NUMBER
}
const phishingDetect = async (packages: string[]): Promise<string> => {
  let result: string = '';
  let shouldTest = true;
  if (!fs.existsSync(npm_data_path)) {
    await getNpmData()
  }
  const data = fs.readFileSync(npm_data_path, 'utf8')
  const npmPackageData = JSON.parse(data).data
  const checkEachPackagePromises = packages.map(async (packageNameToBeChecked) => {
    let mostSimilarPackage : string= '';
    let mostSimilarity = 0;
    let hasCheckedData = false;
    const promises = npmPackageData.map(async (npmPackageDataObj: any) => {
      let npmPackageName = npmPackageDataObj.name
      let similarity = calcSimilarity(packageNameToBeChecked, npmPackageName);
      if (similarity > reportSimilarity && similarity > mostSimilarity) {
        mostSimilarPackage = npmPackageName;
        mostSimilarity = similarity;
      }
      if ((similarity > reportSimilarity || packageNameToBeChecked.indexOf(npmPackageName) >= 0) && !hasCheckedData) {
        hasCheckedData = true
        const res = await axios.get(`https://libraries.io/api/NPM/${packageNameToBeChecked}?api_key=${process.env.LIBRARIES_IO_API_KEY}`)
        const { dependent_repos_count, stars, rank, versions } = res.data
        if (isSuspicious(dependent_repos_count, stars, rank, versions.length)) {
          result +=`- The dependent package "${packageNameToBeChecked}" has low usage. Dependent count: ${dependent_repos_count}, \ 
          stars: ${stars}, scoreRank: ${rank}, number of versions: ${versions.length}}. It's possibly a phishing package.\n`;
        }
      }
    });
    await Promise.all(promises).catch((err) => console.log(err))
    if (mostSimilarity > 0) {
      result += `- The dependent package "${packageNameToBeChecked}" looks similar to the popular package "${mostSimilarPackage}" \
      with ${mostSimilarity.toFixed(3)} similarity. It's possibly a phishing package.\n`;
    }
  });
  await Promise.all(checkEachPackagePromises).catch((err)=> console.log(err))
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
