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
    // --- EXISTING RULES (Kept) ---
    "quotes": "off", 
    "max-len": ["error", {"code": 1000}],
    "linebreak-style": "off",
    "object-curly-spacing": "off", 
    "comma-dangle": "off", 
    "no-trailing-spaces": "off", 
    
    // --- NEW RULES TO HANDLE UNUSED IMPORTS/VARS ---
    "no-unused-vars": "off", // Disable base JS check
    "@typescript-eslint/no-unused-vars": "off", // Disable TS check for unused imports/variables
    
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-inferrable-types": "off",
    "@typescript-eslint/explicit-member-accessibility": "off", 

    "no-irregular-whitespace": "off", 
  },
};