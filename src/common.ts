import { CustomEvent } from '@lxjx/utils';
import { VField, VFieldLike, VFieldsProvideFn, VList } from './types';

export const defaultFormConfig = {
  defaultValue: {},
  verifyFirst: false,
};

/** 检测一个field like是否为 listField */
export function isListField(f: VFieldLike): f is VList {
  return 'list' in f;
}

/** 设置field私有属性, 用于判断field是否属于某个list */
export function setPrivateParent(field: VFieldLike, parent: VList) {
  (field as any).__parent = parent;
}

export function getPrivateParent(field: VFieldLike): VList | null {
  return (field as any).__parent || null;
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
