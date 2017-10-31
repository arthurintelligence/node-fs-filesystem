const os = require('os')
const child = require('child_process')
const R = require('ramda')
const universalify = require('universalify')
const F = require('./functional')
const { identity, constant, ifElse, cond, each, eqeqeq, tautology, thrower } = F
const { compose, composeP, curry, map, reduce, filter } = F.R

child.exec = universalify.fromCallback(child.exec, child)

const lasti = (a) => a[a.length - 1]
const stringify = (v) => v.toString()
const hasSubstr = (s, sub) => s.indexOf(sub) !== -1
const getYesNo = (v) => v !== 'No'
const splitEOL = (s) => typeof s === 'number'
  ? (v) => v.split(os.EOL.repeat(s))
  : s.split(os.EOL)

// --------------------------------------
// Validation
// --------------------------------------

const validateDev = cond([
  {
    c: (dev) => typeof dev === 'function',
    a: (dev) => dev
  },
  {
    c: (dev) => dev instanceof RegExp,
    a: (dev) => (disk) => dev.test(disk)
  },
  {
    c: (dev) => !identity(dev),
    a: (dev) => tautology
  },
  {
    c: tautology,
    a: (dev) => thrower(
      `fs.filesystem expected first argument 'dev' to be a function, string, regex or undefined. ` +
      `Found ${typeof dev === 'object' ? dev.constructor.name : typeof dev} instead.`,
      TypeError
    )
  }
])

const validateCallback = ifElse(
  (cb) => typeof cb === 'function',
  (cb) => cb,
  (cb) => thrower(
    `fs.filesystem expected second argument 'callback' to be instanceof function. ` +
    `Found ${typeof cb === 'object' ? cb.constructor.name : typeof cb} instead.`,
    TypeError
  )
)

const validate = (dev, callback) => ifElse(
  () => typeof dev === 'function' && !callback,
  () => { return [ tautology, dev ] },
  () => { return [ validateDev(dev), validateCallback(callback) ] }
)()

// --------------------------------------
// Filesystem Information Fetch
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
  }
}

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
  }
}

// --------------------------------------
// MacOS Filesystem Information Fetch
// --------------------------------------

const mergeVolumesAndDevices = ({ devices, volumes }) => {
  const vkeys = Object.keys(volumes)
  each((dev, key) => {
    dev.volumes = map(
      (k) => volumes[k],
      filter((k) => hasSubstr(key, k), vkeys) // volume keys that belong to current device
    )
  }, devices)
  return devices
}

const getMacOSBytes = (str) => parseInt(str.match(/^\((\d+) Bytes\)/)[1])

const macOSFS = (fs) => {
  switch (fs) {
    case 'ExFAT':
      return 'ExFAT'
    case 'MS-DOS':
      return 'FAT'
    case 'MS-DOS FAT12':
      return 'FAT12'
    case 'MS-DOS FAT16':
      return 'FAT16'
    case 'MS-DOS FAT32':
    case 'fat32':
      return 'FAT32'
    case 'HFS+':
    case 'Case-sensitive HFS+':
    case 'hfsx':
    case 'Case-sensitive Journaled HFS+':
    case 'jhfsx':
    case 'Journaled HFS+':
    case 'jhfs+':
      return 'HFS+'
    case 'Free Space':
    case 'free':
    default:
      return null
  }
}

const parseMacOSToProps = (acc, {dev, vol}, [key, value]) => {
  switch (key) {
    case 'Device Identifier':
      acc.devices[dev].id = value
      break
    case 'Device Node':
      acc.devices[dev].node = value
      break
    case 'Whole':
      acc.devices[dev].whole = getYesNo(value)
      break
    case 'Part of Whole':
      acc.devices[dev].parent = value
      break
    case 'Device / Media Name':
      acc.devices[dev].description = value
      break
    case 'Volume Name':
      acc.volumes[vol].name = hasSubstr(value, 'Not applicable') ? null : value
      break
    case 'Mounted':
      acc.volumes[vol].mounted = getYesNo(value)
      break
    case 'Mount Point':
      acc.volumes[vol].mountPoint = value
      break
    case 'File System Personality':
      acc.volumes[vol].fs = macOSFS(value)
      break
    case 'Partition Type':
      acc.volumes[vol].description = value
      break
    case 'Protocol':
      acc.devices[dev].protocol = value
      break
    case 'Disk Size':
      acc.devices[dev].size = parseInt(value.match(/^\((\d+) Bytes\)/)[1])
      break
    case 'Device Block Size':
      acc.devices[dev].block_size = parseInt(value.match(/\d+/)[0])
      break
    case 'Volume Total Space':
      if (!acc.volumes[vol].space) acc.volumes[vol].space = { total: getMacOSBytes(value) }
      else acc.volumes[vol].space.total = getMacOSBytes(value)
      break
    case 'Volume Used Space':
      if (!acc.volumes[vol].space) acc.volumes[vol].space = { used: getMacOSBytes(value) }
      else acc.volumes[vol].space.used = getMacOSBytes(value)
      break
    case 'Volume Available Space':
      if (!acc.volumes[vol].space) acc.volumes[vol].space = { available: getMacOSBytes(value) }
      else acc.volumes[vol].space.available = getMacOSBytes(value)
      break
    case 'Allocation Block Size':
      acc.volumes[vol].block_size = parseInt(value.match(/\d+/)[0])
      break
    case 'Read-Only Media':
      acc.devices[dev].read_only = getYesNo(value)
      break
    case 'Read-Only Volume':
      acc.volumes[vol].read_only = getYesNo(value)
      break
    case 'Removable Media':
      acc.devices[dev].removable = value === 'Fixed'
      break
    default:
      break
  }
  return acc
}

const parseMacOS = (userFilter) => (output) => compose(
  filter(userFilter),
  mergeVolumesAndDevices,
  reduce( // Map to object
    (acc, entry) => compose(
      (lines) => {
        // COMBAK Not efficient
        const dev = lines.find((l) => l.match('Device Node')).match(/:\s+(.*)/)[1]
        const vol = lines.find((l) => l.match('Device Identifier')).match(/:\s+(.*)/)[1]
        acc.devices[dev] = acc.devices[dev] ? acc.devices[dev] : emptyDevice()
        acc.volumes[vol] = acc.volumes[vol] ? acc.volumes[vol] : emptyVolume()
        return reduce(
          (a, s) => parseMacOSToProps(a, {dev, vol}, s.split(/:\s+/)),
          acc,
          lines
        )
      },
      filter((s) => s.trim()),
      splitEOL
    )(entry),
    { devices: {}, volumes: {} }
  ),
  (s) => s.split(/\n\*+\n\n/), // Split per entry
  stringify
)(output)

const macOS = (filter, cb, sync = false) => ifElse(
  () => sync,
  (cmd) => compose(parseMacOS(filter), child.execSync)(cmd),
  (cmd) => composeP(curry(cb)(null), parseMacOS(filter), child.exec)(cmd)
    .catch(cb)
)('diskutil info -all')

// --------------------------------------
// Linux Filesystem Information Fetch
// --------------------------------------

const mergeVolumesAndDevicesLinux = ({ devices, volumes }) => {
  const vkeys = Object.keys(volumes)
  each((dev, key) => {
    dev.volumes = map(
      compose(
        (volume) => {
          if (devices[key].volume_block_size) volume.block_size = devices[key].volume_block_size
          return volume
        },
        (k) => volumes[k]
      ),
      filter((k) => hasSubstr(key, k), vkeys) // volume keys that belong to current device
    )
  }, devices)
  return devices
}

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
    : emptyDevice()
  acc.devices[`/dev/${values[0]}`].name = acc.devices[`/dev/${values[0]}`].name || `/dev/${values[0]}`
  acc.devices[`/dev/${values[0]}`].read_only = values[4]
  acc.devices[`/dev/${values[0]}`].removable = values[5]
  acc.devices[`/dev/${values[0]}`].description = values[3] || values[6]
}

const parselsblkVolumeData = (acc) => (values) => {
  acc.volumes[`/dev/${values[0]}`] = acc.volumes[`/dev/${values[0]}`]
    ? acc.volumes[`/dev/${values[0]}`]
    : emptyVolume()
  acc.volumes[`/dev/${values[0]}`].id = acc.volumes[`/dev/${values[0]}`].id || `/dev/${values[0]}`
  acc.volumes[`/dev/${values[0]}`].fs = acc.volumes[`/dev/${values[0]}`].fs || values[2]
  acc.volumes[`/dev/${values[0]}`].mountPoint = acc.volumes[`/dev/${values[0]}`].mountPoint || values[2]
  acc.volumes[`/dev/${values[0]}`].read_only = values[4]
  acc.volumes[`/dev/${values[0]}`].removable = values[5]
  acc.volumes[`/dev/${values[0]}`].description = values[3] || values[6]
}

const parselsblk = (lsblk) => (acc) => compose(
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
)(lsblk)

const parsefdisklDeviceData = (acc) => ([head, ...tail]) => {
  const [name, size] = head.match(/Disk\s(.*):\s.*,\s(\d+)\sbytes/).slice(1)
  acc.devices[name] = acc.devices[name] ? acc.devices[name] : emptyDevice()
  acc.devices[name].size = parseInt(size)
  each(
    ifElse(
      (line) => line.match(/Sector.*:\s\d+\sbytes/),
      (line) => {
        const [logical, physical] = line.match(/(\d+).*(\d+)/).slice(1)
        acc.devices[name].block_size = parseInt(physical)
        acc.devices[name].volume_block_size = parseInt(logical)
      },
      () => {}
    ),
    tail
  )
  return acc
}

const parsefdisklVolumeData = (acc) => compose(
  ([name, sectors, description]) => {
    acc.volumes[name] = acc[name] ? acc[name] : emptyVolume()
    acc.volumes[name].name = name
    acc.volumes[name].blocks = sectors
    acc.volumes[name].description = description
    return acc
  },
  (l) => l.match(/([\w/\\:]+)\s+.*\s+(\d+)\s+[0-9]+\.[0-9]+[A-Z]{1}\s+(.*)/).slice(1)
)

const parsefdiskl = (fdiskl) => (acc) => compose(
  (blocks) => blocks.reduce((a, block, i) => ifElse(
    () => (i + 1) % 2,
    () => compose(parsefdisklDeviceData(a), splitEOL)(block),
    () => compose(map(parsefdisklVolumeData(a)), (arr) => arr.splice(1), splitEOL)(block)
  )(), acc),
  filter((s) => s.trim()), // remove empty lines
  splitEOL(2) // split into disk and volumes
)(fdiskl)

const parsedfT = (dft) => (acc) => compose(
  R.mapAccum(
    (acc, line) => compose(
      ([ name, filesystem, size, used, available, mountPoint ]) => {
        acc.volumes[name] = emptyVolume()
        acc.volumes[name].id = name
        acc.volumes[name].name = name
        acc.volumes[name].mounted = true
        acc.volumes[name].mountPoint = mountPoint
        acc.volumes[name].fs = filesystem === 'vfat' ? 'FAT32' : filesystem
        acc.volumes[name].space.total = parseInt(size) * 1024
        acc.volumes[name].space.available = parseInt(available) * 1024
        acc.volumes[name].space.used = parseInt(used) * 1024
        return acc
      },
      // split by space, except if space is preceeded by \ (paths with spaces)
      // This is used instead of a negative lookbehind (`(?<!\\)\s+`)
      (line) => line.split(/\s+/)
        .reduce((a, f) => {
          if (lasti(lasti(a)) === '\\') a[a.length - 1] += f
          else a.push(f)
          return a
        })
    )(line),
    acc
  ),
  (a) => a.slice(1), // remove table header
  filter((s) => s.trim() && !hasSubstr(s, 'tmpfs')), // remove empty lines & tmp file systems
  splitEOL
)(dft)

const parseLinux = (userFilter) => (output) => compose(
  filter(userFilter),
  ([dft, fdiskl, lsblk]) => compose(
    mergeVolumesAndDevicesLinux,
    parselsblk(lsblk),
    parsefdiskl(fdiskl),
    parsedfT(dft)
  )({ devices: {}, volumes: {} }),
  (s) => s.split(/\n\*+\n\n/), // Split both utilities
  stringify
)(output)

const linux = (filter, cb, sync = false) => {
  const cmd = 'df -T && ' +
  'echo "" && echo "**********" && echo "" && ' +
  'fdisk -l && ' +
  'echo "" && echo "**********" && echo "" && ' +
  'lsblk -o kname,fstype,mountpoint,label,ro,rm,model,type -P'

  return ifElse(
    () => sync,
    (cmd) => compose(parseLinux(filter), child.execSync)(cmd),
    (cmd) => composeP(curry(cb)(null), parseLinux(filter), child.exec)(cmd)
      .catch(cb)
  )(cmd)
}

// --------------------------------------
// Windows Filesystem Information Fetch
// --------------------------------------

const parseWindowsProps =
(acc, [ caption, desc, id, filesystem, space, name, size, volumename ]) => {
  acc.devices[name][id] = acc.devices[id] ? acc.devices[id] : emptyDevice()
  acc.devices[name][id].id = id
  acc.devices[name][id].node = caption
  acc.devices[name][id].name = name
  acc.devices[name][id].size = parseInt(size)
  acc.devices[name][id].description = desc

  const volume = emptyVolume()
  volume.name = volumename || null
  volume.mounted = true
  volume.mountPoint = name
  volume.fs = filesystem
  volume.space.total = parseInt(size)
  volume.space.available = parseInt(space)
  volume.space.used = parseInt(size) - parseInt(space)
  acc.devices[name][id].volumes = [volume]

  return acc
}

const parseWindows = (userFilter) => (output) => compose(
  filter(userFilter),
  reduce(
    (acc, v) => parseWindowsProps(acc, v.split(/\t|\s{2,}/)),
    { devices: {}, volumes: {} }
  ),
  (a) => a.splice(1),
  filter((s) => s.trim()),
  splitEOL,
  stringify
)(output)

const windows = (filter, cb, sync = false) => {
  const cmd = 'wmic logicaldisk get ' +
  'Caption,Description,DeviceID,FileSystem,FreeSpace,Name,Size,VolumeName'

  return ifElse(
    () => sync,
    (cmd) => compose(parseWindows(filter), child.execSync)(cmd),
    (cmd) => composeP(curry(cb)(null), parseWindows(filter), child.exec)(cmd)
      .catch(cb)
  )(cmd)
}

// --------------------------------------
// Export Functions
// --------------------------------------

const filesystem = (dev, callback) => cond([
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
])

const filesystemSync = (dev) => cond([
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
])

module.exports = filesystem
filesystem.sync = filesystemSync
