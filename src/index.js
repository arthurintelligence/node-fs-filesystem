import os from 'os';
import child from 'child_process';
import R from 'ramda';
import Promise from 'bluebird';
import F from './functional';
const { identity, constant, ifElse, cond, each, eqeqeq, tautology, thrower } = F;
const { compose, composeP, map, reduce, filter } = F.R;
child.exec = Promise.promisify(child.exec, { context: child });

const COMMANDS = {
  MACOS: 'diskutil info -all',
  LINUX: 'df -T && ' +
    'echo "" && echo "**********" && echo "" && ' +
    'fdisk -l && ' +
    'echo "" && echo "**********" && echo "" && ' +
    'lsblk -o kname,fstype,mountpoint,label,ro,rm,model,type -P',
  WINDOWS: 'wmic logicaldisk get ' +
    'Caption,Description,DeviceID,FileSystem,FreeSpace,Name,Size,VolumeName'
};

// --------------------------------------
// Common Core - Utility Functions
// --------------------------------------

const lasti = (a) => a[a.length - 1];
const stringify = (v) => v && (typeof v === 'object' || typeof v === 'symbol') ? v.toString() : `${v}`;
const hasSubstr = (s, sub) => s.indexOf(sub) !== -1;
const getYesNo = (v) => v === 'Yes' ? true : v === 'No' ? false : undefined;
const splitEOL = (s) => typeof s === 'number'
  ? (v) => v.split(os.EOL.repeat(s))
  : s.split(os.EOL);

// --------------------------------------
// Common Core - Validation
// --------------------------------------

const validateDev = cond(
  {
    c: (dev) => typeof dev === 'function',
    a: identity
  },
  {
    c: (dev) => typeof dev === 'string',
    a: (dev) => (disk) => hasSubstr(dev, disk)
  },
  {
    c: (dev) => dev instanceof RegExp,
    a: (dev) => (disk) => dev.test(disk)
  },
  {
    c: (dev) => typeof dev === 'undefined' || (!dev && typeof dev === 'object'),
    a: (dev) => tautology
  },
  {
    c: tautology,
    a: (dev) => thrower(
      `fs.filesystem expected first argument 'dev' to be a function, string, regex or undefined/null. ` +
      `Found ${typeof dev === 'object' ? dev.constructor.name : typeof dev} instead.`,
      TypeError
    )
  }
);

const validateCallback = ifElse(
  (cb) => typeof cb === 'function',
  (cb) => cb,
  (cb) => thrower(
    `fs.filesystem expected second argument 'callback' to be instanceof function. ` +
    `Found ${typeof cb === 'object' ? cb.constructor.name : typeof cb} instead.`,
    TypeError
  )
);

const validate = (validateDev, validateCallback) =>
  (dev, callback) => ifElse(
    () => typeof dev === 'function' && !callback,
    () => { return [ tautology, dev ]; },
    () => { return [ validateDev(dev), validateCallback(callback) ]; }
  )();

// --------------------------------------
// Common Core - Empty FS Objects
// --------------------------------------

const emptyDevice = () => {
  return {
    id: null,
    node: null,
    whole: null,
    parent: null,
    name: null,
    size: null,
    description: null,
    block_size: null,
    read_only: null,
    removable: null
  };
};

const emptyVolume = () => {
  return {
    name: null,
    description: null,
    block_size: null,
    blocks: null,
    read_only: null,
    mounted: null,
    mountPoint: null,
    fs: null,
    space: { total: null, available: null, used: null }
  };
};

// --------------------------------------
// Filesystem Information Fetch - MacOS
// --------------------------------------

const mergeVolumesAndDevicesMacOS = ({ devices, volumes }) => {
  const vkeys = Object.keys(volumes);
  each((dev, key) => {
    dev.volumes = map(
      (k) => volumes[k],
      filter((k) => hasSubstr(key, k), vkeys) // volume keys that belong to current device
    );
  }, devices);
  return devices;
};

const getMacOSBytes = (str) => parseInt(str.match(/^\((\d+) Bytes\)/)[1]);

const macOSFS = (fs) => {
  switch(fs) {
  case 'ExFAT':
    return 'ExFAT';
  case 'MS-DOS':
    return 'FAT';
  case 'MS-DOS FAT12':
    return 'FAT12';
  case 'MS-DOS FAT16':
    return 'FAT16';
  case 'MS-DOS FAT32':
  case 'fat32':
    return 'FAT32';
  case 'HFS+':
  case 'Case-sensitive HFS+':
  case 'hfsx':
  case 'Case-sensitive Journaled HFS+':
  case 'jhfsx':
  case 'Journaled HFS+':
  case 'jhfs+':
    return 'HFS+';
  case 'Free Space':
  case 'free':
  default:
    return null;
  }
};

const parseMacOSToProps = (macOSFS, getYesNo, getMacOSBytes) =>
  (acc, {dev, vol}, [key, value]) => {
    switch(key) {
    case 'Device Identifier':
      acc.devices[dev].id = value;
      break;
    case 'Device Node':
      acc.devices[dev].node = value;
      break;
    case 'Whole':
      acc.devices[dev].whole = getYesNo(value);
      break;
    case 'Part of Whole':
      acc.devices[dev].parent = value;
      break;
    case 'Device / Media Name':
      acc.devices[dev].description = value;
      break;
    case 'Volume Name':
      acc.volumes[vol].name = hasSubstr(value, 'Not applicable') ? null : value;
      break;
    case 'Mounted':
      acc.volumes[vol].mounted = getYesNo(value);
      break;
    case 'Mount Point':
      acc.volumes[vol].mountPoint = value;
      break;
    case 'File System Personality':
      acc.volumes[vol].fs = macOSFS(value);
      break;
    case 'Partition Type':
      acc.volumes[vol].description = value;
      break;
    case 'Protocol':
      acc.devices[dev].protocol = value;
      break;
    case 'Disk Size':
      acc.devices[dev].size = parseInt(value.match(/^\((\d+) Bytes\)/)[1]);
      break;
    case 'Device Block Size':
      acc.devices[dev].block_size = parseInt(value.match(/\d+/)[0]);
      break;
    case 'Volume Total Space':
      if(!acc.volumes[vol].space) acc.volumes[vol].space = { total: getMacOSBytes(value) };
      else acc.volumes[vol].space.total = getMacOSBytes(value);
      break;
    case 'Volume Used Space':
      if(!acc.volumes[vol].space) acc.volumes[vol].space = { used: getMacOSBytes(value) };
      else acc.volumes[vol].space.used = getMacOSBytes(value);
      break;
    case 'Volume Available Space':
      if(!acc.volumes[vol].space) acc.volumes[vol].space = { available: getMacOSBytes(value) };
      else acc.volumes[vol].space.available = getMacOSBytes(value);
      break;
    case 'Allocation Block Size':
      acc.volumes[vol].block_size = parseInt(value.match(/\d+/)[0]);
      break;
    case 'Read-Only Media':
      acc.devices[dev].read_only = getYesNo(value);
      break;
    case 'Read-Only Volume':
      acc.volumes[vol].read_only = getYesNo(value);
      break;
    case 'Removable Media':
      acc.devices[dev].removable = value === 'Fixed';
      break;
    default:
      break;
    }
    return acc;
  };

const parseMacOS = (mergeVolumesAndDevicesMacOS, parseMacOSToProps) =>
  (userFilter) => (output) => compose(
    filter(userFilter),
    mergeVolumesAndDevicesMacOS,
    reduce( // Map to object
      (acc, entry) => compose(
        (lines) => {
          // COMBAK Not efficient
          const dev = lines.find((l) => l.match('Device Node')).match(/:\s+(.*)/)[1];
          const vol = lines.find((l) => l.match('Device Identifier')).match(/:\s+(.*)/)[1];
          acc.devices[dev] = acc.devices[dev] ? acc.devices[dev] : emptyDevice();
          acc.volumes[vol] = acc.volumes[vol] ? acc.volumes[vol] : emptyVolume();
          return reduce(
            (a, s) => parseMacOSToProps(a, {dev, vol}, s.split(/:\s+/)),
            acc,
            lines
          );
        },
        filter((s) => s.trim()),
        splitEOL
      )(entry),
      { devices: {}, volumes: {} }
    ),
    (s) => s.split(/\n\*+\n\n/) // Split per entry
  )(output);

// --------------------------------------
// Filesystem Information Fetch - Linux
// --------------------------------------

const mergeVolumesAndDevicesLinux = ({ devices, volumes }) => {
  const vkeys = Object.keys(volumes);
  each((dev, key) => {
    dev.volumes = map(
      compose(
        (volume) => {
          if(devices[key].volume_block_size) volume.block_size = devices[key].volume_block_size;
          return volume;
        },
        (k) => volumes[k]
      ),
      filter((k) => hasSubstr(key, k), vkeys) // volume keys that belong to current device
    );
  }, devices);
  return devices;
};

// Values Example
// ['sdc1', 'vfat', '/media/user/KINGSTON', 'KINGSTON', '0', '1', '', 'part']
/*
 * 0: KNAME
 * 1: FSTYPE
 * 2: MOUNTPOINT
 * 3: LABEL
 * 4: RO
 * 5: RM
 * 6: MODEL
 * 7: TYPE
 */
const parselsblkDeviceData = (acc) => (values) => {
  acc.devices[`/dev/${values[0]}`] = acc.devices[`/dev/${values[0]}`]
    ? acc.devices[`/dev/${values[0]}`]
    : emptyDevice();
  acc.devices[`/dev/${values[0]}`].name = acc.devices[`/dev/${values[0]}`].name || `/dev/${values[0]}`;
  acc.devices[`/dev/${values[0]}`].read_only = values[4];
  acc.devices[`/dev/${values[0]}`].removable = values[5];
  acc.devices[`/dev/${values[0]}`].description = values[3] || values[6];
};

const parselsblkVolumeData = (acc) => (values) => {
  acc.volumes[`/dev/${values[0]}`] = acc.volumes[`/dev/${values[0]}`]
    ? acc.volumes[`/dev/${values[0]}`]
    : emptyVolume();
  acc.volumes[`/dev/${values[0]}`].id = acc.volumes[`/dev/${values[0]}`].id || `/dev/${values[0]}`;
  acc.volumes[`/dev/${values[0]}`].fs = acc.volumes[`/dev/${values[0]}`].fs || values[2];
  acc.volumes[`/dev/${values[0]}`].mountPoint = acc.volumes[`/dev/${values[0]}`].mountPoint || values[2];
  acc.volumes[`/dev/${values[0]}`].read_only = values[4];
  acc.volumes[`/dev/${values[0]}`].removable = values[5];
  acc.volumes[`/dev/${values[0]}`].description = values[3] || values[6];
};

const parselsblk = (parselsblkDeviceData, parselsblkVolumeData) =>
  (lsblk) => (acc) => compose(
    constant(acc),
    each(
      compose(
        ifElse(
          (values) => values[values.length - 1] === 'disk',
          parselsblkDeviceData(acc),
          parselsblkVolumeData(acc)
        ),
        (line) => map(
          (field) => field.replace('"').split('=')[1],
          line.match(/([A-Z]+="[^"]*")+/g)
        )
      )
    ),
    filter((s) => s.trim()), // remove empty lines
    splitEOL
  )(lsblk);

const parsefdisklDeviceData = (acc) => ([head, ...tail]) => {
  const [name, size] = head.match(/Disk\s(.*):\s.*,\s(\d+)\sbytes/).slice(1);
  acc.devices[name] = acc.devices[name] ? acc.devices[name] : emptyDevice();
  acc.devices[name].size = parseInt(size);
  each(
    ifElse(
      (line) => line.match(/Sector.*:\s\d+\sbytes/),
      (line) => {
        const [logical, physical] = line.match(/(\d+).*(\d+)/).slice(1);
        acc.devices[name].block_size = parseInt(physical);
        acc.devices[name].volume_block_size = parseInt(logical);
      },
      () => {}
    ),
    tail
  );
  return acc;
};

const parsefdisklVolumeData = (acc) => compose(
  ([name, sectors, description]) => {
    acc.volumes[name] = acc[name] ? acc[name] : emptyVolume();
    acc.volumes[name].name = name;
    acc.volumes[name].blocks = sectors;
    acc.volumes[name].description = description;
    return acc;
  },
  (l) => l.match(/([\w/\\:]+)\s+.*\s+(\d+)\s+[0-9]+\.[0-9]+[A-Z]{1}\s+(.*)/).slice(1)
);

const parsefdiskl = (parsefdisklDeviceData, parsefdisklVolumeData) =>
  (fdiskl) => (acc) => compose(
    (blocks) => blocks.reduce((a, block, i) => ifElse(
      () => (i + 1) % 2,
      () => compose(parsefdisklDeviceData(a), splitEOL)(block),
      () => compose(map(parsefdisklVolumeData(a)), (arr) => arr.splice(1), splitEOL)(block)
    )(), acc),
    filter((s) => s.trim()), // remove empty lines
    splitEOL(2) // split into disk and volumes
  )(fdiskl);

const parsedfT = (dft) => (acc) => compose(
  R.mapAccum(
    (acc, line) => compose(
      ([ name, filesystem, size, used, available, mountPoint ]) => {
        acc.volumes[name] = emptyVolume();
        acc.volumes[name].id = name;
        acc.volumes[name].name = name;
        acc.volumes[name].mounted = true;
        acc.volumes[name].mountPoint = mountPoint;
        acc.volumes[name].fs = filesystem === 'vfat' ? 'FAT32' : filesystem;
        acc.volumes[name].space.total = parseInt(size) * 1024;
        acc.volumes[name].space.available = parseInt(available) * 1024;
        acc.volumes[name].space.used = parseInt(used) * 1024;
        return acc;
      },
      // split by space, except if space is preceeded by \ (paths with spaces)
      // This is used instead of a negative lookbehind (`(?<!\\)\s+`)
      (line) => line.split(/\s+/)
        .reduce((a, f) => {
          if(lasti(lasti(a)) === '\\') a[a.length - 1] += f;
          else a.push(f);
          return a;
        })
    )(line),
    acc
  ),
  (a) => a.slice(1), // remove table header
  filter((s) => s.trim() && !hasSubstr(s, 'tmpfs')), // remove empty lines & tmp file systems
  splitEOL
)(dft);

const parseLinux = (mergeVolumesAndDevicesLinux, parselsblk, parsefdiskl, parsedfT) =>
  (userFilter) => (output) => compose(
    filter(userFilter),
    ([dft, fdiskl, lsblk]) => compose(
      mergeVolumesAndDevicesLinux,
      parselsblk(lsblk),
      parsefdiskl(fdiskl),
      parsedfT(dft)
    )({ devices: {}, volumes: {} }),
    (s) => s.split(/\n\*+\n\n/) // Split utilities
  )(output);

// --------------------------------------
// Filesystem Information Fetch - Windows
// --------------------------------------

const parseWindowsProps =
(acc, [ caption, desc, id, filesystem, space, name, size, volumename ]) => {
  acc.devices[name][id] = acc.devices[id] ? acc.devices[id] : emptyDevice();
  acc.devices[name][id].id = id;
  acc.devices[name][id].node = caption;
  acc.devices[name][id].name = name;
  acc.devices[name][id].size = parseInt(size);
  acc.devices[name][id].description = desc;

  const volume = emptyVolume();
  volume.name = volumename || null;
  volume.mounted = true;
  volume.mountPoint = name;
  volume.fs = filesystem;
  volume.space.total = parseInt(size);
  volume.space.available = parseInt(space);
  volume.space.used = parseInt(size) - parseInt(space);
  acc.devices[name][id].volumes = [volume];

  return acc;
};

const parseWindows = (parseWindowsProps) => (userFilter) => (output) => compose(
  filter(userFilter),
  reduce(
    (acc, v) => parseWindowsProps(acc, v.split(/\t|\s{2,}/)),
    { devices: {}, volumes: {} }
  ),
  (a) => a.splice(1),
  filter((s) => s.trim()),
  splitEOL
)(output);

// --------------------------------------
// Common Core - Main & Export Functions
// --------------------------------------

const execute = (cmd, parser) => (filter, cb, sync = false) => ifElse(
  () => sync,
  (cmd) => compose(parser(filter), stringify, child.execSync)(cmd),
  (cmd) => composeP((v) => cb(null, v), parser(filter), stringify, child.exec)(cmd)
    .catch(cb)
)(cmd);

const filesystem = (macOS, linux, windows, validate, platform) => (dev, callback) => cond(
  {
    c: eqeqeq('darwin'),
    a: () => macOS(...validate(dev, callback))
  },
  {
    c: eqeqeq('linux'),
    a: () => linux(...validate(dev, callback))
  },
  {
    c: eqeqeq('win32'),
    a: () => windows(...validate(dev, callback))
  },
  {
    c: tautology,
    a: (os) => thrower(
      'fs.filesystem : Unsupported OS. fs.filesystem does not support ' +
      `${os} at the moment`
    )
  }
)(platform);

const filesystemSync = (macOS, linux, windows, validateDev, platform) => (dev) => cond(
  {
    c: eqeqeq('darwin'),
    a: () => macOS(validateDev(dev), null, true)
  },
  {
    c: eqeqeq('linux'),
    a: () => linux(validateDev(dev), null, true)
  },
  {
    c: eqeqeq('win32'),
    a: () => windows(validateDev(dev), null, true)
  },
  {
    c: tautology,
    a: (os) => thrower(
      'fs.filesystem : Unsupported OS. fs.filesystem does not support ' +
      `${os} at the moment`
    )
  }
)(platform);

/**
 * Initialization Pattern
 * Allows to test [rewired](https://github.com/jhnns/rewire) functions individually
 * with sinon stubs and mockup functions
**/
const __init__ = {
  validate: validate(validateDev, validateCallback),
  macOS: execute(
    COMMANDS.MACOS,
    parseMacOS(
      mergeVolumesAndDevicesMacOS,
      parseMacOSToProps(macOSFS, getYesNo, getMacOSBytes)
    )
  ),
  linux: execute(
    COMMANDS.LINUX,
    parseLinux(
      mergeVolumesAndDevicesLinux,
      parselsblk(parselsblkDeviceData, parselsblkVolumeData),
      parsefdiskl(parsefdisklDeviceData, parsefdisklVolumeData),
      parsedfT
    )
  ),
  windows: execute(
    COMMANDS.WINDOWS,
    parseWindows(parseWindowsProps)
  )
};

module.exports = filesystem(
  __init__.macOS,
  __init__.linux,
  __init__.windows,
  __init__.validate,
  os.platform()
);

filesystem.sync = filesystemSync(
  __init__.macOS,
  __init__.linux,
  __init__.windows,
  __init__.validateDev,
  os.platform()
);
