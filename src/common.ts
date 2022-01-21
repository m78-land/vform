import { AnyObject, CustomEvent } from '@lxjx/utils';
import { VField, VFieldLike, VFieldsProvideFn, VList } from './types';

export const defaultFormConfig = {
  defaultValue: {},
  verifyFirst: false,
};

/** 如果field属于某个list, 将list设置为它的parent */
export const privateKeyParent = 'parent';

/** 为vList设置一个用于存储默认字段的私有属性, 用于重置list时将其还原 */
export const privateKeyDefaultField = 'defaultField';

/** 手动设置values */
export const privateKeyDelaySetValues = 'defaultField';

/** 检测一个field like是否为 listField */
export function isListField(f: VFieldLike): f is VList {
  return 'list' in f;
}

/** 为对象设私有属性设置值 */
export function setPrivateKey(obj: AnyObject, k: string, v: any) {
  obj[`__${k}`] = v;
}

/** 获取对象设私有属性 */
export function getPrivateKey<V = any>(obj: AnyObject, k: string): V {
  return obj[`__${k}`];
}

/** 将任意多个field数组去重并合并返回 */
export function uniqueFields(...fields: VFieldLike[][]) {
  const ls: VFieldLike[] = [];
  const checkMap: any = {};
  fields.forEach(fList => {
    fList.forEach(it => {
      if (!checkMap[it.key]) {
        checkMap[it.key] = 1;
        ls.push(it);
      }
    });
  });
  return ls;
}

/** 根据传入事件获取一个可以将多次触发合并到一次的emit, 实现nextTick */
export function getNextTickEmit(e: CustomEvent<VFieldsProvideFn>) {
  let queue: VField[] = [];
  let nextTickT: any;

  return function push(...args: VField[]) {
    queue.push(...args);
    clearTimeout(nextTickT);
    nextTickT = setTimeout(() => {
      const m: any = {};

      e.emit(
        // 过滤掉同name的值
        queue.filter(item => {
          const has = !!m[item.key];
          m[item.key] = item.key;
          return !has;
        }),
      );
      queue = [];
    }, 0);
  };
}
