import { parse } from "acorn";
import axios from "axios";
import fs from "fs";

export const parseLocalFile = (filename: string) => {
  //TODO: enable scanning in local directory
  const file = fs.readFileSync(filename, "utf-8");
  const parseTree = parse(file, {
    ecmaVersion: "latest",
  });
  console.log(parseTree);
};

export const parseGithubFile = (owner: string, repo: string, path: string) => {
  try {
    var getAddress = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    axios.get(getAddress).then((res: any) => {
      const filesArray = res.data;
      //TODO: recursively parse directory

      // If it is a directory, the response will be an array containing data on all
      // the files. If the request is for a single file, the response will be an obj
      // https://docs.github.com/en/rest/reference/repos#get-repository-content
      if (Array.isArray(filesArray)) {
        filesArray
          .filter((r) => {
            const ext = r.path.split(".").pop();

            return r.type == "file" && (ext == "js" || ext == "ts");
          })
          .forEach((r) => {
            console.log(`********** ${r.name} *********`);
            const parseTree = parse(r.content, {
              ecmaVersion: "latest",
            });
            console.log(parseTree);
            console.log("*******************");
          });
      } else {
        const parseTree = parse(filesArray.content, {
          ecmaVersion: "latest",
        });
        console.log(parseTree);
      }
    });
  } catch (err) {
    throw err;
  }
};
