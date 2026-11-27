import firebaseRulesPlugin from "@firebase/eslint-plugin-security-rules";

export default [
  {
    ignores: [
      "dist/**/*",
      "node_modules/**/*",
      "engine/**/*",
      "tools/**/*",
      "mods/**/*",
      "content/**/*",
      "data.js",
      "i18n.js",
      "server.js",
      "src/**/*",
      "firestore.rules.test.ts",
    ],
  },
  firebaseRulesPlugin.configs["flat/recommended"],
];
