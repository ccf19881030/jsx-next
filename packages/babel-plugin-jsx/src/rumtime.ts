import { isVNode } from 'vue';

const isFunction = (val: unknown) => typeof val === 'function';
const isObject = (val: unknown) => Object.prototype.toString.call(val) === '[object Object]';

const isSlot = (s: unknown) => isFunction(s) || (isObject(s) && !isVNode(s));

export {
  isSlot,
};
