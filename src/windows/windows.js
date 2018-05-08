import F from '../functional';
import { emptyDevice, emptyVolume, splitEOL } from '../utilities';

const { filter } = F;

export const COMMAND = 'wmic logicaldisk get ' +
  'Caption,Description,DeviceID,FileSystem,FreeSpace,Name,Size,VolumeName';

export const parseWindowsProps =
(acc, [ caption, desc, id, filesystem, space, name, size, volumename ]) => {
  acc.devices[name] = acc.devices[name] ? acc.devices[name] : emptyDevice();
  acc.devices[name].id = id;
  acc.devices[name].whole = true;
  acc.devices[name].parent = id;
  acc.devices[name].node = caption;
  acc.devices[name].name = name;
  acc.devices[name].size = parseInt(size);
  acc.devices[name].description = desc;

  const volume = emptyVolume();
  volume.id = id;
  volume.node = id;
  volume.name = volumename || null;
  volume.parent = id;
  volume.mounted = true;
  volume.mountPoint = name;
  volume.fs = filesystem;
  volume.space.total = parseInt(size);
  volume.space.available = parseInt(space);
  volume.space.used = parseInt(size) - parseInt(space);
  acc.devices[name].volumes = [volume];

  return acc;
};

export const parseWindows = (parseWindowsProps) => (userFilter) => (data) => {
  const lines = splitEOL(data) // split by line
    .filter((s) => s.trim()) // remove empty lines
    .splice(1); // remove header

  const { devices } = lines.reduce(
    (acc, v) => parseWindowsProps(acc, v.split(/\t|\s{2,}/)),
    { devices: {} },
  );

  return {
    devices: filter(userFilter, devices), // apply user filter
  };
};
