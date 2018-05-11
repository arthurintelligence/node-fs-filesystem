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
