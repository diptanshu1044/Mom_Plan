const fs = require("fs");

const lines = fs
  .readFileSync("us_cities_states_counties_zips.csv", "utf8")
  .split("\n")
  .filter(Boolean);

const zipMap = {};

for (let i = 1; i < lines.length; i++) {
  const [
    city,
    stateCode,
    state,
    county,
    cityAlias,
    zipString,
  ] = lines[i].split("|");

  if (!zipString) continue;

  const zipCodes = zipString.trim().split(/\s+/);

  for (const zip of zipCodes) {
    if (!zipMap[zip]) {
      zipMap[zip] = {
        city,
        state,
        stateCode,
        counties: new Set(),
      };
    }

    zipMap[zip].counties.add(county);
  }
}

const output = {};

for (const zip in zipMap) {
  output[zip] = {
    city: zipMap[zip].city,
    state: zipMap[zip].state,
    stateCode: zipMap[zip].stateCode,
    counties: Array.from(zipMap[zip].counties).sort(),
  };
}

fs.writeFileSync(
  "zip-master.json",
  JSON.stringify(output, null, 2)
);

console.log(
  `Generated ${Object.keys(output).length} ZIP codes`
);