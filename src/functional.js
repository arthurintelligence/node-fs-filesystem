import R from 'ramda';
const { compose, composeP, curry, map, reduce, filter } = R;

// I :: a -> a
const I = (x) => x;

// K :: a -> b -> a
const K = (x) => (y) => x;

// each :: (a -> *), [a]|Object -> undefined
const each = (f, x) => {
  if(x) {
    return !Array.isArray(x) ? R.forEachObjIndexed(f, x) : R.forEach(f, x);
  }else{
    return (x) => !Array.isArray(x) ? R.forEachObjIndexed(f, x) : R.forEach(f, x);
  }
};

// ifElse :: (a -> Bool), (a -> *), (a -> *) -> (a -> *)
const ifElse = function ifElse (f, g, h) {
  return (x) => f(x) ? g(x) : h(x);
};

// condr :: x, Integer, [{ c: (x -> Bool), a: (x -> *)}] -> *|x
const condr = function condr (x, i, cs) {
  return i < cs.length ? (cs[i].c(x) ? cs[i].a(x) : condr(x, i + 1, cs)) : x;
};

// cond :: [{ c: (x -> Bool), a: (x -> *)}] -> x -> *
const cond = function cond (...cases) {
  return (x) => ifElse((cs) => cs.length, (cs) => condr(x, 0, cs), K(x))(cases);
};

// eqeqeq :: * -> * -> Bool
const eqeqeq = (x) => (y) => x === y;

// tautology :: * -> Bool
const tautology = () => true;

// thrower :: string, Error|undefined -> undefined
const thrower = (msg, Type = Error) => { throw new Type(msg); };

module.exports = {
  I,
  K,
  each,
  ifElse,
  cond,
  eqeqeq,
  tautology,
  thrower,
  identity: I,
  constant: K,
  R: {
    compose,
    composeP,
    curry,
    map,
    reduce,
    each,
    filter
  }
};
