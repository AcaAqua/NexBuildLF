const fs = require("fs");
const path = require("path");

const targets = [];

function walk(dir) {
  for (const item of fs.readdirSync(dir)) {
    if (item === "node_modules" || item === ".git" || item === ".next") continue;
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full);
    if (stat.isFile() && (item === "package.json" || item === "package-lock.json")) {
      targets.push(full);
    }
  }
}

walk(process.cwd());

const bad = [];

for (const file of targets) {
  let json;
  try {
    json = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    console.error(`Invalid JSON in file: ${file} - ${e.message}`);
    continue;
  }

  function checkVersion(label, value) {
    if (value === "" || value == null || value === " " || value === "*" || (typeof value === 'string' && value.startsWith("v"))) {
      bad.push({ file, label, value });
    }
  }

  if ("version" in json) checkVersion("version", json.version);

  for (const key of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
    const deps = json[key] || {};
    for (const [name, version] of Object.entries(deps)) {
      if (version === "" || version == null || version === " " || version === "workspace:*") {
        bad.push({ file, label: `${key}.${name}`, value: version });
      }
    }
  }

  if (json.packages) {
    for (const [pkg, data] of Object.entries(json.packages)) {
      if (data && "version" in data) checkVersion(`packages.${pkg}.version`, data.version);
      for (const key of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
        const deps = data?.[key] || {};
        for (const [name, version] of Object.entries(deps)) {
          if (version === "" || version == null || version === " " || version === "workspace:*") {
            bad.push({ file, label: `packages.${pkg}.${key}.${name}`, value: version });
          }
        }
      }
    }
  }
}

if (bad.length) {
  console.error("Invalid package versions found:");
  console.error(JSON.stringify(bad, null, 2));
  process.exit(1);
}

console.log("OK: no invalid versions found");
