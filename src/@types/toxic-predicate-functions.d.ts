declare namespace toxicPredicateFunctions {
  function isFunction(val: any): val is Function;
  function isString(val: any): val is string;
}
declare module 'toxic-predicate-functions' {
  export = toxicPredicateFunctions;
}