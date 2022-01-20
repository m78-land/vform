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
    const field = form.createField({
      ...fConf,
      separate: true,
    });

    if (!isArray(field.value)) {
      ctx.touchLock = true;
      field.value = [];
      ctx.touchLock = false;
    }

    const vList: VList = Object.assign(field as VList, {
      list: [],
    });

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

    vList.add = (fields, key, isDefault) => {
      const updateList: VFieldLike[] = [vList];

      // 设置私有字段标示
      fields.forEach(item => {
        setPrivateKey(item, privateKeyParent, vList);
      });

      if (!key) {
        const lItem = {
          key: createRandString(),
          list: uniqueFields(fields),
        };

        if (isDefault) {
          getPrivateKey<VListItem[]>(vList, privateKeyDefaultField)[vList.list.length] = lItem;
        }

        vList.list.push(lItem);
        updateList.push(...fields);
      } else {
        const [current] = getListItemByKey(key);

        if (current) {
          current.list = uniqueFields(current.list, fields);
          updateList.push(...current.list);
        }
      }

      // 将所有新增字段的值设置为默认值?
      fields.forEach(item => {
        ctx.touchLock = true;
        if (item.value === undefined) {
          item.value = item.defaultValue;
        }
        ctx.touchLock = false;
      });

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

    vList.withName = (index, name) => {
      return [...ensureArray(vList.name), String(index), ...ensureArray(name)];
    };

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

        // 设置值时, 如果值长度大于当前list, 往list后添加空的记录, 如果小于, 删除list中多出来的列
        if (diff < 0) {
          const rLs = vList.list.splice(val.length, Math.abs(diff));
          const changes = rLs.reduce<VFieldLike[]>((p, i) => {
            p.push(...i.list);
            return p;
          }, []);
          if (changes.length) form.tickUpdate(...changes);
        } else if (diff > 0) {
          for (let i = 0; i < diff; i++) {
            vList.add([], undefined);
            const curIndex = len + i;
            // 自动增加了记录, 对外通知
            fConf.onFillField?.(vList, vList.list[curIndex].key, curIndex);
          }
        }

        vList.getFlatChildren().forEach(item => {
          const obj: any = {};
          setNamePathValue(obj, vList.name, val);
          item.value = getNamePathValue(obj, item.name);
        });
      },
    });

    // 包含默认值时将列表扩展到对应长度, 列表字段无法确定所以交给用户根据list长度自动补全
    if (isArray(vList.defaultValue) && vList.defaultValue.length) {
      vList.defaultValue.forEach(() => vList.add([], undefined, true));
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
