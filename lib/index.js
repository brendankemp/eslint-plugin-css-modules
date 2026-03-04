import fs from "fs";
import rules from "./rules";

const pkg = JSON.parse(
  fs.readFileSync(new URL("./package.json", import.meta.url), "utf8"),
);

const ruleLevels = {
  "css-modules/no-unused-class": "error",
  "css-modules/no-undef-class": "error",
};

export const configs = {
  recommended: {
    rules: ruleLevels,
  },
  "flat/recommended": {
    recommended: {
      plugins: {
        "css-modules": { rules },
      },
      rules: ruleLevels,
    },
  },
};

const plugin = {
  meta: {
    name: pkg.name,
    version: pkg.version,
    namespace: "css-modules",
  },
  rules,
  configs,
};

export default plugin;
