module.exports = {
    reporters: [
      'default',
      [ 'jest-html-reporter', {
        pageTitle: 'Test Report',
        filename: "./testReport/unitTest.html",
        includeFailureMsg:true,
      } ]
    ]
  };