import os from 'os';
import { expect } from 'chai';
import sinon from 'sinon';
import {
  parseWindows,
  parseWindowsProps
} from '../../../src/windows/windows';

describe('windows unit tests', function(){
  describe('parseWindows', function(){
    it('should call parseWindowsProps after having split all lines, ' +
       'filtered empty lines and removed the table header', function(done){
      const input =
        `A  B  C${os.EOL}` +
        `${os.EOL}` +
        `0  a  b${os.EOL}` +
        `1  c  d${os.EOL}` +
        `${os.EOL}` +
        `2  e  f${os.EOL}` +
        `3  g  h${os.EOL}`;
      const parseWindowsPropsSpy = sinon.spy();
      const parseWindowsProps = (acc, x) => { parseWindowsPropsSpy(x); return acc; };
      const userFilterSpy = sinon.spy();
      const userFilter = (x) => { userFilterSpy(x); return true; };
      parseWindows(parseWindowsProps)(userFilter)(input);
      expect(parseWindowsPropsSpy.callCount).to.be.equal(4);
      expect(parseWindowsPropsSpy.getCall(0).calledWith(['0', 'a', 'b']));
      expect(parseWindowsPropsSpy.getCall(1).calledWith(['1', 'c', 'd']));
      expect(parseWindowsPropsSpy.getCall(2).calledWith(['2', 'e', 'f']));
      expect(parseWindowsPropsSpy.getCall(3).calledWith(['3', 'g', 'h']));
      done();
    });

    it('should call the filter function on all devices', function(done){
      const input =
        `Caption  Name  Filesystem  FreeSpace${os.EOL}` +
        `${os.EOL}` +
        `C:  C:  NTFS  2048${os.EOL}` +
        `D:  D:  FAT32  4096${os.EOL}` +
        `${os.EOL}` +
        `E:  E:  FAT16  1024${os.EOL}`;
      const parseWindowsPropsSpy = sinon.spy();
      const parseWindowsProps = (acc, [name, id, filesystem, size]) => {
        parseWindowsPropsSpy([name, id, filesystem, size]);
        acc.devices[name] = { id, name, fs: filesystem, size: parseInt(size) };
        return acc;
      };
      const userFilterSpy = sinon.spy();
      const userFilter = (v, k, o) => { userFilterSpy(v, k, o); return true; };
      const acc = parseWindows(parseWindowsProps)(userFilter)(input);
      expect(userFilterSpy.callCount).to.be.equal(3);
      expect(userFilterSpy.getCall(0).calledWith(acc.devices['C:'], 'C:', acc.devices));
      expect(userFilterSpy.getCall(1).calledWith(acc.devices['D:'], 'D:', acc.devices));
      expect(userFilterSpy.getCall(2).calledWith(acc.devices['E:'], 'E:', acc.devices));
      done();
    });
  });

  describe('parseWindowsProps', function(){
    it('should return a properly formatted object listing devices', function(done) {
      const acc = { devices: {} };
      const input = ['D:', 'CD-ROM Disc', 'D:', '3', 'CDFS', '0', 'D:', '59494400', 'VBOXADDITIONS_5.'];
      parseWindowsProps(acc, input);
      expect(acc).to.be.an('object').that.has.keys('devices');
      expect(acc.devices).to.be.an('object');
      expect(Object.keys(acc.devices).length).to.be.equal(1);

      expect(acc.devices[input[0]].id).to.be.a('string');
      expect(acc.devices[input[0]].node).to.be.a('string');
      expect(acc.devices[input[0]].name).to.be.a('string');
      expect(acc.devices[input[0]].size).to.be.a('number').that.is.gte(0);
      expect(acc.devices[input[0]].description).to.be.a('string');
      expect(acc.devices[input[0]].volumes).to.be.an('array').that.is.not.empty;
      acc.devices[input[0]].volumes.forEach((v) => {
        expect(typeof v.name === 'string' || v.name === null).to.be.true;
        expect(v.mounted).to.be.true;
        expect(v.mountPoint).to.be.equal(input[0]);
        expect(v.fs).to.be.a('string');
        expect(v.space).to.be.an('object').that.has.all.keys('total', 'available', 'used');
        expect(v.space.total).to.be.a('number').that.is.gte(0);
        expect(v.space.available).to.be.a('number').that.is.gte(0);
        expect(v.space.used).to.be.a('number').that.is.gte(0);
      });
      done();
    });

    it('should return a properly formatted object listing devices (duplicate device)', function(done) {
      const acc = { devices: { 'D:': {} } };
      const input = ['D:', 'CD-ROM Disc', 'D:', '3', 'CDFS', '0', 'D:', '59494400', 'VBOXADDITIONS_5.'];
      parseWindowsProps(acc, input);
      expect(acc).to.be.an('object').that.has.keys('devices');
      expect(acc.devices).to.be.an('object');
      expect(Object.keys(acc.devices).length).to.be.equal(1);

      expect(acc.devices[input[0]].id).to.be.a('string');
      expect(acc.devices[input[0]].node).to.be.a('string');
      expect(acc.devices[input[0]].name).to.be.a('string');
      expect(acc.devices[input[0]].size).to.be.a('number').that.is.gte(0);
      expect(acc.devices[input[0]].description).to.be.a('string');
      expect(acc.devices[input[0]].volumes).to.be.an('array').that.is.not.empty;
      acc.devices[input[0]].volumes.forEach((v) => {
        expect(typeof v.name === 'string' || v.name === null).to.be.true;
        expect(v.mounted).to.be.true;
        expect(v.mountPoint).to.be.equal(input[0]);
        expect(v.fs).to.be.a('string');
        expect(v.space).to.be.an('object').that.has.all.keys('total', 'available', 'used');
        expect(v.space.total).to.be.a('number').that.is.gte(0);
        expect(v.space.available).to.be.a('number').that.is.gte(0);
        expect(v.space.used).to.be.a('number').that.is.gte(0);
      });
      done();
    });
  });
});
