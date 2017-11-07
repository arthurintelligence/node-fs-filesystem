const tests = require('./tests');

/* global describe */
describe('node-fs-filesystem', () => {
  if(process.env.TESTS) {
    let envtests = process.env.TESTS.split(',');
    for(let key in tests) {
      if(envtests.indexOf(key) !== -1) {
        tests[key].paths.forEach((p) => require(p));
      }
    }
  }else{
    for(let key in tests) {
      tests[key].paths.forEach((p) => require(p));
    }
  }
});
