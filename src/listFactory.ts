import {
  AnyFunction,
  createRandString,
  isArray,
  swap as swapArray,
  move as moveArray,
  getNamePathValue,
  setNamePathValue,
  ensureArray,
} from '@lxjx/utils';
import { _Ctx, VListItem, VFieldLike, VForm, VList } from './types';
import {
  uniqueFields,
  setPrivateKey,
  privateKeyParent,
  privateKeyDefaultField,
  getPrivateKey,
} from './common';

export function listFactory(form: VForm, ctx: _Ctx) {
  const createList: VForm['createList'] = fConf => {
    const existField = form.getField(fConf.name);

    if (existField) return existField as VList;

    const field = form.createField({
      ...fConf,
      separate: true,
    });

    // value不是数组时将其强制转换为数组
    if (!isArray(field.value)) {
      ctx.touchLock = true;
      field.value = [];
      ctx.touchLock = false;
    }

    const vList: VList = Object.assign(field as VList, {
      list: [],
    });

    // 备份需要为自动fill的字段填充的值
    const fillValueMap: any = {};

    setPrivateKey(vList, privateKeyDefaultField, []);

    vList.getFlatChildren = (validIsTrue?: boolean) => {
      const ls: VFieldLike[] = [];

      if (validIsTrue && !vList.valid) return [];

      vList.list.forEach(item => {
        item.list.forEach(f => {
          if (validIsTrue) {
            f.valid && ls.push(f);
          } else {
            ls.push(f);
          }
        });
      });

      return ls;
    };

    /** 获取指定key的listItem */
    function getListItemByKey(key: string): [VListItem | null, number] {
      const ind = vList.list.findIndex(item => item.key === key);
      return [vList.list[ind] || null, ind];
    }

    /** children顺序变更后使用, 同步所有item的index为其所在位置的索引 */
    function syncItemNameIndex() {
      const indInd = ensureArray(vList.name).length;

      vList.list.forEach((item, index) => {
        item.list.forEach(it => {
          (it.name[indInd] as any) = String(index);
        });
      });
    }

    /** swap&move生成器 */
    function swapAndMoveHelper(ind1: number, ind2: number, fn: AnyFunction) {
      const updateList: VFieldLike[] = [vList];

      const fCurrent = vList.list[ind1];
      const tCurrent = vList.list[ind2];

      if (!fCurrent || !tCurrent) return;

      updateList.push(...fCurrent.list, ...tCurrent.list);

      fn(vList.list, ind1, ind2);

      syncItemNameIndex();

      form.tickUpdate(...updateList);
      form.tickChange(vList);
    }

    vList.withName = (index, name = []) => {
      return [...ensureArray(vList.name), String(index), ...ensureArray(name)];
    };

    vList.add = ({ fields = [], key, isDefault, fillValue } = {}) => {
      const updateList: VFieldLike[] = [vList];

      // 为所有子项设置私有字段标示
      fields.forEach(item => {
        setPrivateKey(item, privateKeyParent, vList);
      });

      const _key = key || createRandString();
      // 当前操作的item记录
      let _current: VListItem | null = null;

      // 如果传入了fillValue则覆盖当前的
      if (fillValue !== undefined) {
        fillValueMap[_key] = fillValue;
      }

      // 未传入key时先后新增
      if (!key) {
        const lItem: VListItem = {
          key: _key,
          list: uniqueFields(fields),
        };

        if (isDefault) {
          getPrivateKey<VListItem[]>(vList, privateKeyDefaultField)[vList.list.length] = lItem;
        }

        vList.list.push(lItem);
        updateList.push(...fields);

        _current = lItem;
      } else {
        // 包含key, 新增到key的位置并去重
        const [current] = getListItemByKey(_key);

        if (current) {
          current.list = uniqueFields(current.list, fields);
          updateList.push(...current.list);
          _current = current;
        }
      }

      const index = vList.list.findIndex(item => item === _current);

      // 为所有新增的field设置默认值或fillValues
      if (_current) {
        const fillData: any = fillValueMap[_key];
        // 用于fillValue取值的对象
        const vData: any = {};

        if (fillData !== undefined) {
          setNamePathValue(vData, vList.withName(index), fillData);
        }

        _current.list.forEach(item => {
          ctx.touchLock = true;

          if (fillData !== undefined) {
            item.value = getNamePathValue(vData, item.name);
          } else if (item.value === undefined) {
            item.value = item.defaultValue;
          }

          ctx.touchLock = false;
        });
      }

      // 未传入field时, 通知onFillField
      if (!fields.length) {
        fConf.onFillField?.(vList, _key, index);
      }

      form.tickUpdate(...updateList);
      form.tickChange(vList);
    };

    vList.remove = (index: number) => {
      const updateList: VFieldLike[] = [vList];

      const current = vList.list[index];

      if (current) {
        updateList.push(...current.list);

        vList.list.splice(index, 1);

        syncItemNameIndex();

        form.tickUpdate(...updateList);
        form.tickChange(vList);
      }
    };

    vList.move = (key1, key2) => swapAndMoveHelper(key1, key2, moveArray);

    vList.swap = (key1, key2) => swapAndMoveHelper(key1, key2, swapArray);

    Object.defineProperty(vList, 'value', {
      configurable: true,
      enumerable: true,
      // 获取值, 需要获取所有子级的值并组合返回
      get() {
        const obj: any = {};
        vList.getFlatChildren(true).forEach(item => {
          setNamePathValue(obj, item.name, item.value);
        });
        return getNamePathValue(obj, vList.name);
      },
      // 设置值, 需要设置所有子级的值
      set(val) {
        if (!isArray(val)) return;

        const len = vList.list.length;
        const diff = val.length - len;

        if (diff < 0) {
          // val长度小于当期记录数, 删除list中多出来的记录
          const rLs = vList.list.splice(val.length, Math.abs(diff));
          const changes = rLs.reduce<VFieldLike[]>((p, i) => {
            p.push(...i.list);
            return p;
          }, []);
          if (changes.length) form.tickUpdate(...changes);
        } else if (diff > 0) {
          // val大于当前记录数, 将缺少的记录添加为空白记录并触发onFillField
          for (let i = 0; i < diff; i++) {
            const curIndex = len + i;

            vList.add({
              fillValue: val[curIndex],
            });

            const key = vList.list[curIndex].key;

            // 自动增加了记录, 对外通知
            fConf.onFillField?.(vList, key, curIndex);
          }
        }

        vList.getFlatChildren().forEach(item => {
          const obj: any = {};
          setNamePathValue(obj, vList.name, val);
          item.value = getNamePathValue(obj, item.name);
        });

        // 将值记录到fillValue中, 用于处理field挂载在value赋值之后的情况
        vList.list.forEach((item, index) => {
          fillValueMap[item.key] = val[index];
        });

        form.tickChange(vList);
      },
    });

    // 包含默认值时将列表扩展到对应长度, 列表字段无法确定所以交给用户根据list长度自动补全
    if (isArray(vList.defaultValue) && vList.defaultValue.length) {
      vList.defaultValue.forEach(() =>
        vList.add({
          isDefault: true,
        }),
      );
      fConf.onFillField &&
        vList.list.forEach((item, index) => fConf.onFillField?.(vList, item.key, index));
    }

    if (!fConf.separate) {
      ctx.list.push(vList);
    }

    return vList;
  };
  return createList;
}
