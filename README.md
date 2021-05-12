# NPM Package Code Scanner

## Authors

Cong Yu  
Victoria Lu  
Xiaomeng Wang  

## Prerequisites


## Development

To read from a github repository: `npm run start [owner] [repo]`

args:

`owner`: owner of the repository
`repo`: repository name

e.g.:
`npm run start  wsghlby vulnerability-test` will get to the root of remote repository of this project.
!! Recursive reading from directories are not supported yet.

## Modules

### Git Log Vulnerability

This module scans the git log of the given repository, and compare 
between two consecutive commits to see if sensitive information 
has been committed.

Example output:

```
Git Exposure Scan:
Detected sensitive information in git commits [commit A] and [commit B]:
RSA private key: -----BEGIN RSA PRIVATE KEY----- appearances: 1
```

- To debug:

Go to `git-exposure.ts` and trigger the call with a hard coded repo path, then run `npm run scan-git` to run this script independently.


### Malicious Code in Dependency Scan

This module scans the dependent npm packages, and find potentially 
malicious code. Currently, we only focus on data exchange, powerful
function and encoded string.

Example output:

```
Malicious Code Scan:
- Found data exchange & powerful function & encoded string in [file path]:
[source code]
```

You need to manually remove the `scan-dependency` directory after scanning.

Since it is hard to find a real malicious npm package, we provide the
testing result of several examples in `test-examples-result.md`

### Phishing Package Detection

This module scans all dependent npm packages and check if there is possible phishing package exist.

Example output: 

```
Phishing package detection:
- The dependent package "jquey" looks similar to the popular package "jquery" with 0.833 similarity. It's possibly a phishing package.
```
