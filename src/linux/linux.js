import F from '../functional';
import { lasti, hasSubstr, splitEOL, emptyDevice, emptyVolume } from '../utilities';
const { constant, ifElse, each } = F;
const { compose, map, mapAccum, filter } = F.R;

export const COMMAND = 'df -T && ' +
  'echo "" && echo "**********" && echo "" && ' +
  'fdisk -l && ' +
  'echo "" && echo "**********" && echo "" && ' +
  'lsblk -o kname,fstype,mountpoint,label,ro,rm,model,type -P';

export const mergeVolumesAndDevicesLinux = ({ devices, volumes }) => {
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
export const parselsblkDeviceData = (acc) => (values) => {
  acc.devices[`/dev/${values[0]}`] = acc.devices[`/dev/${values[0]}`]
    ? acc.devices[`/dev/${values[0]}`]
    : emptyDevice();
  acc.devices[`/dev/${values[0]}`].name = acc.devices[`/dev/${values[0]}`].name || `/dev/${values[0]}`;
  acc.devices[`/dev/${values[0]}`].read_only = values[4];
  acc.devices[`/dev/${values[0]}`].removable = values[5];
  acc.devices[`/dev/${values[0]}`].description = values[3] || values[6];
};

export const parselsblkVolumeData = (acc) => (values) => {
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

export const parselsblk = (parselsblkDeviceData, parselsblkVolumeData) =>
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

export const parsefdisklDeviceData = (acc) => ([head, ...tail]) => {
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

export const parsefdisklVolumeData = (acc) => compose(
  ([name, sectors, description]) => {
    acc.volumes[name] = acc[name] ? acc[name] : emptyVolume();
    acc.volumes[name].name = name;
    acc.volumes[name].blocks = sectors;
    acc.volumes[name].description = description;
    return acc;
  },
  (l) => l.match(/([\w/\\:]+)\s+.*\s+(\d+)\s+[0-9]+\.[0-9]+[A-Z]{1}\s+(.*)/).slice(1)
);

export const parsefdiskl = (parsefdisklDeviceData, parsefdisklVolumeData) =>
  (fdiskl) => (acc) => compose(
    (blocks) => blocks.reduce((a, block, i) => ifElse(
      () => (i + 1) % 2,
      () => compose(parsefdisklDeviceData(a), splitEOL)(block),
      () => compose(map(parsefdisklVolumeData(a)), (arr) => arr.splice(1), splitEOL)(block)
    )(), acc),
    filter((s) => s.trim()), // remove empty lines
    splitEOL(2) // split into disk and volumes
  )(fdiskl);

export const parsedfT = (dft) => (acc) => compose(
  mapAccum(
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

export const parseLinux = (mergeVolumesAndDevicesLinux, parselsblk, parsefdiskl, parsedfT) =>
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
