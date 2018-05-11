import {
  compose,
  composeP,
  filter as rfilter,
  forEach,
  forEachObjIndexed,
  keys,
  map,
  mapAccum,
  reduce as rreduce,
} from 'ramda';

// each :: (a -> *), [a]|Object -> undefined
const each = (f, x) => x
  ? !Array.isArray(x) ? forEachObjIndexed(f, x) : forEach(f, x)
  : (x) => !Array.isArray(x) ? forEachObjIndexed(f, x) : forEach(f, x);

// reductor :: ((a, b, x) -> a), a, x -> a
const reductor = (f, a, x) => {
  if(Array.isArray(x)){
    return x.reduce(f, a);
  }else{
    let acc = a;
    for(let k in x){
      acc = f(acc, x[k], k, x);
    }
    return acc;
  }
};

// reduce :: ((a, b, x) -> a) -> a -> x -> a
// reduce :: ((a, b, x) -> a), a -> x -> a
// reduce :: ((a, b, x) -> a), a, x -> a
const reduce = (f, a, x) => x
  ? reductor(f, a, x)
  : a
    ? (x) => reductor(f, a, x)
    : (a, x) => x ? reductor(f, a, x) : (x) => reductor(f, a, x);

// filter :: Object -> Object
const filterObjIndexed = (f, x) => {
  return compose(
    rreduce((acc, k) => { acc[k] = x[k]; return acc; }, {}),
    rfilter((k) => f(x[k], k, x)),
    keys
  )(x);
};

// filter :: Object|[a] -> Object|[a]
const filter = (f, x) => x
  ? !Array.isArray(x) ? filterObjIndexed(f, x) : rfilter(f, x)
  : (x) => !Array.isArray(x) ? filterObjIndexed(f, x) : rfilter(f, x);

// tautology :: * -> Bool
const tautology = () => true;

// thrower :: string, Error|undefined -> undefined
const thrower = (msg, Type = Error) => { throw new Type(msg); };

module.exports = {
  each,
  filter,
  tautology,
  thrower,
  R: {
    compose,
    composeP,
    map,
    mapAccum,
    reduce,
    each,
    filter,
  },
};
