/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: "node",
  roots: ['<rootDir>/__tests__'],
  transform: {
    "^.+\.tsx?$": ["ts-jest",{}],
  },
};