import {
  getNamePathValue,
  isNumber,
  isTrueEmpty,
  setNamePathValue,
  stringifyNamePath,
} from '@lxjx/utils';
import cloneDeep from 'lodash/cloneDeep';
import { _Ctx, VListItem, VField, VFieldConfig, VForm, VList } from './types';
import { getPrivateKey, isListField, privateKeyDefaultField, privateKeyParent } from './common';

export function fieldFactory(form: VForm, ctx: _Ctx) {
  return function createField(fConf: VFieldConfig): VField {
    const { name, defaultValue, sort: _sort } = fConf;

    const existField = form.getField(name);

    if (existField) return existField;

    let touched = false;
    let validating = false;
    let valid = true;
    let sort = _sort;
    let value = cloneDeep(getDefaultValue(true));
    let error: string = '';

    // 未设置sort时自动生成
    if (!isNumber(sort)) {
      ctx.sortSeed += ctx.sortStep;
      sort = ctx.sortSeed;
    }

    const field = {
      ...fConf,
      name,
      sort,
    } as VField;

    /** 依次从 Field -> List -> Form 获取该字段的默认值, 如果传入skipParentCheck则跳过list检测 */
    function getDefaultValue(skipParentCheck?: boolean) {
      if (defaultValue !== undefined) return defaultValue;

      if (!skipParentCheck) {
        // 如果存在list父级, 应该从父级取defaultValue
        const parent = getPrivateKey<VList | undefined>(field, privateKeyParent);

        if (parent && parent.defaultValue !== undefined) {
          const obj: any = {};
          setNamePathValue(obj, parent.name, parent.defaultValue);
          return getNamePathValue(obj, field.name);
        }
      }

      return getNamePathValue(form.defaultValue, name);
    }

    field.reset = () => {
      ctx.touchLock = true;

      // 如果是list则将其重置, 只保留包含default的项
      if (isListField(field)) {
        // 更新所有现有字段
        form.tickUpdate(...field.getFlatChildren());

        field.list = [...getPrivateKey<VListItem[]>(field, privateKeyDefaultField)];

        // 原地交换, 主要目的是更新name中的index
        if (field.list.length !== 0) {
          field.swap(0, 0);
        }

        // 为以更新的列表还原值
        field.getFlatChildren().forEach(it => {
          it.value = it.defaultValue;
          it.touched = false;
        });
      } else {
        field.value = cloneDeep(field.defaultValue);
      }

      field.validating = false;
      field.error = '';
      field.touched = false;
      ctx.touchLock = false;
    };

    field.verify = async () => {
      field.touched = true;

      // 超过指定延迟才设置loading
      const delayLoadingTimer = setTimeout(() => {
        field.validating = true;
      }, 200);

      const rej = await form.verifyInstance.singleAsyncCheck(field.value, field, {
        extraMeta: {
          form,
        },
      });

      clearTimeout(delayLoadingTimer);

      const nextError = rej ? rej[0].message : '';
      const isSame = field.error === nextError;
      field.error = nextError;
      field.validating = false;

      if (!isSame && !ctx.fieldFailEmitLock && rej) {
        form.failEvent.emit([field], false);
      }

      return field.error ? field : null;
    };

    Object.defineProperties(field, {
      defaultValue: {
        configurable: true,
        enumerable: true,
        get() {
          return getDefaultValue();
        },
      },
      key: {
        configurable: true,
        enumerable: true,
        get() {
          return stringifyNamePath(name);
        },
      },
      touched: {
        configurable: true,
        enumerable: true,
        get() {
          return touched;
        },
        set(n) {
          if (touched === n) return;
          touched = n;
          form.tickUpdate(field);
        },
      },
      value: {
        configurable: true,
        enumerable: true,
        get() {
          return value;
        },
        set(n) {
          if (value === n) return;
          value = n;
          if (!ctx.touchLock) field.touched = true;
          form.changeEvent.emit([field]);
        },
      },
      validating: {
        configurable: true,
        enumerable: true,
        get() {
          return validating;
        },
        set(n) {
          if (validating === n) return;
          validating = n;
          form.tickUpdate(field);
        },
      },
      error: {
        configurable: true,
        enumerable: true,
        get() {
          return error;
        },
        set(err: string) {
          if (error === err) return;
          error = err;
          form.tickUpdate(field);
        },
      },
      valid: {
        configurable: true,
        enumerable: true,
        get() {
          return valid;
        },
        set(v: boolean) {
          if (valid === v) return;
          valid = v;
          form.tickUpdate(field);
        },
      },
      changed: {
        configurable: true,
        enumerable: true,
        get() {
          if (field.defaultValue === field.value) return false;
          if (isTrueEmpty(field.defaultValue) && isTrueEmpty(field.value)) return false;

          try {
            // 这里使用stringify是基于以下考量:
            // - 能适应绝大多数情况的对比
            // - 对于表单值这样的小型转换, 性能足够优秀
            // - 相对于浅对比, 这种对比方式能在更多场景下获得更好的效果, 否则会经常出现引用地址变更导致changed与预期不符
            return JSON.stringify(field.defaultValue) !== JSON.stringify(field.value);
          } catch (e) {
            return true;
          }
        },
      },
    });

    if (!fConf.separate) {
      ctx.list.push(field);
    }

    return field;
  };
}
