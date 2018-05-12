import F from '../functional';
import { lasti as lastIndex, hasSubstr, splitEOL } from '../utilities';
const { compose, map, reduce, filter } = F.R;

export const COMMAND = 'df -T && ' +
  'echo "" && echo "**********" && echo "" && ' +
  'fdisk -l && ' +
  'echo "" && echo "**********" && echo "" && ' +
  'lsblk -o kname,fstype,mountpoint,label,ro,rm,model,type -P';

export const getNodeId = (node) => lastIndex(node.split('/').filter((s) => s.trim()));

export const createNewDevice = (emptyDevice) => (id, node = null) => {
  const device = emptyDevice();
  device.id = id;
  device.node = node || `/dev/${id}`;
  device.name = id;
  device.whole = true;
  device.parent = id;
  return device;
};

export const createNewVolume = (emptyVolume) => (id, node = null) => {
  const volume = emptyVolume();
  volume.id = id;
  volume.node = node || `/dev/${id}`;
  volume.name = id;
  volume.parent = id.match(/[a-z]+/)[0];
  return volume;
};

export const mergeVolumesAndDevicesLinux = (emptyDevice) => ({ devices, volumes }) => {
  const vkeys = Object.keys(volumes);
  // Merge volumes to devices
  Object.entries(devices).forEach(([key, dev]) => {
    const vkeysForDev = vkeys.filter((k) => hasSubstr(k, key)); // volume keys that belong to current device
    dev.volumes = vkeysForDev.map((k) => {
      const volume = volumes[k];
      if(dev.volumeBlockSize) volume.blockSize = dev.volumeBlockSize;
      return volume;
    });
  });
  // Remove the volumeBlockSize property from the devices
  return {
    devices: map(
      (d) => reduce(
        (a, v, k) => {
          if(k !== 'volumeBlockSize') a[k] = v;
          return a;
        },
        emptyDevice()
      )(d),
      devices
    ),
  };
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
export const parselsblkDeviceData = (createNewDevice) => (acc) =>
  ([id, fs, mountPoint, label, readOnly, removable, model, _]) => {
    if(!acc.devices[id]){
      acc.devices[id] = createNewDevice(id);
    }
    acc.devices[id].readOnly = !!parseInt(readOnly);
    acc.devices[id].removable = !!parseInt(removable);
    acc.devices[id].description = acc.devices[id].description || label || null;
    return acc;
  };

export const parselsblkVolumeData = (createNewVolume) => (acc) =>
  ([id, fs, mountPoint, label, readOnly, removable, model, _]) => {
    if(!acc.volumes[id]){
      acc.volumes[id] = createNewVolume(id);
    }
    acc.volumes[id].fs = fs || null;
    acc.volumes[id].mounted = !!mountPoint;
    acc.volumes[id].mountPoint = mountPoint || null;
    acc.volumes[id].readOnly = !!parseInt(readOnly);
    acc.volumes[id].removable = !!parseInt(removable);
    acc.volumes[id].description = acc.volumes[id].description || label || null;
    return acc;
  };

export const parselsblk = (parselsblkDeviceData, parselsblkVolumeData) =>
  (lsblk) => (acc) => {
    const lines =
      splitEOL(lsblk) // Split by line
        .filter((s) => s.trim()); // Remove empty lines

    lines.forEach((line) => {
      const fields = line.match(/([A-Z]+="[^"]*")+/g);
      const values = fields.map((field) => field.replace(/"/g, '').split('=')[1]);

      if(values[values.length - 1] === 'disk'){
        return parselsblkDeviceData(acc)(values);
      }
      return parselsblkVolumeData(acc)(values);
    });

    return acc;
  };

export const parsefdisklDeviceData = (getNodeId, createNewDevice) => (acc) => ([head, ...tail]) => {
  const matches = head.match(/Disk\s(.*):\s.*,\s(\d+)\sbytes,\s(\d+) sectors/);
  if(matches == null){
    throw new Error(`parsefdisklDeviceData: error on parsing (head = ${head})`);
  }
  const [node, size, blocks] = matches.slice(1);
  const id = getNodeId(node);
  if(!acc.devices[id]){
    acc.devices[id] = createNewDevice(id, node);
  }
  acc.devices[id].blocks = parseInt(blocks);
  acc.devices[id].size = parseInt(size);
  tail.forEach(
    (line) => {
      if(line.match(/Sector.*:\s\d+\sbytes/)){
        const [logical, physical] = line.match(/(\d+)\s.*\s(\d+)\s/).slice(1);
        acc.devices[id].blockSize = parseInt(physical);
        acc.devices[id].volumeBlockSize = parseInt(logical);
      }
    }
  );
  return acc;
};

export const parsefdisklVolumeData = (getNodeId, createNewVolume) => (acc) => (lines) =>
  lines.reduce(
    (acc, line) => {
      const matches = line.match(/([\w\\/]+)\s+.*\s(\d+)\s+[\w.]+\s(.*)/);
      if(matches == null){
        throw new Error(`parsefdisklVolumeData: error on parsing (line = ${line})`);
      }
      const [node, sectors, description] = matches.slice(1);
      const id = getNodeId(node);
      if(!acc.volumes[id]){
        acc.volumes[id] = createNewVolume(id, node);
      }
      acc.volumes[id].blocks = parseInt(sectors);
      acc.volumes[id].description = description;
      return acc;
    },
    acc
  );

export const parsefdiskl = (parsefdisklDeviceData, parsefdisklVolumeData) =>
  (fdiskl) => (acc) => {
    const blocks =
      splitEOL(2)(fdiskl) // Split by every two line
        .filter((s) => s.trim()); // Remove empty lines

    blocks.reduce((a, block, i) => {
      if((i + 1) % 2) {
        const lines =
          splitEOL(block) // Split by line
            .filter((s) => s.trim()); // Remove empty lines
        return parsefdisklDeviceData(a)(lines);
      }
      const lines =
        splitEOL(block) // Split by line
          .splice(1)
          .filter((s) => s.trim()); // Remove empty lines

      return parsefdisklVolumeData(a)(lines);
    }, acc);

    return acc;
  };

// split by space, except if space is preceeded by \ (paths with spaces)
// This is used instead of a negative lookbehind (`(?<!\\)\s+`)
export const splitdfTLine = (line) =>
  line.split(/\s+/).filter((s) => s.trim()).reduce((a, field) => {
    if(lastIndex(a) && lastIndex(lastIndex(a)) === '\\'){
      a[a.length - 1] += ` ${field}`;
    }else{
      a.push(field);
    }
    return a;
  }, []);

export const parsedfT = (getNodeId, createNewVolume, splitdfTLine) => (dft) => (acc) => {
  const lines =
    splitEOL(dft)
      .filter((s) => s.trim() && !hasSubstr(s, 'tmpfs')) // remove empty lines & tmp file systems
      .slice(1); // remove table header

  return lines.reduce(
    (acc, line) => {
      const [ node, filesystem, size, used, available, , mountPoint ] = splitdfTLine(line);
      const id = getNodeId(node);
      acc.volumes[id] = createNewVolume(id, node);
      acc.volumes[id].mounted = true;
      acc.volumes[id].mountPoint = mountPoint;
      acc.volumes[id].fs = filesystem === 'vfat' ? 'FAT32' : filesystem;
      acc.volumes[id].space.total = parseInt(size) * 1024;
      acc.volumes[id].space.available = parseInt(available) * 1024;
      acc.volumes[id].space.used = parseInt(used) * 1024;
      return acc;
    },
    acc
  );
};

export const parseLinux = (mergeVolumesAndDevicesLinux, parselsblk, parsefdiskl, parsedfT) =>
  (userFilter) => (output) => {
    const [dft, fdiskl, lsblk] = output.split(/\n\*+\n\n/); // Split utilities

    const accumulator = compose(
      mergeVolumesAndDevicesLinux,
      parselsblk(lsblk),
      parsefdiskl(fdiskl),
      parsedfT(dft)
    )({ devices: {}, volumes: {} });

    return {
      devices: filter(userFilter, accumulator.devices),
    };
  };
