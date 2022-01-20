/**
 * form / field / value
 * */

import { Config, NamePath, Schema, Verify } from '@m78/verify';
import { AnyObject, CustomEvent } from '@lxjx/utils';

export type VFieldLike = VField | VList;

export type VFieldsProvideFn = (fields: VFieldLike[]) => void;

export type VFormValueProvideFn = (values: any) => void;

export type VFormFailFn = (fields: VFieldLike[], isSubmit: boolean) => void;

/**
 * verifyFirst默认为false
 * */
export interface VFormConfig extends Config {
  /** 表单默认值 */
  defaultValue?: AnyObject;
}

export interface VForm {
  /** 表单默认值 */
  defaultValue: AnyObject;
  /** 值是否被更新过 */
  readonly changed: boolean;
  /**
   * 是否被操作过, (验证/更新值)
   * - 将此项由true改为false时, 会将所有Field的touched同时改为false
   * */
  touched: boolean;
  /** 获取指定name的Field, 包括children中的子字段 */
  getField: (name: NamePath) => VField | null;
  /**
   * 获取所有Field, 不包括listField的子字段
   * - 传入validIsTrue: true时, 仅获取valid为true的字段
   * */
  getFields: (validIsTrue?: boolean) => VFieldLike[];
  /**
   * 获取所有Field, 包括children中的子字段
   * - 传入validIsTrue: true时, 仅获取valid为true的字段, 如果一个list的valid为false, 则会过滤掉其所有子级
   * */
  getFlatFields: (validIsTrue?: boolean) => VFieldLike[];
  /** 获取指定name的value */
  getValue: (name: NamePath) => any;
  /** 获取所有value */
  getValues: () => any;
  /** 设置value为指定值 */
  setValues: (v: AnyObject) => void;
  /** 移除指定name的字段 */
  remove: (name: NamePath) => void;
  /** 重置所有字段, 还原value为初始值, 重置error和touched */
  reset: () => void;
  /** 触发提交事件, 若验证未通过则不会触发事件 */
  submit: () => Promise<void>;
  /** 校验所有valid为true的字段, 未通过时resolve包含错误信息的所有Field */
  verify: () => Promise<VField[] | null>;
  /**
   * 创建一个指向name的Field
   * - 如果指定name的Field已存在, 则返回已有字段
   * */
  createField: (fConf: VFieldConfig) => VField;
  /** 创建列表 */
  createList: (fConf: VListConfig) => VList;
  /** 字段状态改变触发, (touched/reset/验证) */
  updateEvent: CustomEvent<VFieldsProvideFn>;
  /** 触发updateEvent.emit, 如果多次调用, 会在下一次事件周期中统一触发 */
  tickUpdate: (...args: VFieldLike[]) => void;
  /** 字段值改变事件 */
  changeEvent: CustomEvent<VFieldsProvideFn>;
  /** 触发changeEvent.emit, 如果多次调用, 会在下一次事件周期中统一触发 */
  tickChange: (...args: VFieldLike[]) => void;
  /** 提交事件 */
  submitEvent: CustomEvent<VFormValueProvideFn>;
  /** 验证失败的回调, 失败分为form级的验证失败和field级的, 可通过isSubmit参数区分 */
  failEvent: CustomEvent<VFormFailFn>;
  /** 重置事件 */
  resetEvent: CustomEvent<VoidFunction>;
  /** 内部使用的`@m78/verify` 实例 */
  verifyInstance: Verify;
  /** 一个工具函数, 用来检测指定的name是否在一组filed中 */
  listIncludeNames: (names: NamePath[], filedList: VField[]) => boolean;
}

export interface VFieldConfig extends Schema {
  /** 字段排序, 控制字段的验证顺序, 默认会根据字段创建顺序递增 */
  sort?: number;
  /** 字段默认值, 优先级大于form中设置的默认值 */
  defaultValue?: any;
  /** false | 设置为true时, 在创建后不再自动push到实例列表中 */
  separate?: boolean;
}

export interface VField extends Schema {
  /** 字段默认值 */
  readonly defaultValue: any;
  /** name的字符串表示 */
  readonly key: string;
  /** 排序, 用于控制验证顺序 */
  sort: number;
  /** 值是否被更新过 */
  readonly changed: boolean;
  /** 是否被操作过, (验证/更新值) */
  touched: boolean;
  /** value */
  value: any;
  /** 是否正在验证 */
  validating: boolean;
  /** 最后一次执行验证时的错误信息 */
  error: string;
  /** 是否生效, 未生效的表单不会参与验证, 获取值时也会被忽略 */
  valid: boolean;
  /** 验证, 未通过时resolve包含错误内容的Field信息 */
  verify: () => Promise<VField | null>;
  /**
   * 重置字段, 还原value为初始值, 重置error和touched
   * 如果是list字段, 会将列表还原为初始状态, 仅保留add时指定了isDefault的项
   * */
  reset: () => void;
}

export interface VListConfig extends VFieldConfig {
  /**
   * 当defaultValue初始化或手动更改list的value时, 如果当前list.value数组的长度大于现有的VListItem数量, list内部会自动创建VListItem来补齐缺少的数量,
   * 每一次触发补齐都会触发一次此回调, 可以在此回调中添加上缺少的字段
   *
   * 传入自动添加的ListItem的key和所属索引, 可以通过list上的add和withName方法来添加字段:
   * ```
   * onFillField: ((item, index) => {
   *   list.add([
   *     form.createField({ name: list.withName(index, 'name'), separate: true }),
   *     form.createField({ name: list.withName(index, 'desc'), separate: true }),
   *   ]);
   * });
   * ```
   * */
  onFillField?: (vList: VList, key: string, index: number) => void;
}

export interface VList extends VField {
  /** 存放list子项 */
  list: VListItem[];
  /** 创建子项name的帮助函数 */
  withName: (index: number, name: NamePath) => NamePath;
  /**
   * 新增一条记录, 如果未传key则新增在最底部, 如果索引已存在记录则增加到该记录中
   * - isDefault用于设置list的初始项, 重置时会对这些初始项进行保留 */
  add: (fields: VFieldLike[], key?: string, isDefault?: boolean) => void;
  /** 移除指定index的记录 */
  remove: (index: number) => void;
  /** 将index的记录移动到index2的位置 */
  move: (index: number, index2: number) => void;
  /** 交换两条记录的位置 */
  swap: (index: number, index2: number) => void;
  /**
   * 获取展开的children
   * - 传入validIsTrue: true时, 仅获取valid为true的字段
   * */
  getFlatChildren: (validIsTrue?: boolean) => VFieldLike[];
}

/** 一个list项 */
export interface VListItem {
  key: string;
  list: VField[];
}

export interface _Ctx {
  /** 排序基准值 */
  sortSeed: number;
  /** 排序步进 */
  sortStep: number;
  /** 默认value */
  defaultValue: AnyObject;
  /** 所有实例 */
  list: VField[];
  /** 用于主动更新value但不想自动更改touched时使用 */
  touchLock: boolean;
  /** 锁定field级的fail事件触发 */
  fieldFailEmitLock: boolean;
}
