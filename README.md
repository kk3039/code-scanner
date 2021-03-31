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

## Modules

### Git Log Volunerability

This module scans the git log of the given repository, and compare between two consecutive commits to see
if sensitive information has been commited.

Example output:

```
Detected sensitive information in git commits [commit A] and [commit B]:
RSA private key: -----BEGIN RSA PRIVATE KEY----- appearances: 1
```

- To debug:

Go to `git-exposure.ts` and trigger the call with a hard coded repo path, then run `npm run scan-git` to run this script independently.


### Malicious Code in Dependency Scan

This module scans the dependent npm packages, and find potentially malicious code. Currently we only focus on malicious http request, for example posting sensitive data to some unknown host.

Example output:

```
Malicious Network Request Scan:
- Myjquey found potentially malicious http request
```





