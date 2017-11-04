import os from 'os';
import { expect } from 'chai';
import sinon from 'sinon';
import {
  COMMAND,
  parseWindows,
  parseWindowsProps
} from '../../src/windows/windows';

// eqeqeq :: * -> * -> Bool
const neqeqeq = (x) => (y) => x !== y;

// ifElse :: (a -> Bool), (a -> *), (a -> *) -> (a -> *)
const ifElse = function ifElse (f, g, h) {
  return (x) => f(x) ? g(x) : h(x);
};

describe('windows functions', ifElse(
  neqeqeq('win32'),
  () => function(){
    it('should not run windows tests on this platform', (done) => done());
  },
  () => function(){
    it('should run windows tests on this platform', (done) => done());
  }
)(os.platform()));
