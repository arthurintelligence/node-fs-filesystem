// --------------------------------------
// Common Core - Utility Functions
// --------------------------------------

export const lasti = (a) => a[a.length - 1];
export const stringify = (v) => v && v.toString ? v.toString() : `${v}`;
export const hasSubstr = (s, sub) => s.indexOf(sub) !== -1;
export const getYesNo = (v) => v === 'Yes' ? true : v === 'No' ? false : undefined;

// --------------------------------------
// Common Core - Empty FS Objects
// --------------------------------------

export const emptyDevice = () => {
  return {
    id: null,
    node: null,
    whole: false,
    parent: null,
    name: null,
    size: null,
    description: null,
    protocol: null,
    blockSize: null,
    readOnly: null,
    removable: null,
  };
};

export const emptyVolume = () => {
  return {
    id: null,
    node: null,
    whole: false,
    parent: null,
    name: null,
    description: null,
    blockSize: null,
    blocks: null,
    readOnly: null,
    mounted: null,
    mountPoint: null,
    partitionType: null,
    fs: null,
    space: { total: null, available: null, used: null },
  };
};
