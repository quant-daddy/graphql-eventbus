module.exports = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": "ts-jest",
    "^.+\\.jsx?$": "babel-jest"
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  testMatch: [
    // "**/__tests__/**/*.(test).[jt]s?(x)",
    "**/?(*.)+(test).[jt]s?(x)"
  ],
  moduleNameMapper: {
    "^#root/(.*)": "<rootDir>/$1"
  },
  watchPlugins: [
    "jest-watch-typeahead/filename",
    "jest-watch-typeahead/testname"
  ],
  testPathIgnorePatterns: ["/build/"],
  watchPathIgnorePatterns: ["<rootDir>/pact/", "<rootDir>/coverage/"],
  coverageDirectory: "coverage",
  collectCoverageFrom: ["src/**/*.{ts,tsx,js,jsx}", "!src/**/*.d.ts"]
};
