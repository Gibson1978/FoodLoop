module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json", "tsconfig.dev.json"],
    sourceType: "module",
  },
  ignorePatterns: [
    "/lib/**/*", // Ignore built files.
    "/generated/**/*", // Ignore generated files.
  ],
  plugins: [
    "@typescript-eslint",
  ],
  rules: {
    "quotes": "off", // Disable quote enforcement
    "max-len": ["error", {"code": 300}],
    "linebreak-style": "off",
    "object-curly-spacing": "off", // Disable object curly spacing enforcement
    "comma-dangle": "off", // Disable comma dangle enforcement
    "no-trailing-spaces": "off", // Disable trailing spaces enforcement
  },
};