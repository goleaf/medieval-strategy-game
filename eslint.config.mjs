import next from "eslint-config-next"

export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "prisma/**",
      "dist/**",
      "coverage/**",
      "eslint.config.mjs",
    ],
  },
  ...next,
  {
    rules: {
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react/no-unescaped-entities": "off",
    },
  },
]
