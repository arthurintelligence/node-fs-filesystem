import os from 'os';
import fs from 'fs';
import path from 'path';
import { expect } from 'chai';
import child from 'child_process';
import windows from '../../../src/windows';

// eqeqeq :: * -> * -> Bool
const eqeqeq = (x) => (y) => x === y;

// ifElse :: (a -> Bool), (a -> *), (a -> *) -> (a -> *)
const ifElse = function ifElse (f, g, h) {
  return (x) => f(x) ? g(x) : h(x);
};

describe('windows integration tests', ifElse(
  eqeqeq('win32'),
  () => function(){
    it('should properly parse the output of the filesystem command', function(done){
      const input = child.execSync(windows.COMMAND).toString();
      const userFilter = () => true;
      const acc = windows.parser(userFilter)(input);
      expect(acc).to.be.an('object').that.includes('devices');
      expect(acc.devices).to.be.an('object');
      expect(Object.keys(acc.devices).length).to.be.at.least(1);
      for(let k in acc.devices){
        expect(acc.devices[k].id).to.be.a('string');
        expect(acc.devices[k].node).to.be.a('string');
        expect(acc.devices[k].name).to.be.a('string');
        expect(acc.devices[k].size).to.be.a('number').that.is.gte(0);
        expect(acc.devices[k].description).to.be.a('string');
        expect(acc.devices[k].volumes).to.be.an('array').that.is.not.empty;
        acc.devices[k].volumes.forEach((v) => {
          expect(v.name).to.be.a('string');
          expect(v.mounted).to.be.true;
          expect(v.mountPoint).to.be.equal(k);
          expect(v.fs).to.be.a('string');
          expect(v.space).to.be.an('object').that.has.all.keys('total', 'available', 'used');
          expect(v.space.total).to.be.a('number').that.is.gte(0);
          expect(v.space.available).to.be.a('number').that.is.gte(0);
          expect(v.space.used).to.be.a('number').that.is.gte(0);
        });
      }
    });
  },
  () => function(){
    it('should properly parse the provided static input', function(done){
      const input = fs.readFileSync(path.resolve(__dirname, 'input.txt')).toString('utf-16le').replace('\r\n', '\n');
      const userFilter = () => true;
      const acc = windows.parser(userFilter)(input);
      expect(acc).to.be.an('object').that.has.keys('devices');
      expect(acc.devices).to.be.an('object');
      expect(Object.keys(acc.devices).length).to.be.equal(4);
      for(let k in acc.devices){
        expect(acc.devices[k].id).to.be.a('string');
        expect(acc.devices[k].node).to.be.a('string');
        expect(acc.devices[k].name).to.be.a('string');
        expect(acc.devices[k].size).to.be.a('number').that.is.gte(0);
        expect(acc.devices[k].description).to.be.a('string');
        expect(acc.devices[k].volumes).to.be.an('array').that.is.not.empty;
        acc.devices[k].volumes.forEach((v) => {
          expect(typeof v.name === 'string' || v.name === null).to.be.true;
          expect(v.mounted).to.be.true;
          expect(v.mountPoint).to.be.equal(k);
          expect(v.fs).to.be.a('string');
          expect(v.space).to.be.an('object').that.has.all.keys('total', 'available', 'used');
          expect(v.space.total).to.be.a('number').that.is.gte(0);
          expect(v.space.available).to.be.a('number').that.is.gte(0);
          expect(v.space.used).to.be.a('number').that.is.gte(0);
        });
      }
      done();
    });
  }
)(os.platform()));
