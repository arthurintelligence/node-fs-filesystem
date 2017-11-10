import { expect } from 'chai';
import sinon from 'sinon';
import F from '../../src/functional';

/* global after, before, describe, it */
/* eslint-disable no-unused-expressions */
describe('functional utilities', function () {
  var sandbox;

  before(function (done) {
    sandbox = sinon.sandbox.create();
    done();
  });

  after(function (done) {
    sandbox.restore();
    done();
  });

  describe('identity / I combinator', function () {
    it('I should return the value provided', function (done) {
      const x = {};
      expect(F.I(x)).to.be.equal(x);
      done();
    });

    it('identity should return the value provided', function (done) {
      const x = {};
      expect(F.identity(x)).to.be.equal(x);
      done();
    });
  });

  describe('flip / C combinator', function () {
    it('C(f) should return a function', function (done) {
      const f = () => {};
      expect(F.C(f)).to.be.a('function');
      done();
    });

    it('C(f)(a) should return a function', function (done) {
      const f = () => {};
      const a = {};
      expect(F.C(f)(a)).to.be.a('function');
      done();
    });

    it('C(f)(a)(b) should call f(a)(b)', function (done) {
      const fspy = sinon.spy();
      const f = (b) => { fspy(b); return f; };
      const a = {};
      const b = {};
      F.C(f)(a)(b);
      expect(fspy.getCall(0).calledWithExactly(b)).to.be.true;
      expect(fspy.getCall(1).calledWithExactly(a)).to.be.true;
      done();
    });
  });

  describe('substitute / S combinator', function () {
    it('S(f) should return a function', function (done) {
      const f = () => {};
      expect(F.S(f)).to.be.a('function');
      done();
    });

    it('S(f, g) should return a function', function (done) {
      const f = () => {};
      const g = () => {};
      expect(F.S(f, g)).to.be.a('function');
      done();
    });

    it('S(f)(g) should return a function', function (done) {
      const f = () => {};
      const g = () => {};
      expect(F.S(f)(g)).to.be.a('function');
      done();
    });

    it('S(f)(g) should return the same function definition as S(f, g)', function (done) {
      const f = () => {};
      const g = () => {};
      expect(JSON.stringify(F.S(f)(g))).to.be.equal(JSON.stringify(F.S(f, g)));
      done();
    });

    it('S(f)(g)(x) should call f(x)(g(x))', function (done) {
      const f = (x) => (y) => x + y;
      const g = (x) => 'y';
      const x = 'x';
      expect(F.S(f)(g)(x)).to.be.equal('xy');
      done();
    });
  });

  describe('each', function () {
    it('should return curried function if only provided looping function', function (done) {
      const f = () => {};
      expect(F.each(f)).to.be.a('function');
      done();
    });

    it('should iterate through second argument (array)', function (done) {
      // each(f, x)
      const f = sinon.spy();
      const x = [1, 2, 3];
      F.each(f, x);
      expect(f.callCount).to.be.equal(3);
      const fcalls = f.getCalls();
      expect(fcalls[0].calledWithExactly(1)).to.be.true;
      expect(fcalls[1].calledWithExactly(2)).to.be.true;
      expect(fcalls[2].calledWithExactly(3)).to.be.true;

      // each(f)(x)
      const g = sinon.spy();
      const y = [1, 2, 3];
      F.each(g)(y);
      expect(g.callCount).to.be.equal(3);
      const gcalls = g.getCalls();
      expect(gcalls[0].calledWithExactly(1)).to.be.true;
      expect(gcalls[1].calledWithExactly(2)).to.be.true;
      expect(gcalls[2].calledWithExactly(3)).to.be.true;
      done();
    });

    it('should iterate through second argument (object)', function (done) {
      // each(f, x)
      const f = sinon.spy();
      const x = { a: 1, b: 2, c: 3 };
      F.each(f, x);
      expect(f.callCount).to.be.equal(3);
      const fcalls = f.getCalls();
      expect(fcalls[0].calledWith(1, 'a', x)).to.be.true;
      expect(fcalls[1].calledWith(2, 'b', x)).to.be.true;
      expect(fcalls[2].calledWith(3, 'c', x)).to.be.true;

      // each(f)(x)
      const g = sinon.spy();
      const y = { a: 1, b: 2, c: 3 };
      F.each(g)(y);
      expect(g.callCount).to.be.equal(3);
      const gcalls = g.getCalls();
      expect(gcalls[0].calledWith(1, 'a', x)).to.be.true;
      expect(gcalls[1].calledWith(2, 'b', x)).to.be.true;
      expect(gcalls[2].calledWith(3, 'c', x)).to.be.true;
      done();
    });
  });

  describe('filter', function () {
    it('should return curried function if only provided looping function', function (done) {
      const f = () => {};
      expect(F.R.filter(f)).to.be.a('function');
      done();
    });

    it('should filter second argument (array)', function (done) {
      // filter(f, x)
      const fspy = sinon.spy();
      const f = (v) => { fspy(v); return v % 2; };
      const x = [1, 2, 3];

      const xfiltered = F.R.filter(f, x);
      expect(xfiltered.length).to.be.equal(2);
      expect(xfiltered[0]).to.be.equal(1);
      expect(xfiltered[1]).to.be.equal(3);

      expect(fspy.callCount).to.be.equal(3);
      const fcalls = fspy.getCalls();
      expect(fcalls[0].calledWithExactly(1)).to.be.true;
      expect(fcalls[1].calledWithExactly(2)).to.be.true;
      expect(fcalls[2].calledWithExactly(3)).to.be.true;

      // filter(f)(x)
      const gspy = sinon.spy();
      const g = (v) => { gspy(v); return v % 2; };
      const y = [1, 2, 3];

      const yfiltered = F.R.filter(g)(y);
      expect(yfiltered.length).to.be.equal(2);
      expect(yfiltered[0]).to.be.equal(1);
      expect(yfiltered[1]).to.be.equal(3);

      expect(gspy.callCount).to.be.equal(3);
      const gcalls = gspy.getCalls();
      expect(gcalls[0].calledWithExactly(1)).to.be.true;
      expect(gcalls[1].calledWithExactly(2)).to.be.true;
      expect(gcalls[2].calledWithExactly(3)).to.be.true;
      done();
    });

    it('should filter second argument (object)', function (done) {
      const fspy = sinon.spy();
      const f = (v, k, o) => { fspy(v, k, o); return v % 2; };
      const x = { a: 1, b: 2, c: 3 };

      const xfiltered = F.R.filter(f, x);
      expect(xfiltered.a).to.be.equal(1);
      expect(xfiltered.b).to.be.undefined;
      expect(xfiltered.c).to.be.equal(3);

      expect(fspy.callCount).to.be.equal(3);
      const fcalls = fspy.getCalls();
      expect(fcalls[0].calledWith(1, 'a', x)).to.be.true;
      expect(fcalls[1].calledWith(2, 'b', x)).to.be.true;
      expect(fcalls[2].calledWith(3, 'c', x)).to.be.true;

      const gspy = sinon.spy();
      const g = (v, k, o) => { gspy(v, k, o); return v % 2; };
      const y = { a: 1, b: 2, c: 3 };

      const yfiltered = F.R.filter(g)(y);
      expect(yfiltered.a).to.be.equal(1);
      expect(yfiltered.b).to.be.undefined;
      expect(yfiltered.c).to.be.equal(3);
      expect(gspy.callCount).to.be.equal(3);

      expect(gspy.callCount).to.be.equal(3);
      const gcalls = gspy.getCalls();
      expect(gcalls[0].calledWith(1, 'a', y)).to.be.true;
      expect(gcalls[1].calledWith(2, 'b', y)).to.be.true;
      expect(gcalls[2].calledWith(3, 'c', y)).to.be.true;
      done();
    });
  });

  describe('reduce', function () {
    it('reduce(f) should return a curried function', function (done) {
      const f = () => {};
      expect(F.R.reduce(f)).to.be.a('function');
      done();
    });

    it('reduce(f, a) should return a curried function', function (done) {
      const f = () => {};
      const a = {};
      expect(F.R.reduce(f, a)).to.be.a('function');
      done();
    });

    it('reduce(f)(a) should return a curried function', function (done) {
      const f = () => {};
      const a = {};
      expect(F.R.reduce(f)(a)).to.be.a('function');
      done();
    });

    it('reduce(f)(a) should return the same function definition as reduce(f, a)', function (done) {
      const f = () => {};
      const a = {};
      expect(JSON.stringify(F.R.reduce(f)(a))).to.be.equal(JSON.stringify(F.R.reduce(f, a)));
      done();
    });

    it('should reduce third argument (array)', function (done) {
      // reduce(f, a, x)
      const fspy = sinon.spy();
      const f = (a, v) => { fspy(v); return a + 2 * v; };
      const x = [1, 2, 3];

      const a = F.R.reduce(f, 0, x);
      expect(fspy.callCount).to.be.equal(3);
      const fcalls = fspy.getCalls();
      expect(fcalls[0].calledWithExactly(1)).to.be.true;
      expect(fcalls[1].calledWithExactly(2)).to.be.true;
      expect(fcalls[2].calledWithExactly(3)).to.be.true;
      expect(a).to.be.equal(12);

      // reduce(f)(a)(x)
      const gspy = sinon.spy();
      const g = (a, v) => { gspy(v); return a + 2 * v; };
      const y = [1, 2, 3];

      const b = F.R.reduce(g)(0)(y);
      expect(gspy.callCount).to.be.equal(3);
      const gcalls = gspy.getCalls();
      expect(gcalls[0].calledWithExactly(1)).to.be.true;
      expect(gcalls[1].calledWithExactly(2)).to.be.true;
      expect(gcalls[2].calledWithExactly(3)).to.be.true;
      expect(b).to.be.equal(12);

      // reduce(f)(a, x)
      const hspy = sinon.spy();
      const h = (a, v) => { hspy(v); return a + 2 * v; };
      const z = [1, 2, 3];

      const c = F.R.reduce(h)(0, z);
      expect(hspy.callCount).to.be.equal(3);
      const hcalls = hspy.getCalls();
      expect(hcalls[0].calledWithExactly(1)).to.be.true;
      expect(hcalls[1].calledWithExactly(2)).to.be.true;
      expect(hcalls[2].calledWithExactly(3)).to.be.true;
      expect(c).to.be.equal(12);
      done();
    });

    it('should filter second argument (object)', function (done) {
      // reduce(f, a, x)
      const fspy = sinon.spy();
      const f = (a, v, k, o) => { fspy(a, v, k, o); return a + 2 * v; };
      const x = { a: 1, b: 2, c: 3 };

      const a = F.R.reduce(f, 0, x);
      expect(fspy.callCount).to.be.equal(3);
      const fcalls = fspy.getCalls();
      expect(fcalls[0].calledWith(0, 1, 'a', x)).to.be.true;
      expect(fcalls[1].calledWith(2, 2, 'b', x)).to.be.true;
      expect(fcalls[2].calledWith(6, 3, 'c', x)).to.be.true;
      expect(a).to.be.equal(12);

      // reduce(f)(a)(x)
      const gspy = sinon.spy();
      const g = (a, v, k, o) => { gspy(a, v, k, o); return a + 2 * v; };
      const y = { a: 1, b: 2, c: 3 };

      const b = F.R.reduce(g)(0)(y);
      expect(gspy.callCount).to.be.equal(3);
      const gcalls = gspy.getCalls();
      expect(gcalls[0].calledWith(0, 1, 'a', y)).to.be.true;
      expect(gcalls[1].calledWith(2, 2, 'b', y)).to.be.true;
      expect(gcalls[2].calledWith(6, 3, 'c', y)).to.be.true;
      expect(b).to.be.equal(12);

      // reduce(f)(a, x)
      const hspy = sinon.spy();
      const h = (a, v, k, o) => { hspy(a, v, k, o); return a + 2 * v; };
      const z = { a: 1, b: 2, c: 3 };

      const c = F.R.reduce(h)(0)(z);
      expect(hspy.callCount).to.be.equal(3);
      const hcalls = hspy.getCalls();
      expect(hcalls[0].calledWith(0, 1, 'a', z)).to.be.true;
      expect(hcalls[1].calledWith(2, 2, 'b', z)).to.be.true;
      expect(hcalls[2].calledWith(6, 3, 'c', z)).to.be.true;
      expect(c).to.be.equal(12);
      done();
    });
  });

  describe('ifElse', function () {
    it('should return function if not passed a value', function (done) {
      expect(F.ifElse(() => {}, () => {}, () => {})).to.be.a('function');
      done();
    });

    it('should call only if branch if condition returns true', function (done) {
      const truth = () => true;
      const iff = sinon.spy();
      const elsef = sinon.spy();

      F.ifElse(
        truth,
        iff,
        elsef
      )();

      expect(iff.calledOnce).to.be.true;
      expect(elsef.notCalled).to.be.true;
      done();
    });

    it('should call only else branch if condition returns false', function (done) {
      const liar = () => false;
      const iff = sinon.spy();
      const elsef = sinon.spy();

      F.ifElse(
        liar,
        iff,
        elsef
      )();

      expect(iff.notCalled).to.be.true;
      expect(elsef.called).to.be.true;
      done();
    });

    it('should call condition with the provided value', function (done) {
      const truth = sinon.spy(() => true);
      const iff = () => {};
      const elsef = () => {};
      const x = {};

      F.ifElse(
        truth,
        iff,
        elsef
      )(x);

      expect(truth.calledOnce).to.be.true;
      expect(truth.calledWithExactly(x)).to.be.true;
      done();
    });

    it('should call if branch with the provided value', function (done) {
      const truth = () => true;
      const iff = sinon.spy();
      const elsef = () => {};
      const x = {};

      F.ifElse(
        truth,
        iff,
        elsef
      )(x);

      expect(iff.calledOnce).to.be.true;
      expect(iff.calledWithExactly(x)).to.be.true;
      done();
    });

    it('should call else branch with the provided value', function (done) {
      const liar = () => false;
      const iff = () => {};
      const elsef = sinon.spy();
      const x = {};

      F.ifElse(
        liar,
        iff,
        elsef
      )(x);

      expect(elsef.calledOnce).to.be.true;
      expect(elsef.calledWithExactly(x)).to.be.true;
      done();
    });
  });

  describe('cond', function () {
    it('should call each condition in order and stop on first valid condition', function (done) {
      const test = function (index) {
        const conditionsCalled = [];
        const pairs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].reduce((a, i) => {
          if(i !== index) {
            a.push({
              c: sinon.spy(() => { conditionsCalled.push(i); return false; }),
              a: sinon.spy()
            });
          }else{
            a.push({
              c: sinon.spy(() => { conditionsCalled.push(i); return true; }),
              a: sinon.spy()
            });
          }
          return a;
        }, []);

        F.cond(...pairs)();

        for(let i = 0; i < pairs.length; i++) {
          if(i < index) {
            expect(conditionsCalled[i]).to.be.equal(i);
            expect(pairs[i].c.called).to.be.true;
            expect(pairs[i].a.notCalled).to.be.true;
          }else if(i === index) {
            expect(conditionsCalled[i]).to.be.equal(i);
            expect(pairs[i].c.called).to.be.true;
            expect(pairs[i].a.called).to.be.true;
          }else{
            expect(pairs[i].c.notCalled).to.be.true;
            expect(pairs[i].a.notCalled).to.be.true;
          }
        }
      };

      for(let i = 0; i < 10; i++) test(i);

      done();
    });

    it('should only call the action associated with the valid condition', function (done) {
      const test = function (index) {
        const conditionsCalled = [];
        const pairs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].reduce((a, i) => {
          if(i !== index) {
            a.push({
              c: () => { conditionsCalled.push(i); return false; },
              a: sinon.spy()
            });
          }else{
            a.push({
              c: () => { conditionsCalled.push(i); return true; },
              a: sinon.spy()
            });
          }
          return a;
        }, []);

        F.cond(...pairs)();

        for(let i = 0; i < index + 1; i++) {
          if(i !== index) expect(pairs[i].a.notCalled).to.be.true;
          else expect(pairs[i].a.called).to.be.true;
        }
      };

      for(let i = 0; i < 10; i++) test(i);

      done();
    });

    it('should pass the provided value to the conditions and called action', function (done) {
      const test = function (index) {
        const pairs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].reduce((a, i) => {
          if(i !== index) {
            a.push({
              c: sinon.spy(() => false),
              a: sinon.spy()
            });
          }else{
            a.push({
              c: sinon.spy(() => true),
              a: sinon.spy()
            });
          }
          return a;
        }, []);

        F.cond(...pairs)(42);

        for(let i = 0; i <= index; i++) {
          if(i !== index) {
            expect(pairs[i].c.calledWith(42)).to.be.true;
            expect(pairs[i].a.notCalled).to.be.true;
          }else{
            expect(pairs[i].c.calledWith(42)).to.be.true;
            expect(pairs[i].a.calledWith(42)).to.be.true;
          }
        }
      };

      for(let i = 0; i < 10; i++) test(i);

      done();
    });

    it('should return the value if no condition is provided', function(done){
      const x = {};
      expect(F.cond()(x)).to.be.equal(x);
      done();
    });

    it('should return the value if no condition matches value is provided', function(done){
      const x = {};
      expect(F.cond({ c: () => false, a: () => {} })(x)).to.be.equal(x);
      done();
    });
  });

  describe('tap', function() {
    it('tap(f) should return a function', function (done) {
      const f = () => {};
      expect(F.tap(f)).to.be.a('function');
      done();
    });

    it('tap(f)(x) should call f(x) and return x', function (done) {
      const f = sinon.spy();
      const x = {};
      F.tap(f)(x);
      expect(f.calledOnce).to.be.true;
      expect(f.calledWithExactly(x)).to.be.true;
      done();
    });
  });

  describe('eqeqeq', function () {
    it('should return a curried function', function (done) {
      expect(F.eqeqeq(42)).to.be.a('function');
      done();
    });

    /* eslint-disable no-new-wrappers */
    it('should return equality provided a second call', function (done) {
      // From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness
      const num = 0;
      const obj = new String('0');
      const str = '0';

      expect(F.eqeqeq(num)(num)).to.be.true;
      expect(F.eqeqeq(obj)(obj)).to.be.true;
      expect(F.eqeqeq(str)(str)).to.be.true;
      expect(F.eqeqeq(num)(obj)).to.be.false;
      expect(F.eqeqeq(num)(str)).to.be.false;
      expect(F.eqeqeq(obj)(str)).to.be.false;
      expect(F.eqeqeq(null)(undefined)).to.be.false;
      expect(F.eqeqeq(obj)(null)).to.be.false;
      expect(F.eqeqeq(obj)(undefined)).to.be.false;
      expect(F.eqeqeq(NaN)(NaN)).to.be.false;

      done();
    });
    /* eslint-enable no-new-wrappers */
  });

  describe('tautology', function () {
    it('should return true no matter the input', function (done) {
      expect(F.tautology(true)).to.be.true;
      expect(F.tautology(false)).to.be.true;
      expect(F.tautology(null)).to.be.true;
      expect(F.tautology(undefined)).to.be.true;
      expect(F.tautology(0)).to.be.true;
      expect(F.tautology(1)).to.be.true;
      expect(F.tautology('')).to.be.true;
      expect(F.tautology('1')).to.be.true;
      expect(F.tautology({})).to.be.true;
      expect(F.tautology(() => {})).to.be.true;
      expect(F.tautology(Symbol('1'))).to.be.true;
      done();
    });
  });

  describe('thrower', function () {
    it('should throw', function (done) {
      expect(F.thrower.bind(null)).to.throw('');
      done();
    });

    it('should throw with the provided message', function (done) {
      const err = 'Beautiful Cupcakes';
      expect(F.thrower.bind(null, err)).to.throw(err);
      done();
    });

    it('should throw with the provided message and the specified error type', function (done) {
      const err = 'TypeError: Beautiful Cupcakes';
      expect(F.thrower.bind(null, err, TypeError)).to.throw(err);
      done();
    });
  });
});
/* eslint-enable no-unused-expressions */
