import F from '../functional';
import os from 'os';
import { emptyDevice, emptyVolume } from '../utilities';
const { filter } = F;

export const COMMAND =
  'wmic logicaldisk get ' +
  'Caption,Description,DeviceID,DriveType,FileSystem,FreeSpace,Name,Size,VolumeName ' +
  '/format:csv';

export const parseWindowsProps = (acc, { Caption, Description, DeviceID, DriveType, FileSystem, FreeSpace, Name, Size, VolumeName }) => {
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
  volume.name = VolumeName;
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

export const parseWindows = (parseWindowsProps) => (userFilter) => (data) => {
  // fix double \r\r coming from wmic
  data = data.replace(/\r\r/gi, '\r');
  var lines =
    data.split(os.EOL)
      .filter((s) => s.trim());

  var columns = lines[0].split(',');
  var result = [];
  for(var i = 1; i < lines.length; i++) {
    var values = lines[i].split(',');
    var obj = {};
    values.map((val, j) => {
      obj[columns[j]] = val;
    });
    result.push(obj);
  }

  const { devices } = result.reduce(
    (acc, v) => parseWindowsProps(acc, v),
    { devices: {} },
  );

  return {
    devices: filter(userFilter, devices), // apply user filter
  };
};
