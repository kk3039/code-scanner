# NPM Package Code Scanner

## Authors

Cong Yu
Victoria Lu
Xiaomeng Wang

## Development

To start locally: `npm run start local [input_file_path]`
args:
`local`: indicate that the following is a local file
`input_file_path`: path to file which is to be analyzed. It cannot be a directory
e.g.: `npm run start local test.txt` will start analyze the `./test.txt` file.

To read from a github repository: `npm run start [owner] [repo] [path]`
args:
`owner`: owner of the repository
`repo`: repository name
`path`: optional. Relative path from the root of the repository

e.g.:
`npm run start kk3039 code-scanner` will get to the root of remote repository of this project.
`npm run start kk3039 code-scanner src` will get to the `src/` folder of remote repository of this project.
!! Recursive reading from directories are not supported yet.
