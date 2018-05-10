module.exports = {
  'transform': {
    '.(js|ts|tsx)': '<rootDir>/node_modules/ts-jest/preprocessor.js'
  },
  'testRegex': '(\\.(test|spec))\\.(ts|tsx|js)$',
  'moduleFileExtensions': [
    'ts',
    'tsx',
    'js'
  ],
  'coveragePathIgnorePatterns': [
    '/node_modules/',
    '/test/'
  ],
  'coverageThreshold': {
    'global': {
      'branches': 90,
      'functions': 95,
      'lines': 95,
      'statements': 95
    }
  },
  'collectCoverage': true
}
