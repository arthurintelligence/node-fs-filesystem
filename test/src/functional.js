'use strict'

const { expect } = require('chai')
const sinon = require('sinon')
const F = require('../../src/functional')

/* global after, before, describe, it */
/* eslint-disable no-unused-expressions */
describe('functional utilities', function () {
  var sandbox

  before(function (done) {
    sandbox = sinon.sandbox.create()
    done()
  })

  after(function (done) {
    sandbox.restore()
    done()
  })

  describe('identity / I combinator', function () {
    it('I should return the value provided', function (done) {
      const x = {}
      expect(F.I(x)).to.be.equal(x)
      done()
    })

    it('identity should return the value provided', function (done) {
      const x = {}
      expect(F.identity(x)).to.be.equal(x)
      done()
    })
  })

  describe('constant / K combinator', function () {
    it('K should return a function', function (done) {
      const x = {}
      expect(F.K(x)).to.be.a('function')
      done()
    })

    it('K should return the value initially provided, independently of any further input', function (done) {
      const x = {}
      expect(F.K(x)(Math.random())).to.be.equal(x)
      done()
    })

    it('constant should return a function', function (done) {
      const x = {}
      expect(F.constant(x)).to.be.a('function')
      done()
    })

    it('constant should return the value initially provided, independently of any further input', function (done) {
      const x = {}
      expect(F.constant(x)(Math.random())).to.be.equal(x)
      done()
    })
  })

  describe('each', function () {
    it('should return curried function if only provided looping function', function (done) {
      const f = () => {}
      expect(F.each(f)).to.be.a('function')
      done()
    })

    it('should iterate through second argument (array)', function (done) {
      const f = sinon.spy()
      const x = [1, 2, 3]
      F.each(f, x)
      expect(f.callCount).to.be.equal(3)
      const calls = f.getCalls()
      expect(calls[0].calledWithExactly(1)).to.be.true
      expect(calls[1].calledWithExactly(2)).to.be.true
      expect(calls[2].calledWithExactly(3)).to.be.true
      done()
    })

    it('should iterate through second argument (object)', function (done) {
      const f = sinon.spy()
      const x = { a: 1, b: 2, c: 3 }
      F.each(f, x)
      expect(f.callCount).to.be.equal(3)
      const calls = f.getCalls()
      expect(calls[0].calledWith(1, 'a', x)).to.be.true
      expect(calls[1].calledWith(2, 'b', x)).to.be.true
      expect(calls[2].calledWith(3, 'c', x)).to.be.true
      done()
    })
  })

  describe('ifElse', function () {
    it('should return function if not passed a value', function (done) {
      expect(F.ifElse(() => {}, () => {}, () => {})).to.be.a('function')
      done()
    })

    it('should call only if branch if condition returns true', function (done) {
      const truth = () => true
      const iff = sinon.spy()
      const elsef = sinon.spy()

      F.ifElse(
        truth,
        iff,
        elsef
      )()

      expect(iff.calledOnce).to.be.true
      expect(elsef.notCalled).to.be.true
      done()
    })

    it('should call only else branch if condition returns false', function (done) {
      const liar = () => false
      const iff = sinon.spy()
      const elsef = sinon.spy()

      F.ifElse(
        liar,
        iff,
        elsef
      )()

      expect(iff.notCalled).to.be.true
      expect(elsef.called).to.be.true
      done()
    })

    it('should call condition with the provided value', function (done) {
      const truth = sinon.spy(() => true)
      const iff = () => {}
      const elsef = () => {}
      const x = {}

      F.ifElse(
        truth,
        iff,
        elsef
      )(x)

      expect(truth.calledOnce).to.be.true
      expect(truth.calledWithExactly(x)).to.be.true
      done()
    })

    it('should call if branch with the provided value', function (done) {
      const truth = () => true
      const iff = sinon.spy()
      const elsef = () => {}
      const x = {}

      F.ifElse(
        truth,
        iff,
        elsef
      )(x)

      expect(iff.calledOnce).to.be.true
      expect(iff.calledWithExactly(x)).to.be.true
      done()
    })

    it('should call else branch with the provided value', function (done) {
      const liar = () => false
      const iff = () => {}
      const elsef = sinon.spy()
      const x = {}

      F.ifElse(
        liar,
        iff,
        elsef
      )(x)

      expect(elsef.calledOnce).to.be.true
      expect(elsef.calledWithExactly(x)).to.be.true
      done()
    })
  })

  describe('cond', function () {
    it('should call each condition in order and stop on first valid condition', function (done) {
      const test = function (index) {
        const conditionsCalled = []
        const pairs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].reduce((a, i) => {
          if (i !== index) {
            a.push({
              c: sinon.spy(() => { conditionsCalled.push(i); return false }),
              a: sinon.spy()
            })
          } else {
            a.push({
              c: sinon.spy(() => { conditionsCalled.push(i); return true }),
              a: sinon.spy()
            })
          }
          return a
        }, [])

        F.cond(...pairs)()

        for (let i = 0; i < pairs.length; i++) {
          if (i < index) {
            expect(conditionsCalled[i]).to.be.equal(i)
            expect(pairs[i].c.called).to.be.true
            expect(pairs[i].a.notCalled).to.be.true
          } else if (i === index) {
            expect(conditionsCalled[i]).to.be.equal(i)
            expect(pairs[i].c.called).to.be.true
            expect(pairs[i].a.called).to.be.true
          } else {
            expect(pairs[i].c.notCalled).to.be.true
            expect(pairs[i].a.notCalled).to.be.true
          }
        }
      }

      for (let i = 0; i < 10; i++) test(i)

      done()
    })

    it('should only call the action associated with the valid condition', function (done) {
      const test = function (index) {
        const conditionsCalled = []
        const pairs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].reduce((a, i) => {
          if (i !== index) {
            a.push({
              c: () => { conditionsCalled.push(i); return false },
              a: sinon.spy()
            })
          } else {
            a.push({
              c: () => { conditionsCalled.push(i); return true },
              a: sinon.spy()
            })
          }
          return a
        }, [])

        F.cond(...pairs)()

        for (let i = 0; i < index + 1; i++) {
          if (i !== index) expect(pairs[i].a.notCalled).to.be.true
          else expect(pairs[i].a.called).to.be.true
        }
      }

      for (let i = 0; i < 10; i++) test(i)

      done()
    })

    it('should pass the provided value to the conditions and called action', function (done) {
      const test = function (index) {
        const pairs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].reduce((a, i) => {
          if (i !== index) {
            a.push({
              c: sinon.spy(() => false),
              a: sinon.spy()
            })
          } else {
            a.push({
              c: sinon.spy(() => true),
              a: sinon.spy()
            })
          }
          return a
        }, [])

        F.cond(...pairs)(42)

        for (let i = 0; i <= index; i++) {
          if (i !== index) {
            expect(pairs[i].c.calledWith(42)).to.be.true
            expect(pairs[i].a.notCalled).to.be.true
          } else {
            expect(pairs[i].c.calledWith(42)).to.be.true
            expect(pairs[i].a.calledWith(42)).to.be.true
          }
        }
      }

      for (let i = 0; i < 10; i++) test(i)

      done()
    })
  })

  describe('eqeqeq', function () {
    it('should return a curried function', function (done) {
      expect(F.eqeqeq(42)).to.be.a('function')
      done()
    })

    /* eslint-disable no-new-wrappers */
    it('should return equality provided a second call', function (done) {
      // From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness
      const num = 0
      const obj = new String('0')
      const str = '0'

      expect(F.eqeqeq(num)(num)).to.be.true
      expect(F.eqeqeq(obj)(obj)).to.be.true
      expect(F.eqeqeq(str)(str)).to.be.true
      expect(F.eqeqeq(num)(obj)).to.be.false
      expect(F.eqeqeq(num)(str)).to.be.false
      expect(F.eqeqeq(obj)(str)).to.be.false
      expect(F.eqeqeq(null)(undefined)).to.be.false
      expect(F.eqeqeq(obj)(null)).to.be.false
      expect(F.eqeqeq(obj)(undefined)).to.be.false
      expect(F.eqeqeq(NaN)(NaN)).to.be.false

      done()
    })
    /* eslint-enable no-new-wrappers */
  })

  describe('tautology', function () {
    it('should return true no matter the input', function (done) {
      expect(F.tautology(true)).to.be.true
      expect(F.tautology(false)).to.be.true
      expect(F.tautology(null)).to.be.true
      expect(F.tautology(undefined)).to.be.true
      expect(F.tautology(0)).to.be.true
      expect(F.tautology(1)).to.be.true
      expect(F.tautology('')).to.be.true
      expect(F.tautology('1')).to.be.true
      expect(F.tautology({})).to.be.true
      expect(F.tautology(() => {})).to.be.true
      expect(F.tautology(Symbol('1'))).to.be.true
      done()
    })
  })

  describe('thrower', function () {
    it('should throw', function (done) {
      expect(F.thrower.bind(null)).to.throw('')
      done()
    })

    it('should throw with the provided message', function (done) {
      const err = 'Beautiful Cupcakes'
      expect(F.thrower.bind(null, err)).to.throw(err)
      done()
    })

    it('should throw with the provided message and the specified error type', function (done) {
      const err = 'TypeError: Beautiful Cupcakes'
      expect(F.thrower.bind(null, err, TypeError)).to.throw(err)
      done()
    })
  })
})
/* eslint-enable no-unused-expressions */
