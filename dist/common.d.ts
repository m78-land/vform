import { AnyObject, CustomEvent } from '@lxjx/utils';
import { VField, VFieldLike, VFieldsProvideFn, VList } from './types';
export declare const defaultFormConfig: {
    defaultValue: {};
    verifyFirst: boolean;
};
/** 如果field属于某个list, 将list设置为它的parent */
export declare const privateKeyParent = "parent";
/** 为vList设置一个用于存储默认字段的私有属性, 用于重置list时将其还原 */
export declare const privateKeyDefaultField = "defaultField";
/** 手动设置values */
export declare const privateKeyDelaySetValues = "defaultField";
/** 检测一个field like是否为 listField */
export declare function isListField(f: VFieldLike): f is VList;
/** 为对象设私有属性设置值 */
export declare function setPrivateKey(obj: AnyObject, k: string, v: any): void;
/** 获取对象设私有属性 */
export declare function getPrivateKey<V = any>(obj: AnyObject, k: string): V;
/** 将任意多个field数组去重并合并返回 */
export declare function uniqueFields(...fields: VFieldLike[][]): VFieldLike[];
/** 根据传入事件获取一个可以将多次触发合并到一次的emit, 实现nextTick */
export declare function getNextTickEmit(e: CustomEvent<VFieldsProvideFn>): (...args: VField[]) => void;
//# sourceMappingURL=common.d.ts.map