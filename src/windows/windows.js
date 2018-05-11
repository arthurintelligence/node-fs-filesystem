import F from '../functional';
import { emptyDevice, emptyVolume } from '../utilities';
import csvSync from 'csv-parse/lib/sync';
const { compose, reduce, filter } = F.R;

export const COMMAND =
  'wmic logicaldisk get ' +
  'Caption,Description,DeviceID,DriveType,FileSystem,FreeSpace,Name,Size,VolumeName ' +
  '/format:csv';

export const parseWindowsProps = (
  acc,
  {
    Caption,
    Description,
    DeviceID,
    DriveType,
    FileSystem,
    FreeSpace,
    Name,
    Size,
    VolumeName
  }
) => {
  acc.devices[Name] = acc.devices[Name] ? acc.devices[Name] : emptyDevice();
  acc.devices[Name].id = DeviceID;
  acc.devices[Name].whole = true;
  acc.devices[Name].parent = DeviceID;
  acc.devices[Name].node = Caption;
  acc.devices[Name].name = Name;
  acc.devices[Name].size = parseInt(Size) || 0;
  acc.devices[Name].description = Description;
  acc.devices[Name].removable = DriveType === '2';

  const volume = emptyVolume();
  volume.id = DeviceID;
  volume.node = DeviceID;
  volume.name = VolumeName || null;
  volume.parent = DeviceID;
  volume.mounted = true;
  volume.mountPoint = Name;
  volume.fs = FileSystem;
  volume.space.total = parseInt(Size) || 0;
  volume.space.available = parseInt(FreeSpace) || 0;
  volume.space.used = volume.space.total - volume.space.available;
  acc.devices[Name].volumes = [volume];

  return acc;
};

export const parseWindows = parseWindowsProps => userFilter =>
  compose(
    ({ devices }) => ({
      devices: filter(userFilter, devices)
    }),
    reduce((acc, propsObj) => parseWindowsProps(acc, propsObj), {
      devices: {}
    }),
    csv => csvSync(csv, { columns: true })
  );
