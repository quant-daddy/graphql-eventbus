const { writeFileSync } = require("fs");
const { resolve } = require("path");
const { argv, cwd } = require("process");

const pkgPath = resolve(cwd(), "./package.json");

const pkg = require(pkgPath);

const version = argv[2];

pkg.devDependencies.graphql = `^${version}`;
pkg.overrides.graphql = `^${version}`;

writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), "utf8");
