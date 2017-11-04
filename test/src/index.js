import os from 'os';
import { expect } from 'chai';
import sinon from 'sinon';
import rewire from 'rewire';

const fsfilesystem = rewire('../../src/index.js');


// eqeqeq :: * -> * -> Bool
const neqeqeq = (x) => (y) => x !== y;

// ifElse :: (a -> Bool), (a -> *), (a -> *) -> (a -> *)
const ifElse = function ifElse (f, g, h) {
  return (x) => f(x) ? g(x) : h(x);
};

describe('node-fs-filesystem', function() {
  describe('common core', function() {
    describe('lasti', function(){
      const lasti = fsfilesystem.__get__('lasti');

      it('should return the last index of an array', function(done) {
        const a = [0, 1, 2];
        expect(lasti(a)).to.be.equal(2);
        a.pop();
        expect(lasti(a)).to.be.equal(1);
        a.pop();
        expect(lasti(a)).to.be.equal(0);
        done();
      });

      it('should return undefined for an empty array', function(done) {
        expect(lasti([])).to.be.undefined;
        done();
      });

      it('should return the last index of a string', function(done) {
        const a = '012';
        expect(lasti(a)).to.be.equal('2');
        expect(lasti(a.substr(0, 2))).to.be.equal('1');
        expect(lasti(a.substr(0, 1))).to.be.equal('0');
        done();
      });

      it('should return undefined for an empty string', function(done) {
        expect(lasti('')).to.be.undefined;
        done();
      });
    });

    describe('stringify', function(){
      const stringify = fsfilesystem.__get__('stringify');

      it('should call the toString method on the passed object', function(done){
        const o = {
          toString: sinon.spy()
        };
        stringify(o);
        expect(o.toString.calledOnce).to.be.true;
        done();
      });

      it('should cast the passed primitive value to a string', function(done){
        expect(stringify(true)).to.be.equal('true');
        expect(stringify(0)).to.be.equal('0');
        expect(stringify(0.1)).to.be.equal('0.1');
        expect(stringify(null)).to.be.equal('null');
        expect(stringify(undefined)).to.be.equal('undefined');
        expect(stringify(Symbol('Cupcakes'))).to.be.equal('Symbol(Cupcakes)');
        expect(stringify(() => {})).to.be.equal('function () {}');
        done();
      });
    });

    describe('hasSubstr', function(){
      const hasSubstr = fsfilesystem.__get__('hasSubstr');

      it('should return true if substring is part of string', function(done){
        expect(hasSubstr('sa', 'a')).to.be.true;
        done();
      });

      it('should return false if substring is not part of string', function(done){
        expect(hasSubstr('sa', 'b')).to.be.false;
        done();
      });
    });

    describe('getYesNo', function(){
      const getYesNo = fsfilesystem.__get__('getYesNo');

      it('should return true if argument is \'Yes\'', function(done){
        expect(getYesNo('Yes')).to.be.true;
        done();
      });

      it('should return false if argument is \'No\'', function(done){
        expect(getYesNo('No')).to.be.false;
        done();
      });

      it('should return undefined otherwise', function(done){
        expect(getYesNo('foo')).to.be.undefined;
        expect(getYesNo(true)).to.be.undefined;
        expect(getYesNo(false)).to.be.undefined;
        expect(getYesNo(0)).to.be.undefined;
        expect(getYesNo(1)).to.be.undefined;
        expect(getYesNo(null)).to.be.undefined;
        expect(getYesNo(undefined)).to.be.undefined;
        expect(getYesNo(Symbol('Cupcakes'))).to.be.undefined;
        expect(getYesNo(() => {})).to.be.undefined;
        expect(getYesNo({})).to.be.undefined;
        done();
      });
    });

    describe('splitEOL', function(){
      const splitEOL = fsfilesystem.__get__('splitEOL');

      it('should split string on the EOL character', function(done){
        const split = splitEOL(['a', 'b', 'c'].join(os.EOL));
        expect(split[0]).to.be.equal('a');
        expect(split[1]).to.be.equal('b');
        expect(split[2]).to.be.equal('c');
        done();
      });

      it('should return a function if provided a number', function(done){
        expect(splitEOL(2)).to.be.a('function');
        done();
      });

      it('should split string on multiple EOL characters', function(done){
        const arr = [`a${os.EOL}a`, `a${os.EOL}a`, `a${os.EOL}a`];
        const split = splitEOL(2)(arr.join(`${os.EOL}${os.EOL}`));
        expect(split[0]).to.be.equal(arr[0]);
        expect(split[1]).to.be.equal(arr[1]);
        expect(split[2]).to.be.equal(arr[2]);
        done();
      });
    });

    describe('validateDev', function() {
      const validateDev = fsfilesystem.__get__('validateDev');

      it('should return dev if dev is a function', function(done){
        const dev = sinon.spy();
        expect(validateDev(dev)).to.be.equal(dev);
        done();
      });

      it('should return a function matching against dev if dev is a string', function(done){
        const dev = 'hello';
        const filter = validateDev(dev);
        expect(filter('hello')).to.be.true;
        expect(filter('Hello')).to.be.false;
        expect(filter('ello')).to.be.true;
        expect(filter('a')).to.be.false;
        done();
      });

      it('should return a function testing dev if dev is instanceof RegExp', function(done){
        const dev = /[a-z]{2}0/;
        const filter = validateDev(dev);
        expect(filter('az0')).to.be.equal(dev.test('az0'));
        expect(filter('b0')).to.be.equal(dev.test('b0'));
        expect(filter('aG0')).to.be.equal(dev.test('aG0'));
        expect(filter('az')).to.be.equal(dev.test('az'));
        expect(filter('yta0')).to.be.equal(dev.test('yta0'));
        done();
      });

      it('should return a tautological function given an undefined/null value', function(done){
        const tautology = fsfilesystem.__get__('tautology');
        expect(validateDev(undefined)).to.be.equal(tautology);
        expect(validateDev(null)).to.be.equal(tautology);
        done();
      });

      it('should throw if dev is not a function, string, regex or undefined/null', function(done){
        const throws = (value) => {
          expect(validateDev.bind(null, value)).to.throw(
            `fs.filesystem expected first argument 'dev' to be a function, string, regex or undefined/null. ` +
            `Found ${typeof value === 'object' ? value.constructor.name : typeof value} instead.`
          );
        };

        throws(true);
        throws(false);
        throws(0);
        throws(1);
        throws(Symbol('Cupcakes'));
        throws({});
        done();
      });
    });

    describe('validateCallback', function() {
      const validateCallback = fsfilesystem.__get__('validateCallback');

      it('should return the passed argument if it is a function', function(done){
        const callback = () => {};
        expect(validateCallback(callback)).to.be.equal(callback);
        done();
      });

      it('should throw if callback is not a function', function(done){
        const throws = (value) => {
          expect(validateCallback.bind(null, value)).to.throw(
            `fs.filesystem expected second argument 'callback' to be instanceof function. ` +
            `Found ${typeof value === 'object' ? value.constructor.name : typeof value} instead.`
          );
        };

        throws(true);
        throws(false);
        throws(0);
        throws(1);
        throws(Symbol('Cupcakes'));
        throws({});
        done();
      });
    });

    describe('validate', function() {
      const validate = fsfilesystem.__get__('validate');

      it('should return tautology as filter and first arg as callback if first arg is a function and second is undefined', function(done){
        const tautology = fsfilesystem.__get__('tautology');
        const first = () => {};
        const validated = validate(() => {}, () => {})(first);
        expect(validated[0]).to.be.equal(tautology);
        expect(validated[1]).to.be.equal(first);
        done();
      });

      it('should return an array with validated first and second arg if both are provided', function(done){
        const vdspy = sinon.spy();
        const validateDev = (f) => { vdspy(f); return f; };
        const vcspy = sinon.spy();
        const validateCallback = (f) => { vcspy(f); return f; };
        const first = () => {};
        const second = () => {};
        const validated = validate(validateDev, validateCallback)(first, second);
        expect(validated[0]).to.be.equal(first);
        expect(validated[1]).to.be.equal(second);
        expect(vdspy.calledOnce).to.be.true;
        expect(vdspy.calledWith(first)).to.be.true;
        expect(vcspy.calledOnce).to.be.true;
        expect(vcspy.calledWith(second)).to.be.true;
        done();
      });
    });

    describe('execute', function() {
      const execute = fsfilesystem.__get__('execute');

      it('should exec child process and feed the output in curried parser (sync = true)', function(done) {
        const cmd = `echo 'Hello World!'`;
        const parserSpy1 = sinon.spy();
        const parserSpy2 = sinon.spy();
        const filter = () => {};
        const parser = (f) => {
          parserSpy1(f);
          return (x) => { parserSpy2(x); return x; };
        };

        execute(cmd, parser)(filter, null, true);
        expect(parserSpy1.calledOnce).to.be.true;
        expect(parserSpy1.calledWith(filter)).to.be.true;
        expect(parserSpy2.calledOnce).to.be.true;
        expect(parserSpy2.args[0][0].toString()).to.be.equal('Hello World!\n');
        done();
      });

      it('should exec child process and throw an error (sync = true)', function(done) {
        const cmd = os.platform() === 'win32'
          ? `1>&2 echo 'Echoed Error'\nexit /b 1`
          : `>&2 echo 'Echoed Error'; exit 1`;
        const parserSpy1 = sinon.spy();
        const parserSpy2 = sinon.spy();
        const filter = () => {};
        const parser = (f) => {
          parserSpy1(f);
          return (x) => { parserSpy2(x); return x; };
        };

        const exe = execute(cmd, parser);
        expect(exe.bind(null, filter, null, true)).to.throw(
          `Command failed: >&2 echo 'Echoed Error'; exit 1\n` +
          'Echoed Error\n'
        );
        done();
      });

      it('should exec child process and feed the output in curried parser, then callback (sync = false)', function() {
        const cmd = `echo 'Hello World!'`;
        const parserSpy1 = sinon.spy();
        const parserSpy2 = sinon.spy();
        const filter = () => {};
        const callback = sinon.spy();
        const parser = (f) => {
          parserSpy1(f);
          return (x) => { parserSpy2(x); return x.toString(); };
        };

        return execute(cmd, parser)(filter, callback)
          .then(() => {
            expect(parserSpy1.calledOnce).to.be.true;
            expect(parserSpy1.calledWith(filter)).to.be.true;
            expect(parserSpy2.calledOnce).to.be.true;
            expect(parserSpy2.args[0][0].toString()).to.be.equal('Hello World!\n');
            expect(callback.calledOnce).to.be.true;
            expect(callback.args[0][0]).to.be.null;
            expect(callback.args[0][1]).to.be.a('string');
          });
      });

      it('should exec child process and catch an error (sync = false)', function() {
        const cmd = os.platform() === 'win32'
          ? `1>&2 echo 'Echoed Error'\nexit /b 1`
          : `>&2 echo 'Echoed Error'; exit 1`;
        const parserSpy1 = sinon.spy();
        const parserSpy2 = sinon.spy();
        const filter = () => {};
        const callback = sinon.spy();
        const parser = (f) => {
          parserSpy1(f);
          return (x) => { parserSpy2(x); return x; };
        };

        return execute(cmd, parser)(filter, callback)
          .then(() => {
            expect(callback.calledOnce).to.be.true;
            expect(callback.args[0][0]).to.be.instanceof(Error);
            expect(callback.args[0][0].message).to.be.equal(
              `Command failed: >&2 echo 'Echoed Error'; exit 1\n` +
              'Echoed Error\n'
            );
          });
      });
    });

    describe('filesystem', function() {
      const filesystem = fsfilesystem.__get__('filesystem');

      it('should call the appropriate os function (macOS)', function(done) {
        const macOS = sinon.spy();
        const linux = sinon.spy();
        const windows = sinon.spy();
        const validate = () => [() => {}, () => {}];
        filesystem(macOS, linux, windows, validate, 'darwin')('dev', () => {});
        expect(macOS.calledOnce).to.be.true;
        expect(linux.notCalled).to.be.true;
        expect(windows.notCalled).to.be.true;
        done();
      });

      it('should call the appropriate os function (linux)', function(done) {
        const macOS = sinon.spy();
        const linux = sinon.spy();
        const windows = sinon.spy();
        const validate = () => [() => {}, () => {}];
        filesystem(macOS, linux, windows, validate, 'linux')('dev', () => {});
        expect(macOS.notCalled).to.be.true;
        expect(linux.calledOnce).to.be.true;
        expect(windows.notCalled).to.be.true;
        done();
      });

      it('should call the appropriate os function (windows)', function(done) {
        const macOS = sinon.spy();
        const linux = sinon.spy();
        const windows = sinon.spy();
        const validate = () => [() => {}, () => {}];
        filesystem(macOS, linux, windows, validate, 'win32')('dev', () => {});
        expect(macOS.notCalled).to.be.true;
        expect(linux.notCalled).to.be.true;
        expect(windows.calledOnce).to.be.true;
        done();
      });

      it('should throw an error for unsupported OSes', function(done) {
        const macOS = sinon.spy();
        const linux = sinon.spy();
        const windows = sinon.spy();
        const validate = () => [() => {}, () => {}];
        const aix = filesystem(macOS, linux, windows, validate, 'aix');
        const freebsd = filesystem(macOS, linux, windows, validate, 'freebsd');
        const openbsd = filesystem(macOS, linux, windows, validate, 'openbsd');
        const sunos = filesystem(macOS, linux, windows, validate, 'sunos');
        const any = filesystem(macOS, linux, windows, validate, '~mAgIcAL OpERaTing sYS~');
        expect(aix.bind(null, 'dev', () => {})).to.throw(
          'fs.filesystem : Unsupported OS. fs.filesystem does not support ' +
          'aix at the moment'
        );
        expect(freebsd.bind(null, 'dev', () => {})).to.throw(
          'fs.filesystem : Unsupported OS. fs.filesystem does not support ' +
          'freebsd at the moment'
        );
        expect(openbsd.bind(null, 'dev', () => {})).to.throw(
          'fs.filesystem : Unsupported OS. fs.filesystem does not support ' +
          'openbsd at the moment'
        );
        expect(sunos.bind(null, 'dev', () => {})).to.throw(
          'fs.filesystem : Unsupported OS. fs.filesystem does not support ' +
          'sunos at the moment'
        );
        expect(any.bind(null, 'dev', () => {})).to.throw(
          'fs.filesystem : Unsupported OS. fs.filesystem does not support ' +
          '~mAgIcAL OpERaTing sYS~ at the moment'
        );
        done();
      });
    });

    describe('filesystemSync', function() {
      const filesystemSync = fsfilesystem.__get__('filesystemSync');

      it('should call the appropriate os function with sync = true (macOS)', function(done) {
        const macOS = sinon.spy();
        const linux = sinon.spy();
        const windows = sinon.spy();
        const dev = () => {};
        const validate = () => dev;
        filesystemSync(macOS, linux, windows, validate, 'darwin')('dev', () => {});
        expect(macOS.calledOnce).to.be.true;
        expect(linux.notCalled).to.be.true;
        expect(windows.notCalled).to.be.true;
        expect(macOS.calledWith(validate(), null, true)).to.be.true;
        done();
      });

      it('should call the appropriate os function with sync = true (linux)', function(done) {
        const macOS = sinon.spy();
        const linux = sinon.spy();
        const windows = sinon.spy();
        const dev = () => {};
        const validate = () => dev;
        filesystemSync(macOS, linux, windows, validate, 'linux')('dev', () => {});
        expect(macOS.notCalled).to.be.true;
        expect(linux.calledOnce).to.be.true;
        expect(windows.notCalled).to.be.true;
        expect(linux.calledWith(validate(), null, true)).to.be.true;
        done();
      });

      it('should call the appropriate os function with sync = true (windows)', function(done) {
        const macOS = sinon.spy();
        const linux = sinon.spy();
        const windows = sinon.spy();
        const dev = () => {};
        const validate = () => dev;
        filesystemSync(macOS, linux, windows, validate, 'win32')('dev', () => {});
        expect(macOS.notCalled).to.be.true;
        expect(linux.notCalled).to.be.true;
        expect(windows.calledOnce).to.be.true;
        expect(windows.calledWith(validate(), null, true)).to.be.true;
        done();
      });

      it('should throw an error for unsupported OSes', function(done) {
        const macOS = sinon.spy();
        const linux = sinon.spy();
        const windows = sinon.spy();
        const dev = () => {};
        const validate = () => dev;
        const aix = filesystemSync(macOS, linux, windows, validate, 'aix');
        const freebsd = filesystemSync(macOS, linux, windows, validate, 'freebsd');
        const openbsd = filesystemSync(macOS, linux, windows, validate, 'openbsd');
        const sunos = filesystemSync(macOS, linux, windows, validate, 'sunos');
        const any = filesystemSync(macOS, linux, windows, validate, '~mAgIcAL OpERaTing sYS~');
        expect(aix.bind(null, 'dev', () => {})).to.throw(
          'fs.filesystem : Unsupported OS. fs.filesystem does not support ' +
          'aix at the moment'
        );
        expect(freebsd.bind(null, 'dev', () => {})).to.throw(
          'fs.filesystem : Unsupported OS. fs.filesystem does not support ' +
          'freebsd at the moment'
        );
        expect(openbsd.bind(null, 'dev', () => {})).to.throw(
          'fs.filesystem : Unsupported OS. fs.filesystem does not support ' +
          'openbsd at the moment'
        );
        expect(sunos.bind(null, 'dev', () => {})).to.throw(
          'fs.filesystem : Unsupported OS. fs.filesystem does not support ' +
          'sunos at the moment'
        );
        expect(any.bind(null, 'dev', () => {})).to.throw(
          'fs.filesystem : Unsupported OS. fs.filesystem does not support ' +
          '~mAgIcAL OpERaTing sYS~ at the moment'
        );
        done();
      });
    });
  });

  describe('macOS functions', ifElse(
    neqeqeq('darwin'),
    () => function(){
      it('should not run macOS tests on this platform', (done) => done());
    },
    () => function(){
      it('should run macOS tests on this platform', (done) => done());
    }
  )(os.platform()));

  describe('linux functions', ifElse(
    neqeqeq('linux'),
    () => function(){
      it('should not run linux tests on this platform', (done) => done());
    },
    () => function(){
      it('should run linux tests on this platform', (done) => done());
    }
  )(os.platform()));

  describe('windows functions', ifElse(
    neqeqeq('win32'),
    () => function(){
      it('should not run windows tests on this platform', (done) => done());
    },
    () => function(){
      it('should run windows tests on this platform', (done) => done());
    }
  )(os.platform()));
});
