import F from '../functional';
import { emptyDevice, emptyVolume, splitEOL } from '../utilities';
const { compose, reduce, filter } = F.R;

export const COMMAND = 'wmic logicaldisk get ' +
  'Caption,Description,DeviceID,FileSystem,FreeSpace,Name,Size,VolumeName';

export const parseWindowsProps =
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

export const parseWindows = (parseWindowsProps) => (userFilter) => (output) => compose(
  filter(userFilter),
  reduce(
    (acc, v) => parseWindowsProps(acc, v.split(/\t|\s{2,}/)),
    { devices: {}, volumes: {} }
  ),
  (a) => a.splice(1),
  filter((s) => s.trim()),
  splitEOL
)(output);
