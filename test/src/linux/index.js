import os from 'os';
import fs from 'fs';
import path from 'path';
import { expect } from 'chai';
import child from 'child_process';
import linux from '../../../src/linux';
import { ENVIRONMENT, inferDevSize } from '../../../src';

// eqeqeq :: * -> * -> Bool
const eqeqeq = (x) => (y) => x === y;

// ifElse :: (a -> Bool), (a -> *), (a -> *) -> (a -> *)
const ifElse = function ifElse (f, g, h) {
  return (x) => f(x) ? g(x) : h(x);
};

describe('linux integration tests', function() {
  describe('native tests', ifElse(
    eqeqeq('linux'),
    () => function(){
      it('should properly parse the output of the filesystem command', function(done){
        this.timeout(5000);
        const input = child.execSync(linux.COMMAND, ENVIRONMENT).toString();
        const userFilter = () => true;
        const firstParse = linux.parser(userFilter)(input);
        const acc = inferDevSize(firstParse);
        expect(acc.devices).to.be.an('object');
        expect(Object.keys(acc.devices).length).to.be.at.least(1);
        for(const k in acc.devices){
          expect(acc.devices[k].id).to.be.a('string');
          expect(acc.devices[k].node).to.be.a('string');
          expect(acc.devices[k].size).to.be.a('number').that.is.gte(0);
          expect(acc.devices[k].volumes).to.be.an('array');
          acc.devices[k].volumes.forEach((v) => {
            expect(typeof v.name === 'string' || v.name === null).to.be.true;
            expect(typeof v.description === 'string' || v.description === null).to.be.true;
            expect(v.mounted).to.be.a('boolean');
            expect(v.space).to.be.an('object').that.has.all.keys('total', 'available', 'used');
            expect(
              (
                v.space.total === null &&
                v.space.available === null &&
                v.space.used === null
              ) ||
              (
                typeof v.space.total === 'number' && v.space.total >= 0 &&
                typeof v.space.available === 'number' && v.space.available >= 0 &&
                typeof v.space.used === 'number' && v.space.used >= 0
              )
            ).to.be.true;
          });
        }
        done();
      });
    },
    () => function() {
      it('should not run native linux tests', (done) => done());
    }
  )(os.platform()));

  describe('non-native tests', function(){
    it('should properly parse the provided static input', function(done){
      const input = fs.readFileSync(path.resolve(__dirname, 'input.txt'), 'utf-8');
      const userFilter = () => true;
      const acc = linux.parser(userFilter)(input);
      expect(acc.devices).to.be.an('object');
      expect(Object.keys(acc.devices).length).to.be.at.least(1);
      for(const k in acc.devices){
        expect(acc.devices[k].id).to.be.a('string');
        expect(acc.devices[k].node).to.be.a('string');
        expect(acc.devices[k].size).to.be.a('number').that.is.gte(0);
        expect(acc.devices[k].volumes).to.be.an('array');
        acc.devices[k].volumes.forEach((v) => {
          expect(typeof v.name === 'string' || v.name === null).to.be.true;
          expect(typeof v.description === 'string' || v.description === null).to.be.true;
          expect(v.mounted).to.be.a('boolean');
          expect(v.space).to.be.an('object').that.has.all.keys('total', 'available', 'used');
          expect(
            (
              v.space.total === null &&
              v.space.available === null &&
              v.space.used === null
            ) ||
            (
              typeof v.space.total === 'number' && v.space.total >= 0 &&
              typeof v.space.available === 'number' && v.space.available >= 0 &&
              typeof v.space.used === 'number' && v.space.used >= 0
            )
          ).to.be.true;
        });
      }
      done();
    });

    it('should properly parse the provided static input2', function(done){
      const input = fs.readFileSync(path.resolve(__dirname, 'input2.txt')).toString();
      const userFilter = () => true;
      const parseit = () => linux.parser(userFilter)(input);
      expect(parseit).to.not.throw();
      done();
    });

    it('should properly parse the provided static input3, and infer disk size', function(done){
      const input = fs.readFileSync(path.resolve(__dirname, 'input3.txt')).toString();
      const userFilter = () => true;
      const firstParse = linux.parser(userFilter)(input);
      const acc = inferDevSize(firstParse);
      expect(acc.devices).to.be.an('object');
      expect(Object.keys(acc.devices).length).to.be.at.least(1);
      for(const k in acc.devices){
        expect(acc.devices[k].id).to.be.a('string');
        expect(acc.devices[k].node).to.be.a('string');
        expect(acc.devices[k].size).to.be.a('number').that.is.gte(0);
        expect(acc.devices[k].volumes).to.be.an('array');
        acc.devices[k].volumes.forEach((v) => {
          expect(typeof v.name === 'string' || v.name === null).to.be.true;
          expect(typeof v.description === 'string' || v.description === null).to.be.true;
          expect(v.mounted).to.be.a('boolean');
          expect(v.space).to.be.an('object').that.has.all.keys('total', 'available', 'used');
          expect(
            (
              v.space.total === null &&
              v.space.available === null &&
              v.space.used === null
            ) ||
            (
              typeof v.space.total === 'number' && v.space.total >= 0 &&
              typeof v.space.available === 'number' && v.space.available >= 0 &&
              typeof v.space.used === 'number' && v.space.used >= 0
            )
          ).to.be.true;
        });
      };
      done();
    });
  });
});
