import os from 'os';
import { expect } from 'chai';
import sinon from 'sinon';
import { emptyDevice, emptyVolume } from '../../../src/utilities';
import {
  getNodeId,
  createNewDevice,
  createNewVolume,
  mergeVolumesAndDevicesLinux,
  parselsblkDeviceData,
  parselsblkVolumeData,
  parselsblk,
  parsefdisklDeviceData,
  parsefdisklVolumeData,
  parsefdiskl,
  splitdfTLine,
  parsedfT,
  parseLinux,
} from '../../../src/linux/linux';

// tap :: Function -> a -> a
const tap = (f) => (x) => {
  f(x);
  return x;
};

describe('linux unit tests', function(){
  describe('getNodeId', function(){
    it('should return the node id out of the /dev/ path', function(done){
      expect(getNodeId('/dev/sda2')).to.be.equal('sda2');
      done();
    });

    it('should return the node id out of the /dev/, stripped of any trailing forward slashes', function(done){
      expect(getNodeId('/dev/sda2/')).to.be.equal('sda2');
      done();
    });
  });

  describe('createNewDevice', function(){
    it('should call emptyDevice and update id, node, name, whole and parent properties', function(done){
      const emptyDeviceSpy = sinon.spy();
      const emptyDevice = () => { emptyDeviceSpy(); return {}; };
      const id = 'sda';

      const device = createNewDevice(emptyDevice)(id);
      expect(emptyDeviceSpy.calledOnce).to.be.true;
      expect(device).to.be.an('object').that.has.all.keys('id', 'node', 'name', 'whole', 'parent');
      expect(device.id).to.be.equal(id);
      expect(device.node).to.be.equal(`/dev/${id}`);
      expect(device.name).to.be.equal(id);
      expect(device.whole).to.be.true;
      expect(device.parent).to.be.equal(id);
      done();
    });

    it('should use the provided node to update the device.node property', function(done){
      const emptyDevice = () => ({});
      const id = 'sda';
      const node = '/dev/mynode';
      const device = createNewDevice(emptyDevice)(id, node);
      expect(device).to.be.an('object').that.has.all.keys('id', 'node', 'name', 'whole', 'parent');
      expect(device.node).to.be.equal(node);
      done();
    });
  });

  describe('createNewVolume', function(){
    it('should call emptyVolume and update id, node, name and parent properties', function(done){
      const emptyVolumeSpy = sinon.spy();
      const emptyVolume = () => { emptyVolumeSpy(); return {}; };
      const id = 'sda';

      const volume = createNewVolume(emptyVolume)(id);
      expect(emptyVolumeSpy.calledOnce).to.be.true;
      expect(volume).to.be.an('object').that.has.all.keys('id', 'node', 'name', 'parent');
      expect(volume.id).to.be.equal(id);
      expect(volume.node).to.be.equal(`/dev/${id}`);
      expect(volume.name).to.be.equal(id);
      expect(volume.parent).to.be.equal(id);
      done();
    });

    it('should use the provided node to update the device.node property', function(done){
      const emptyVolume = () => ({});
      const id = 'sda';
      const node = '/dev/mynode';
      const volume = createNewVolume(emptyVolume)(id, node);
      expect(volume).to.be.an('object').that.has.all.keys('id', 'node', 'name', 'parent');
      expect(volume.node).to.be.equal(node);
      done();
    });
  });

  describe('splitdfTLine', function(){
    it('should split the df -T line by spaces', function(done){
      const line = `/dev/sda2      ext4     224044588 191265856  21374856  90% /${os.EOL}`;
      const fields = splitdfTLine(line);
      expect(fields.length).to.be.equal(7);
      done();
    });

    it('should split the df -T line by spaces while ignoring spaces that are escaped using \'\\\'', function(done){
      const line = `/dev/sda2      ext4     224044588 191265856  21374856  90% /dev/sda2/Hello\\ World${os.EOL}`;
      const fields = splitdfTLine(line);
      expect(fields.length).to.be.equal(7);
      done();
    });
  });

  describe('parsedfT', function(){
    it('should properly parse the input to the accumulator', function(done){
      const input =
        `Filesystem     Type     1K-blocks      Used Available Use% Mounted on${os.EOL}` +
        `udev           devtmpfs   8033312         0   8033312   0% /dev${os.EOL}` +
        `tmpfs          tmpfs      1610744      9616   1601128   1% /run${os.EOL}` +
        `/dev/sda2      ext4     224044588 191265856  21374856  90% /${os.EOL}`;
      const getNodeId = () => 'sda2';
      const createNewVolume = () => { return { space: { total: null, used: null, available: null } }; };

      const acc = parsedfT(getNodeId, createNewVolume, splitdfTLine)(input)({ devices: {}, volumes: {} });
      expect(acc).to.be.an('object').that.has.all.keys('devices', 'volumes');
      expect(Object.keys(acc.devices).length).to.be.equal(0);
      expect(Object.keys(acc.volumes).length).to.be.equal(1);
      expect(acc.volumes.sda2).to.be.an('object');
      expect(acc.volumes.sda2.mounted).to.be.true;
      expect(acc.volumes.sda2.mountPoint).to.be.equal('/');
      expect(acc.volumes.sda2.fs).to.be.equal('ext4');
      expect(acc.volumes.sda2.space.total).to.be.equal(1024 * 224044588);
      expect(acc.volumes.sda2.space.available).to.be.equal(1024 * 21374856);
      expect(acc.volumes.sda2.space.used).to.be.equal(1024 * 191265856);
      done();
    });
  });

  describe('parsefdisklDeviceData', function(){
    it('should generate a new device node and add the size, blockSize and ' +
      'volumeBlockSize properties', function(done){
      const input = [
        'Disk /dev/sda: 232.9 GiB, 250059350016 bytes, 488397168 sectors',
        'Units: sectors of 1 * 512 = 512 bytes',
        'Sector size (logical/physical): 512 bytes / 512 bytes',
        'I/O size (minimum/optimal): 512 bytes / 512 bytes',
        'Disklabel type: gpt',
        'Disk identifier: 5E58417C-8527-9F21-6D0C-160DE8885931',
      ];
      const getNodeId = () => 'sda';
      const createNewDevice = () => { return {}; };

      const acc = parsefdisklDeviceData(getNodeId, createNewDevice)({ devices: {}, volumes: {} })(input);
      expect(acc).to.be.an('object').that.has.all.keys('devices', 'volumes');
      expect(Object.keys(acc.devices).length).to.be.equal(1);
      expect(Object.keys(acc.volumes).length).to.be.equal(0);
      expect(acc.devices.sda).to.be.an('object');
      expect(acc.devices.sda.size).to.be.equal(250059350016);
      expect(acc.devices.sda.blocks).to.be.equal(488397168);
      expect(acc.devices.sda.blockSize).to.be.equal(512);
      expect(acc.devices.sda.volumeBlockSize).to.be.equal(512);
      done();
    });

    it('should update the blocks, size, blockSize and volumeBlockSize properties ' +
      'of an existing device node', function(done){
      const input = [
        'Disk /dev/sda: 232.9 GiB, 250059350016 bytes, 488397168 sectors',
        'Units: sectors of 1 * 512 = 512 bytes',
        'Sector size (logical/physical): 512 bytes / 512 bytes',
        'I/O size (minimum/optimal): 512 bytes / 512 bytes',
        'Disklabel type: gpt',
        'Disk identifier: 5E58417C-8527-9F21-6D0C-160DE8885931',
      ];
      const sda = emptyDevice();
      sda.node = '/dev/sdz';
      sda.id = 'sdz';
      sda.name = 'sdz';
      sda.whole = false;
      sda.parent = 'sdz';

      const acc = parsefdisklDeviceData(getNodeId)({ devices: { sda }, volumes: {} })(input);
      expect(acc).to.be.an('object').that.has.all.keys('devices', 'volumes');
      expect(Object.keys(acc.devices).length).to.be.equal(1);
      expect(Object.keys(acc.volumes).length).to.be.equal(0);
      expect(acc.devices.sda).to.be.an('object');
      expect(acc.devices.sda.id).to.be.equal('sdz');
      expect(acc.devices.sda.node).to.be.equal('/dev/sdz');
      expect(acc.devices.sda.name).to.be.equal('sdz');
      expect(acc.devices.sda.whole).to.be.false;
      expect(acc.devices.sda.parent).to.be.equal('sdz');
      expect(acc.devices.sda.size).to.be.equal(250059350016);
      expect(acc.devices.sda.blocks).to.be.equal(488397168);
      expect(acc.devices.sda.blockSize).to.be.equal(512);
      expect(acc.devices.sda.volumeBlockSize).to.be.equal(512);
      done();
    });
  });

  describe('parsefdisklVolumeData', function(){
    it('should generate a new volume node and add the blocks and description ' +
      'properties', function(done){
      const input = ['/dev/sda1       2048      4095      2048     1.1M BIOS boot'];
      const getNodeId = () => 'sda1';
      const createNewVolume = () => { return {}; };

      const acc = parsefdisklVolumeData(getNodeId, createNewVolume)({ devices: {}, volumes: {} })(input);
      expect(acc).to.be.an('object').that.has.all.keys('devices', 'volumes');
      expect(Object.keys(acc.devices).length).to.be.equal(0);
      expect(Object.keys(acc.volumes).length).to.be.equal(1);
      expect(acc.volumes.sda1).to.be.an('object');
      expect(acc.volumes.sda1.blocks).to.be.equal(2048);
      expect(acc.volumes.sda1.description).to.be.equal('BIOS boot');
      done();
    });

    it('should update the blocks and description properties of an existing device ' +
      'node', function(done){
      const input = ['/dev/sda1       2048      4095      2048     1M BIOS boot'];
      const sda1 = emptyVolume();
      sda1.node = '/dev/sdz1';
      sda1.id = 'sdz1';
      sda1.name = 'sdz1';
      sda1.whole = true;
      sda1.parent = 'sdza';
      sda1.mounted = true;

      const acc = parsefdisklVolumeData(getNodeId, () => {})({ devices: {}, volumes: { sda1 } })(input);
      expect(acc).to.be.an('object').that.has.all.keys('devices', 'volumes');
      expect(Object.keys(acc.devices).length).to.be.equal(0);
      expect(Object.keys(acc.volumes).length).to.be.equal(1);
      expect(acc.volumes.sda1).to.be.an('object');
      expect(acc.volumes.sda1.id).to.be.equal('sdz1');
      expect(acc.volumes.sda1.node).to.be.equal('/dev/sdz1');
      expect(acc.volumes.sda1.name).to.be.equal('sdz1');
      expect(acc.volumes.sda1.whole).to.be.true;
      expect(acc.volumes.sda1.mounted).to.be.true;
      expect(acc.volumes.sda1.parent).to.be.equal('sdza');
      expect(acc.volumes.sda1.blocks).to.be.equal(2048);
      expect(acc.volumes.sda1.description).to.be.equal('BIOS boot');
      done();
    });
  });

  describe('parsefdiskl', function(){
    it('should split the input into three blocks and call the proper parser functions', function(done){
      const input =
        `Disk a${os.EOL}` +
        `b${os.EOL}` +
        `c${os.EOL}` +
        `${os.EOL}` +
        `Device ${os.EOL}` +
        `0${os.EOL}` +
        `1${os.EOL}` +
        `2${os.EOL}` +
        `${os.EOL}` +
        `${os.EOL}` +
        `Disk d${os.EOL}` +
        `e${os.EOL}` +
        `f${os.EOL}`;
      const parsefdisklDeviceDataSpy = sinon.spy();
      const parsefdisklDeviceData = (acc) => tap(parsefdisklDeviceDataSpy);
      const parsefdisklVolumeDataSpy = sinon.spy();
      const parsefdisklVolumeData = (acc) => tap(parsefdisklVolumeDataSpy);
      parsefdiskl(parsefdisklDeviceData, parsefdisklVolumeData)(input)({ devices: {}, volumes: {} });

      expect(parsefdisklDeviceDataSpy.callCount).to.be.equal(2);
      expect(parsefdisklDeviceDataSpy.getCall(0).calledWith(['Disk a', 'b', 'c'])).to.be.true;
      expect(parsefdisklDeviceDataSpy.getCall(1).calledWith(['Disk d', 'e', 'f'])).to.be.true;
      expect(parsefdisklVolumeDataSpy.callCount).to.be.equal(1);
      expect(parsefdisklVolumeDataSpy.getCall(0).calledWith(['0', '1', '2'])).to.be.true;
      done();
    });
  });

  describe('parselsblkDeviceData', function(){
    it('should generate a new device node and add the readOnly, removable and ' +
      'description properties', function(done){
      const input = ['sda', '', '', '', '0', '0', 'Samsung SSD 850', 'disk'];
      const createNewDevice = () => { return {}; };

      const acc = parselsblkDeviceData(createNewDevice)({ devices: {}, volumes: {} })(input);
      expect(acc).to.be.an('object').that.has.all.keys('devices', 'volumes');
      expect(Object.keys(acc.devices).length).to.be.equal(1);
      expect(Object.keys(acc.volumes).length).to.be.equal(0);
      expect(acc.devices.sda).to.be.an('object');
      expect(acc.devices.sda.readOnly).to.be.false;
      expect(acc.devices.sda.removable).to.be.false;
      expect(acc.devices.sda.description).to.be.null;
      done();
    });

    it('should update the readOnly, removable and description properties ' +
      'of an existing device node', function(done){
      const input = ['sda', '', '', '', '0', '0', 'Samsung SSD 850', 'disk'];
      const sda = emptyDevice();
      sda.id = 'sdz';
      sda.node = '/dev/sdz';
      sda.name = 'sdz';
      sda.whole = false;
      sda.parent = 'sdz';
      sda.description = 'SDZ BEST VOLUME EVAH';

      const acc = parselsblkDeviceData(() => {})({ devices: { sda }, volumes: {} })(input);
      expect(acc).to.be.an('object').that.has.all.keys('devices', 'volumes');
      expect(Object.keys(acc.devices).length).to.be.equal(1);
      expect(Object.keys(acc.volumes).length).to.be.equal(0);
      expect(acc.devices.sda).to.be.an('object');
      expect(acc.devices.sda.id).to.be.equal('sdz');
      expect(acc.devices.sda.node).to.be.equal('/dev/sdz');
      expect(acc.devices.sda.name).to.be.equal('sdz');
      expect(acc.devices.sda.whole).to.be.false;
      expect(acc.devices.sda.parent).to.be.equal('sdz');
      expect(acc.devices.sda.readOnly).to.be.false;
      expect(acc.devices.sda.removable).to.be.false;
      expect(acc.devices.sda.description).to.be.equal('SDZ BEST VOLUME EVAH');
      done();
    });
  });

  describe('parselsblkVolumeData', function(){
    it('should generate a new volume node and add the fs, mounted, mountPoint, ' +
      'readOnly, removable and description properties', function(done){
      const input = ['sdc1', 'vfat', '/media/username/KINGSTON', 'KINGSTON', '0', '1', '', 'part'];
      const createNewVolume = () => { return {}; };

      const acc = parselsblkVolumeData(createNewVolume)({ devices: {}, volumes: {} })(input);
      expect(acc).to.be.an('object').that.has.all.keys('devices', 'volumes');
      expect(Object.keys(acc.devices).length).to.be.equal(0);
      expect(Object.keys(acc.volumes).length).to.be.equal(1);
      expect(acc.volumes.sdc1.fs).to.be.equal('vfat');
      expect(acc.volumes.sdc1.mounted).to.be.true;
      expect(acc.volumes.sdc1.mountPoint).to.be.equal('/media/username/KINGSTON');
      expect(acc.volumes.sdc1.readOnly).to.be.false;
      expect(acc.volumes.sdc1.removable).to.be.true;
      expect(acc.volumes.sdc1.description).to.be.equal('KINGSTON');
      done();
    });

    it('should update the blocks and description properties of an existing device ' +
      'node', function(done){
      const input = ['sdc1', 'vfat', '/media/username/KINGSTON', '', '0', '1', '', 'part'];
      const sdc1 = emptyVolume();
      sdc1.node = '/dev/sdz1';
      sdc1.id = 'sdz1';
      sdc1.name = 'sdz1';
      sdc1.whole = true;
      sdc1.parent = 'sdza';

      const acc = parselsblkVolumeData(() => {})({ devices: {}, volumes: { sdc1 } })(input);
      expect(acc).to.be.an('object').that.has.all.keys('devices', 'volumes');
      expect(Object.keys(acc.devices).length).to.be.equal(0);
      expect(Object.keys(acc.volumes).length).to.be.equal(1);
      expect(acc.volumes.sdc1).to.be.an('object');
      expect(acc.volumes.sdc1.id).to.be.equal('sdz1');
      expect(acc.volumes.sdc1.node).to.be.equal('/dev/sdz1');
      expect(acc.volumes.sdc1.name).to.be.equal('sdz1');
      expect(acc.volumes.sdc1.whole).to.be.true;
      expect(acc.volumes.sdc1.parent).to.be.equal('sdza');
      expect(acc.volumes.sdc1.fs).to.be.equal('vfat');
      expect(acc.volumes.sdc1.mounted).to.be.true;
      expect(acc.volumes.sdc1.mountPoint).to.be.equal('/media/username/KINGSTON');
      expect(acc.volumes.sdc1.readOnly).to.be.false;
      expect(acc.volumes.sdc1.removable).to.be.true;
      expect(acc.volumes.sdc1.description).to.be.null;
      done();
    });
  });

  describe('parselsblk', function(){
    it('should sanitize the input by splitting into lines, removing empty lines ' +
      'and splitting by fields', function(done){
      const input =
        `${os.EOL}` +
        `KNAME="sda" FSTYPE="" MOUNTPOINT="" LABEL="" RO="0" RM="0" MODEL="Samsung SSD 850 " TYPE="disk"${os.EOL}` +
        `${os.EOL}` +
        `KNAME="sda1" FSTYPE="" MOUNTPOINT="" LABEL="" RO="0" RM="0" MODEL="" TYPE="part"${os.EOL}` +
        `KNAME="sdb" FSTYPE="" MOUNTPOINT="" LABEL="" RO="0" RM="0" MODEL="TOSHIBA MK5061GS" TYPE="disk"${os.EOL}`;
      const spy = sinon.spy();
      const parselsblkDeviceData = (acc) =>
        (values) => { spy(values); return acc; };
      const parselsblkVolumeData = (acc) =>
        (values) => { spy(values); return acc; };
      parselsblk(parselsblkDeviceData, parselsblkVolumeData)(input)({ devices: {}, volumes: {} });
      expect(spy.callCount).to.be.equal(3);
      expect(spy.getCall(0).calledWith(['sda', '', '', '', '0', '0', 'Samsung SSD 850 ', 'disk'])).to.be.true;
      expect(spy.getCall(1).calledWith(['sda1', '', '', '', '0', '0', '', 'part'])).to.be.true;
      expect(spy.getCall(2).calledWith(['sdb', '', '', '', '0', '0', 'TOSHIBA MK5061GS', 'disk'])).to.be.true;
      done();
    });

    it('should call parselsblkDeviceData for each line that has TYPE="disk", and ' +
      'parselsblkVolumeData for every line that has TYPE="part"', function(done){
      const input =
        `KNAME="sda" FSTYPE="" MOUNTPOINT="" LABEL="" RO="0" RM="0" MODEL="Samsung SSD 850 " TYPE="disk"${os.EOL}` +
        `KNAME="sda1" FSTYPE="" MOUNTPOINT="" LABEL="" RO="0" RM="0" MODEL="" TYPE="part"${os.EOL}` +
        `KNAME="sdb" FSTYPE="" MOUNTPOINT="" LABEL="" RO="0" RM="0" MODEL="TOSHIBA MK5061GS" TYPE="disk"${os.EOL}`;
      const parselsblkDeviceDataSpy = sinon.spy();
      const parselsblkDeviceData = (acc) =>
        (values) => { parselsblkDeviceDataSpy(values); return acc; };
      const parselsblkVolumeDataSpy = sinon.spy();
      const parselsblkVolumeData = (acc) =>
        (values) => { parselsblkVolumeDataSpy(values); return acc; };
      parselsblk(parselsblkDeviceData, parselsblkVolumeData)(input)({ devices: {}, volumes: {} });
      expect(parselsblkDeviceDataSpy.callCount).to.be.equal(2);
      expect(parselsblkVolumeDataSpy.callCount).to.be.equal(1);
      done();
    });
  });

  describe('mergeVolumesAndDevicesLinux', function(){
    it('should map the volumes to the devices as device.volumes arrays', function(done){
      const acc = {
        devices: {
          'sda': {},
          'sdb': {},
          'sdc': {},
        },
        volumes: {
          'sda1': { id: 'sda1' },
          'sda2': { id: 'sda2' },
          'sdb1': { id: 'sdb1' },
        },
      };
      const merged = mergeVolumesAndDevicesLinux(emptyDevice)(acc);
      const expectedKeys = Object.keys(emptyDevice());
      expect(merged).to.be.an('object').that.has.all.keys('devices');
      expect(merged).not.to.have.keys('volumes');
      expect(merged.devices.sda).to.be.an('object').that.has.all.keys(...expectedKeys, 'volumes');
      expect(merged.devices.sda.volumes).to.be.an('array').of.length(2);
      expect(merged.devices.sda.volumes[0].id).to.be.equal('sda1');
      expect(merged.devices.sda.volumes[1].id).to.be.equal('sda2');
      expect(merged.devices.sdb).to.be.an('object').that.has.all.keys(...expectedKeys, 'volumes');
      expect(merged.devices.sdb.volumes).to.be.an('array').of.length(1);
      expect(merged.devices.sdb.volumes[0].id).to.be.equal('sdb1');
      expect(merged.devices.sdc).to.be.an('object').that.has.all.keys(...expectedKeys, 'volumes');
      expect(merged.devices.sdc.volumes).to.be.an('array').of.length(0);
      done();
    });

    it('should map each device\'s volumeBlockSize property to the blockSize ' +
      'property of its volumes', function(done){
      const acc = {
        devices: {
          'sda': { volumeBlockSize: 512 },
        },
        volumes: {
          'sda1': { id: 'sda1' },
        },
      };
      const merged = mergeVolumesAndDevicesLinux(emptyDevice)(acc);
      const expectedKeys = Object.keys(emptyDevice());
      expect(merged).to.be.an('object').that.has.all.keys('devices');
      expect(merged).not.to.have.keys('volumes');
      expect(merged.devices.sda).to.be.an('object').that.has.keys(...expectedKeys, 'volumes');
      expect(merged.devices.sda.volumes).to.be.an('array').of.length(1);
      expect(merged.devices.sda.volumes[0].blockSize).to.be.equal(512);
      done();
    });
  });

  describe('parseLinux', function(){
    it('should split the input in three part before passing it to the parselslk, ' +
      'parsefdiskl and parsedfT functions', function(done){
      const dftinput = `df -T data\n0\n1\n2\n`;
      const fdiskinput = `fdisk -l data\n3\n4\n5\n`;
      const lsblkinput = `lsblk -o data\n6\n7\n8\n`;
      const input =
        dftinput +
        `\n**********\n\n` +
        fdiskinput +
        `\n**********\n\n` +
        lsblkinput;
      const parsedfTSpy = sinon.spy();
      const parsedfT = (input) => (acc) => {
        parsedfTSpy(input);
        return acc;
      };
      const parsefdisklSpy = sinon.spy();
      const parsefdiskl = (input) => (acc) => {
        parsefdisklSpy(input);
        return acc;
      };
      const parselsblkSpy = sinon.spy();
      const parselsblk = (input) => (acc) => {
        parselsblkSpy(input);
        return acc;
      };
      const mergeVolumesAndDevicesLinuxSpy = sinon.spy();
      const mergeVolumesAndDevicesLinux = tap(mergeVolumesAndDevicesLinuxSpy);
      const userFilter = () => true;

      parseLinux(mergeVolumesAndDevicesLinux, parselsblk, parsefdiskl, parsedfT)(userFilter)(input);
      expect(parsedfTSpy.callCount).to.be.equal(1);
      expect(parsedfTSpy.getCall(0).calledWith(dftinput)).to.be.true;
      expect(parsefdisklSpy.callCount).to.be.equal(1);
      expect(parsefdisklSpy.getCall(0).calledWith(fdiskinput)).to.be.true;
      expect(parselsblkSpy.callCount).to.be.equal(1);
      expect(parselsblkSpy.getCall(0).calledWith(lsblkinput)).to.be.true;
      done();
    });

    it('should call userFilter on all of the devices', function(done){
      const dftinput = `df -T data\n0\n1\n2\n`;
      const fdiskinput = `fdisk -l data\n3\n4\n5\n`;
      const lsblkinput = `lsblk -o data\n6\n7\n8\n`;
      const input =
        dftinput +
        `\n**********\n\n` +
        fdiskinput +
        `\n**********\n\n` +
        lsblkinput;
      const devices = {
        'sda': { id: 'sda' },
        'sdb': { id: 'sdb' },
        'sdc': { id: 'sdc' },
      };
      const parsedfT = () => tap;
      const parsefdiskl = () => (acc) => acc;
      const parselsblk = () => (acc) => acc;
      const mergeVolumesAndDevicesLinux = () => ({ devices });
      const userFilterSpy = sinon.spy();
      const userFilter = (v, k, o) => { userFilterSpy(v, k, o); return k !== 'sdb'; };

      const acc =
        parseLinux(mergeVolumesAndDevicesLinux, parselsblk, parsefdiskl, parsedfT)(userFilter)(input);
      expect(acc).to.be.an('object').that.has.keys('devices');
      expect(Object.keys(acc.devices).length).to.be.equal(2);
      expect(userFilterSpy.callCount).to.be.equal(3);
      expect(userFilterSpy.getCall(0).calledWith(devices.sda)).to.be.true;
      expect(userFilterSpy.getCall(1).calledWith(devices.sdb)).to.be.true;
      expect(userFilterSpy.getCall(2).calledWith(devices.sdc)).to.be.true;
      done();
    });
  });
});
