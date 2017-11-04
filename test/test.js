const tests = require('./tests');

/* global describe */
describe('node-fs-filesystem', () => {
  if(process.env.TESTS) {
    let envtests = process.env.TESTS.split(',');
    for(let key in tests) {
      if(envtests.indexOf(key) !== -1) {
        require(tests[key].path);
      }
    }
  }else{
    for(let key in tests) {
      require(tests[key].path);
    }
  }
});
