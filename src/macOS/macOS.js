import F from '../functional';
import { hasSubstr, getYesNo, splitEOL, emptyDevice, emptyVolume } from '../utilities';
const { each } = F;
const { compose, map, reduce, filter } = F.R;

export const COMMAND = 'diskutil info -all';

export const mergeVolumesAndDevicesMacOS = ({ devices, volumes }) => {
  const vkeys = Object.keys(volumes);
  each((dev, key) => {
    dev.volumes = map(
      (k) => volumes[k],
      filter((k) => hasSubstr(key, k), vkeys) // volume keys that belong to current device
    );
  }, devices);
  return devices;
};

export const getMacOSBytes = (str) => parseInt(str.match(/^\((\d+) Bytes\)/)[1]);

export const macOSFS = (fs) => {
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

export const parseMacOSToProps = (macOSFS, getMacOSBytes) =>
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

export const parseMacOS = (mergeVolumesAndDevicesMacOS, parseMacOSToProps) =>
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
