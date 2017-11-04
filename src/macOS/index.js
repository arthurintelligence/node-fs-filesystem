import {
  COMMAND,
  parseMacOS,
  mergeVolumesAndDevicesMacOS,
  parseMacOSToProps,
  macOSFS,
  getMacOSBytes
} from './macOS';

export default{
  COMMAND,
  parser: parseMacOS(
    mergeVolumesAndDevicesMacOS,
    parseMacOSToProps(macOSFS, getMacOSBytes)
  )
};
