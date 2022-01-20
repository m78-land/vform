import { CustomEvent } from '@lxjx/utils';
import { VField, VFieldLike, VFieldsProvideFn, VList } from './types';
export declare const defaultFormConfig: {
    defaultValue: {};
    verifyFirst: boolean;
};
/** 检测一个field like是否为 listField */
export declare function isListField(f: VFieldLike): f is VList;
/** 设置field私有属性, 用于判断field是否属于某个list */
export declare function setPrivateParent(field: VFieldLike, parent: VList): void;
export declare function getPrivateParent(field: VFieldLike): VList | null;
/** 将任意多个field数组去重并合并返回 */
export declare function uniqueFields(...fields: VFieldLike[][]): VFieldLike[];
/** 根据传入事件获取一个可以将多次触发合并到一次的emit, 实现nextTick */
export declare function getNextTickEmit(e: CustomEvent<VFieldsProvideFn>): (...args: VField[]) => void;
//# sourceMappingURL=common.d.ts.map