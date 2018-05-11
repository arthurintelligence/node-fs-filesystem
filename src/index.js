import 'babel-polyfill';
import os from 'os';
import child from 'child_process';
import Promise from 'bluebird';
import F from './functional';
import { hasSubstr, stringify } from './utilities';
import linux from './linux';
import macOS from './macOS';
import windows from './windows';
const { tautology, thrower } = F;
const { compose, composeP } = F.R;
child.exec = Promise.promisify(child.exec, { context: child });

// --------------------------------------
// Common Core - Validation
// --------------------------------------

const validateDev = (dev) => {
  if(typeof dev === 'function') {
    return dev;
  }else if(typeof dev === 'string') {
    return (v, k) => hasSubstr(k, dev);
  }else if(dev instanceof RegExp) {
    return (v, k) => dev.test(k);
  }else if(typeof dev === 'undefined' || dev === null) {
    return tautology;
  }

  thrower(
    `fs.filesystem expected first argument 'dev' to be a function, string, regex or undefined/null. ` +
    `Found ${typeof dev === 'object' ? dev.constructor.name : typeof dev} instead.`,
    TypeError
  );
};

const validateCallback = (cb) => {
  if(typeof cb !== 'function') {
    thrower(
      `fs.filesystem expected second argument 'callback' to be instanceof function. ` +
      `Found ${typeof cb === 'object' ? cb.constructor.name : typeof cb} instead.`,
      TypeError
    );
  }

  return cb;
};

const validate = (validateDev, validateCallback) =>
  (dev, callback) => {
    if(typeof dev === 'function' && !callback) {
      return [ tautology, dev ];
    }

    return [ validateDev(dev), validateCallback(callback) ];
  };

// --------------------------------------
// Common Core - Main & Export Functions
// --------------------------------------

const ENVIRONMENT = {
  env: {
    LANG: 'en_US.UTF-8',
    PATH: process.env.PATH,
  },
};

const execute = (cmd, parser) => (filter, cb, sync = false) => {
  if(sync) {
    return compose(parser(filter), stringify, child.execSync)(cmd, ENVIRONMENT);
  }
  return composeP((v) => cb(null, v), parser(filter), stringify, child.exec)(cmd, ENVIRONMENT).catch(cb);
};

const filesystem = (macOS, linux, windows, validate, platform) => (dev, callback) => {
  switch(platform) {
  case 'darwin':
    return macOS(...validate(dev, callback)).devices;
  case 'linux':
    return linux(...validate(dev, callback)).devices;
  case 'win32':
    return windows(...validate(dev, callback)).devices;
  default:
    thrower(
      'fs.filesystem : Unsupported OS. fs.filesystem does not support ' +
      `${platform} at the moment`
    );
  }
};

const filesystemSync = (macOS, linux, windows, validateDev, platform) => (dev) => {
  switch(platform){
  case 'darwin':
    return macOS(validateDev(dev), null, true).devices;
  case 'linux':
    return linux(validateDev(dev), null, true).devices;
  case 'win32':
    return windows(validateDev(dev), null, true).devices;
  default:
    thrower(
      'fs.filesystem : Unsupported OS. fs.filesystem does not support ' +
      `${platform} at the moment`
    );
  }
};

const sync = filesystemSync(
  execute(macOS.COMMAND, macOS.parser),
  execute(linux.COMMAND, linux.parser),
  execute(windows.COMMAND, windows.parser),
  validateDev,
  os.platform()
);

export{ sync as filesystemSync, ENVIRONMENT };

export default filesystem(
  execute(macOS.COMMAND, macOS.parser),
  execute(linux.COMMAND, linux.parser),
  execute(windows.COMMAND, windows.parser),
  validate(validateDev, validateCallback),
  os.platform()
);
