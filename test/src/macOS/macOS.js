import os from 'os';
import { expect } from 'chai';
import sinon from 'sinon';
import {
  COMMAND,
  parseMacOS,
  mergeVolumesAndDevicesMacOS,
  parseMacOSToProps,
  macOSFS,
  getMacOSBytes
} from '../../src/macOS/macOS';

// eqeqeq :: * -> * -> Bool
const neqeqeq = (x) => (y) => x !== y;

// ifElse :: (a -> Bool), (a -> *), (a -> *) -> (a -> *)
const ifElse = function ifElse (f, g, h) {
  return (x) => f(x) ? g(x) : h(x);
};

describe('macOS functions', ifElse(
  neqeqeq('darwin'),
  () => function(){
    it('should not run macOS tests on this platform', (done) => done());
  },
  () => function(){
    it('should run macOS tests on this platform', (done) => done());
  }
)(os.platform()));
