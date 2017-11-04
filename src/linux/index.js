import {
  COMMAND,
  mergeVolumesAndDevicesLinux,
  parselsblkDeviceData,
  parselsblkVolumeData,
  parselsblk,
  parsefdisklDeviceData,
  parsefdisklVolumeData,
  parsefdiskl,
  parsedfT,
  parseLinux
} from './linux';

export default {
  COMMAND,
  parser: parseLinux(
    mergeVolumesAndDevicesLinux,
    parselsblk(parselsblkDeviceData, parselsblkVolumeData),
    parsefdiskl(parsefdisklDeviceData, parsefdisklVolumeData),
    parsedfT
  )
};
