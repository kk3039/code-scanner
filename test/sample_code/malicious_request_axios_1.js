try {
    // no support for template element for now
    // var getAddress = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    var getAddress = 'https://api.github.com/repos';
    axios.get(getAddress).then((res) => {
      const filesArray = res.data;
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