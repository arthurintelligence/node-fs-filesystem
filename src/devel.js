import os from 'os';
import { filesystemSync } from './index';

const title = `fs-filesystem output on ${os.platform()} ${os.release()}`;
const bar = '-'.repeat(title.length);
const output = filesystemSync();

console.log(bar);
console.log(title);
console.log(bar);
console.log('%o', output);
