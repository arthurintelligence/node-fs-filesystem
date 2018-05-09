import fs from 'fs';
import path from 'path';
import { expect } from 'chai';
import sinon from 'sinon';
import { emptyDevice, emptyVolume } from '../../../src/utilities';
import {
  parseMacOS,
  macOSFS,
  getMacOSBytes,
  nodeType,
  getPropsTarget,
  addEmptyDevice,
  addEmptyVolumeToDevice,
  addEmptyNode,
  parseMacOSToProps,
  parseNodeId
} from '../../../src/macOS/macOS';

// tap :: Function -> a -> a
const tap = (f) => (x) => {
  f(x);
  return x;
};

describe('macOS unit tests', function(){
  describe('getMacOSBytes', function() {
    it('should return an integer specifying the size of the device in bytes', function(done){
      const input = '121.3 GB (121332826112 Bytes) (exactly 236978176 512-Byte-Units)';
      expect(getMacOSBytes(input)).to.be.equal(121332826112);
      done();
    });
  });

  describe('macOSFS', function() {
    it('should return the proper string for the MacOS file system descriptor provided', function(done){
      expect(macOSFS('ExFAT')).to.be.equal('ExFAT');
      expect(macOSFS('MS-DOS')).to.be.equal('FAT');
      expect(macOSFS('MS-DOS FAT12')).to.be.equal('FAT12');
      expect(macOSFS('MS-DOS FAT16')).to.be.equal('FAT16');
      expect(macOSFS('MS-DOS FAT32')).to.be.equal('FAT32');
      expect(macOSFS('fat32')).to.be.equal('FAT32');
      expect(macOSFS('HFS+')).to.be.equal('HFS+');
      expect(macOSFS('Case-sensitive HFS+')).to.be.equal('HFS+');
      expect(macOSFS('hfsx')).to.be.equal('HFS+');
      expect(macOSFS('Case-sensitive Journaled HFS+')).to.be.equal('HFS+');
      expect(macOSFS('jhfsx')).to.be.equal('HFS+');
      expect(macOSFS('Journaled HFS+')).to.be.equal('HFS+');
      expect(macOSFS('jhfs+')).to.be.equal('HFS+');
      done();
    });

    it('should return null for free disk space and any unrecognized fs descriptor provided', function(done){
      expect(macOSFS('Free Space')).to.be.equal(null);
      expect(macOSFS('free')).to.be.equal(null);
      expect(macOSFS('default')).to.be.equal(null);
      expect(macOSFS('random')).to.be.equal(null);
      expect(macOSFS('ext4')).to.be.equal(null);
      expect(macOSFS('ext3')).to.be.equal(null);
      expect(macOSFS('vfat')).to.be.equal(null);
      done();
    });
  });

  describe('nodeType', function(){
    it('should return \'volume\' if the space property is present', function(done){
      expect(nodeType({space: {}})).to.be.equal('volume');
      done();
    });

    it('should return \'device\' if the space property is not present', function(done){
      expect(nodeType({})).to.be.equal('device');
      done();
    });
  });

  describe('getPropsTarget', function(){
    const acc = {
      devices: {
        a: { volumes: { aa: {} } }
      }
    };
    it('should return the device if no volume id is specified', function(done){
      expect(getPropsTarget(acc, ['a', undefined])).to.be.equal(acc.devices.a);
      done();
    });

    it('should return the volume if volume id is specified', function(done){
      expect(getPropsTarget(acc, ['a', 'aa'])).to.be.equal(acc.devices.a.volumes.aa);
      done();
    });
  });

  describe('addEmptyDevice', function(){
    it('should add an empty device at the specified id', function(done){
      const acc = {
        devices: {}
      };
      addEmptyDevice(acc)('a');
      expect(acc.devices.a).to.be.an('object').that.has.all.keys(
        'id', 'node', 'whole', 'parent', 'name', 'size', 'protocol',
        'description', 'blockSize', 'readOnly', 'removable'
      );
      done();
    });
  });

  describe('addEmptyVolumeToDevice', function(){
    it('should add an empty volume to the specified device at the specified id', function(done){
      const device = { volumes: {} };
      addEmptyVolumeToDevice(device)('aa');
      expect(device.volumes.aa).to.be.an('object').that.has.all.keys(
        'id', 'name', 'node', 'parent', 'whole', 'description', 'blockSize', 'blocks', 'readOnly',
        'mounted', 'mountPoint', 'partitionType', 'fs', 'space'
      );
      done();
    });

    it('should add an empty volume to the specified device at the specified id even if the volumes property is undefined', function(done){
      const device = {};
      addEmptyVolumeToDevice(device)('aa');
      expect(device.volumes.aa).to.be.an('object').that.has.all.keys(
        'id', 'name', 'node', 'parent', 'whole', 'description', 'blockSize', 'blocks', 'readOnly',
        'mounted', 'mountPoint', 'partitionType', 'fs', 'space'
      );
      done();
    });
  });

  describe('addEmptyNode', function() {
    it('should call addEmptyDevice if only provided a device id', function(done){
      const addEmptyDeviceSpy = sinon.spy();
      const addEmptyDevice = () => addEmptyDeviceSpy;
      const addEmptyVolumeToDeviceSpy = sinon.spy();
      const addEmptyVolumeToDevice = () => addEmptyVolumeToDeviceSpy;
      addEmptyNode(addEmptyDevice, addEmptyVolumeToDevice)({}, ['a', undefined]);
      expect(addEmptyDeviceSpy.calledOnce).to.be.true;
      expect(addEmptyVolumeToDeviceSpy.notCalled).to.be.true;
      done();
    });

    it('should call addEmptyVolumeToDevice if provided both a device id and volume id', function(done){
      const acc = {
        devices: {}
      };
      const addEmptyDeviceSpy = sinon.spy();
      const addEmptyDevice = () => addEmptyDeviceSpy;
      const addEmptyVolumeToDeviceSpy = sinon.spy();
      const addEmptyVolumeToDevice = () => addEmptyVolumeToDeviceSpy;
      addEmptyNode(addEmptyDevice, addEmptyVolumeToDevice)(acc)(['a', 'aa']);
      expect(addEmptyVolumeToDeviceSpy.calledOnce).to.be.true;
      expect(addEmptyDeviceSpy.notCalled).to.be.true;
      done();
    });
  });

  describe('parseNodeId', function(){
    it('should obtain the device id from the provided lines', function(done){
      const lines = [ 'Device Identifier:        disk0' ];
      const acc = {
        devices: {}
      };
      const [devid, id] = parseNodeId(acc, lines);
      expect(devid).to.be.equal('disk0');
      expect(id).to.be.undefined;
      done();
    });

    it('should obtain the device id and volume id provided an accumulator that has a matching device', function(done){
      const lines = [ 'Device Identifier:        disk0s1' ];
      const acc = {
        devices: {
          disk0: {}
        }
      };
      const [devid, id] = parseNodeId(acc, lines);
      expect(devid).to.be.equal('disk0');
      expect(id).to.be.equal('disk0s1');
      done();
    });
  });

  // TODO: Add more coverage for the dual node case
  describe('parseMacOSToProps', function(done){
    const input = {
      'Device Identifier': { target: 'device', key: 'id', value: 'disk1s1', nullable: false },
      'Device Node': { target: 'device', key: 'node', value: '/dev/disk1s1', nullable: false },
      'Whole': { target: 'device', key: 'whole', value: 'No', nullable: false },
      'Part of Whole': { target: 'device', key: 'parent', value: 'disk1', nullable: false },
      'Device / Media Name': { target: 'device', key: 'description', value: 'APPLE HDD ST2000DM999', nullable: false },
      'Volume Name': { target: 'volume', key: 'name', value: 'Macintosh HD', nullable: 'Not applicable' },
      'Mounted': { target: 'volume', key: 'mounted', value: 'Yes', nullable: false },
      'Mount Point': { target: 'volume', key: 'mountPoint', value: '/', nullable: 'Not applicable' },
      'File System Personality': { target: 'volume', key: 'fs', value: 'MS-DOS FAT32', nullable: false },
      'Partition Type': { target: 'volume', key: 'partitionType', value: 'EFI', nullable: false },
      'Protocol': { target: 'device', key: 'protocol', value: 'SATA', nullable: false },
      'Disk Size': { target: 'device', key: 'size', value: '209.7 MB (209715200 Bytes) (exactly 409600 512-Byte-Units)', nullable: false },
      'Total Size': { target: 'device', key: 'size', value: '209.7 MB (209715200 Bytes) (exactly 409600 512-Byte-Units)', nullable: false },
      'Device Block Size': { target: 'device', key: 'blockSize', value: '512 Bytes', nullable: false },
      'Volume Total Space': { target: 'volume', key: 'space.total', value: '209.7 MB (209715200 Bytes) (exactly 409600 512-Byte-Units)', nullable: false },
      'Volume Used Space': { target: 'volume', key: 'space.used', value: '209.7 MB (209715200 Bytes) (exactly 409600 512-Byte-Units)', nullable: false },
      'Volume Available Space': { target: 'volume', key: 'space.available', value: '0 B (0 Bytes) (exactly 0 512-Byte-Units)', nullable: false },
      'Allocation Block Size': { target: 'volume', key: 'blockSize', value: '4096 Bytes', nullable: false },
      'Read-Only Media': { target: 'device', key: 'readOnly', value: 'No', nullable: false },
      'Read-Only Volume': { target: 'volume', key: 'readOnly', value: 'No', nullable: 'Not applicable (not mounted)' },
      'Removable Media': { target: 'device', key: 'removable', value: 'Fixed', nullable: false }
    };

    it('should properly parse the provided keys and update the current node accordingly', function(done) {
      const macOSFSSpy = sinon.spy();
      const macOSFS = (value) => { macOSFSSpy(value); return 'FAT32'; };
      const getMacOSBSpy = sinon.spy();
      const getMacOSB = (value) => { getMacOSBSpy(value); return 209715200; };
      const parseProps = parseMacOSToProps(macOSFS, getMacOSB);

      for(const k in input){
        const line = input[k];
        const empty = line.target === 'device' ? emptyDevice : emptyVolume;
        const node = parseProps(empty(), k, line.value);

        if(line.key.indexOf('space') !== -1){
          const key = line.key.split('.')[1];
          expect(node.space[key]).not.to.be.null;
        }else{
          expect(node[line.key]).not.to.be.null;
        }
      }
      // Check that all lower order functions have been called the expected number of times
      expect(macOSFSSpy.callCount).to.be.equal(1);
      expect(getMacOSBSpy.callCount).to.be.equal(5);
      done();
    });

    it('should properly parse the provided keys and update the current device accordingly (nullable)', function(done) {
      const macOSFS = () => { return 'FAT32'; };
      const getMacOSB = () => { return 209715200; };
      const parseProps = parseMacOSToProps(macOSFS, getMacOSB);

      const keys = Object.keys(input).filter((k) => input[k].nullable);
      for(let k of keys){
        const line = input[k];
        const empty = line.target === 'device' ? emptyDevice() : emptyVolume();
        empty[line.key] = undefined;
        const node = parseProps(empty, k, line.nullable);
        expect(node[line.key]).to.be.null;
      }
      done();
    });
  });

  describe('parseMacOS', function(){
    const input = fs.readFileSync(path.resolve(__dirname, 'input.txt')).toString().replace(/\r\n/g, '\n');

    it('should split the input into the right number of nodes and differentiate ' +
       'devices from volumes', function(done){
      const userFilter = () => true;
      const parseProps = (x) => x;
      const acc = parseMacOS(
        getPropsTarget,
        addEmptyNode(addEmptyDevice, addEmptyVolumeToDevice),
        parseNodeId,
        parseProps
      )(userFilter)(input);
      const devices = Object.keys(acc.devices);
      expect(devices.length).to.be.equal(3);
      expect(acc.devices['disk0'].volumes.length).to.be.equal(3);
      expect(acc.devices['disk1'].volumes.length).to.be.equal(3);
      expect(acc.devices['disk2'].volumes.length).to.be.equal(0);
      done();
    });

    it('should call parseMacOSToProps for each line', function(done){
      const userFilter = () => true;
      const parsePropsSpy = sinon.spy();
      const parseProps = tap(parsePropsSpy);
      parseMacOS(
        getPropsTarget,
        addEmptyNode(addEmptyDevice, addEmptyVolumeToDevice),
        parseNodeId,
        parseProps
      )(userFilter)(input);
      expect(parsePropsSpy.callCount).to.be.equal(229);
      done();
    });

    it('should call userFilter for each device', function(done){
      const userFilterSpy = sinon.spy();
      const userFilter = (v, k) => { userFilterSpy(k); return true; };
      const parseProps = (x) => x;
      parseMacOS(
        getPropsTarget,
        addEmptyNode(addEmptyDevice, addEmptyVolumeToDevice),
        parseNodeId,
        parseProps
      )(userFilter)(input);
      expect(userFilterSpy.callCount).to.be.equal(3);
      done();
    });
  });
});
