module.exports = {
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/dist/",
  ],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
}