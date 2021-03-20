const acorn = require("acorn");
const axios = require("axios");
const fs = require("fs");

if (process.argv[2] == "local") {
  const filename = process.argv[3];
  if (!filename) {
    throw Error("Please provide a file path");
  }
  //TODO: enable scanning in local directory
  const file = fs.readFileSync(filename, "utf-8");
  const parseTree = acorn.parse(file, {
    ecmaVersion: "latest",
  });
  console.log(parseTree);
} else {
  const owner = process.argv[2];
  const repo = process.argv[3];
  const path = process.argv[4] ? process.argv[4] : "";
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
            const parseTree = acorn.parse(r.content, {
              ecmaVersion: "latest",
            });
            console.log(parseTree);
            console.log("*******************");
          });
      } else {
        const parseTree = acorn.parse(filesArray.content, {
          ecmaVersion: "latest",
        });
        console.log(parseTree);
      }
    });
  } catch (err) {
    throw err;
  }
}
