import os from 'os';
import { expect } from 'chai';
import sinon from 'sinon';
import {
  COMMAND,
  mergeVolumesAndDevicesLinux,
  parselsblkDeviceData,
  parselsblkVolumeData,
  parselsblk,
  parsefdisklDeviceData,
  parsefdisklVolumeData,
  parsefdiskl,
  parsedfT,
  parseLinux
} from '../../src/linux/linux';

// eqeqeq :: * -> * -> Bool
const neqeqeq = (x) => (y) => x !== y;

// ifElse :: (a -> Bool), (a -> *), (a -> *) -> (a -> *)
const ifElse = function ifElse (f, g, h) {
  return (x) => f(x) ? g(x) : h(x);
};

describe('linux functions', ifElse(
  neqeqeq('linux'),
  () => function(){
    it('should not run linux tests on this platform', (done) => done());
  },
  () => function(){
    it('should run linux tests on this platform', (done) => done());
  }
)(os.platform()));
