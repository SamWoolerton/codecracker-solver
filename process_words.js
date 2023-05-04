const fs = require("fs");

const dir = "words_source_files";
const files = fs.readdirSync(dir);

const mapping = {};

for (const f of files) {
  const contents = fs.readFileSync(`${dir}/${f}`);
  mapping[f.replace(".json", "")] = JSON.parse(contents);
}

fs.writeFileSync("words.json", JSON.stringify(mapping));
