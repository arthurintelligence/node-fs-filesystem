import os from 'os';

// --------------------------------------
// Common Core - Utility Functions
// --------------------------------------

export const lasti = (a) => a[a.length - 1];
export const stringify = (v) => v && (typeof v === 'object' || typeof v === 'symbol') ? v.toString() : `${v}`;
export const hasSubstr = (s, sub) => s.indexOf(sub) !== -1;
export const getYesNo = (v) => v === 'Yes' ? true : v === 'No' ? false : undefined;
export const splitEOL = (s) => typeof s === 'number'
  ? (v) => v.split(os.EOL.repeat(s))
  : s.split(os.EOL);

// --------------------------------------
// Common Core - Empty FS Objects
// --------------------------------------

export const emptyDevice = () => {
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
  };
};

export const emptyVolume = () => {
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
  };
};
