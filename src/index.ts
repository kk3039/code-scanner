const acorn = require("acorn");
const fs = require("fs");

const filename = process.argv[2];
if (!filename) {
  throw Error("Please provide a file path");
}

const file = fs.readFileSync(filename, "utf-8");

const parseTree = acorn.parse(file, {
  ecmaVersion: "latest",
});

console.log(parseTree);
