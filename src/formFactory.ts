import cloneDeep from 'lodash/cloneDeep';
import { createVerify } from '@m78/verify';
import { getNamePathValue, stringifyNamePath, setNamePathValue, createEvent } from '@lxjx/utils';
import {
  _Ctx,
  VFieldLike,
  VFieldsProvideFn,
  VForm,
  VFormConfig,
  VFormFailFn,
  VFormValueProvideFn,
  VList,
} from './types';
import { getNextTickEmit, getPrivateKey, isListField, privateKeyParent } from './common';

export function formFactory(config: VFormConfig): [VForm, _Ctx] {
  const { defaultValue: dv, verifyFirst } = config;

  const updateEvent = createEvent<VFieldsProvideFn>();
  const changeEvent = createEvent<VFieldsProvideFn>();
  const submitEvent = createEvent<VFormValueProvideFn>();
  const resetEvent = createEvent<VoidFunction>();
  const failEvent = createEvent<VFormFailFn>();

  const tickUpdate = getNextTickEmit(updateEvent);
  const tickChange = getNextTickEmit(changeEvent);

  const verifyInstance = createVerify(config);

  const ctx: _Ctx = {
    sortSeed: 0,
    sortStep: 100,
    defaultValue: cloneDeep(dv)!,
    list: [],
    touchLock: false,
    fieldFailEmitLock: false,
  };

  const form = {
    defaultValue: ctx.defaultValue,
    updateEvent,
    changeEvent,
    submitEvent,
    resetEvent,
    failEvent,
    verifyInstance,
    tickUpdate,
    tickChange,
  } as VForm;

  form.getField = name => {
    return form.getFlatFields().find(item => item.key === stringifyNamePath(name)) || null;
  };

  form.getFields = validIsTrue => {
    if (validIsTrue) return ctx.list.filter(i => i.valid);
    return ctx.list;
  };

  form.getFlatFields = validIsTrue => {
    const ls: VFieldLike[] = [];

    function recursionGetter(list?: VFieldLike[]) {
      if (!list?.length) return;

      list.forEach(field => {
        if (validIsTrue) {
          field.valid && ls.push(field);
        } else {
          ls.push(field);
        }

        if (isListField(field)) {
          if (validIsTrue && !field.valid) return;
          field.list.forEach(listItem => {
            recursionGetter(listItem.list);
          });
        }
      });
    }

    // 对主列表进行一次排序
    ctx.list.sort((a, b) => a.sort - b.sort);

    recursionGetter(ctx.list);

    return ls;
  };

  form.getValue = name => {
    const f = form.getField(name);

    if (!f) return;

    return f.value;
  };

  form.getValues = () => {
    const data: any = {};

    form.getFlatFields(true).forEach(field => {
      // list不获取值, 子级会自动设置
      if (isListField(field)) return;
      setNamePathValue(data, field.name, field.value);
    });

    return data;
  };

  form.setValues = v => {
    const fields = form.getFlatFields();

    fields.forEach(f => {
      f.value = getNamePathValue(v, f.name);
    });
  };

  form.reset = () => {
    form.getFlatFields().forEach(f => f.reset());
    resetEvent.emit();
  };

  form.verify = async () => {
    const errors: VFieldLike[] = [];

    const ls = form.getFlatFields(true);

    ctx.fieldFailEmitLock = true;

    for (const l of ls) {
      const sErrors = await l.verify();
      if (sErrors) {
        errors.push(l);
        if (verifyFirst) break;
      }
    }

    ctx.fieldFailEmitLock = false;

    if (errors.length) {
      form.failEvent.emit(errors, true);
      return errors;
    }

    return null;
  };

  form.submit = async () => {
    const rejFields = await form.verify();

    if (!rejFields) submitEvent.emit(form.getValues());
  };

  form.remove = name => {
    const ls = form.getFlatFields();

    const key = stringifyNamePath(name);

    const ind = ls.findIndex(item => item.key === key);
    const cur = ls[ind];

    const parent = getPrivateKey<VList | undefined>(cur, privateKeyParent);

    if (parent) {
      parent.list.forEach(item => {
        const i = item.list.findIndex(it => it.key === key);
        if (i !== -1) {
          tickUpdate(parent, ...item.list.splice(i, 1));
        }
      });
      return;
    }

    const ind2 = ctx.list.findIndex(item => item.key === cur.key);

    if (ind2 !== -1) {
      ctx.list.splice(ind, 1);

      if (isListField(cur)) {
        tickUpdate(cur, ...cur.getFlatChildren());
      } else {
        tickUpdate(cur);
      }
    }
  };

  form.listIncludeNames = (names, filedList) => {
    const nameMap: any = {};
    names.forEach(name => (nameMap[stringifyNamePath(name)] = 1));

    const cur = filedList.find(item => !!nameMap[item.key]);
    return !!cur;
  };

  Object.defineProperties(form, {
    changed: {
      get() {
        return form.getFlatFields().some(f => f.changed);
      },
    },
    touched: {
      set(n: boolean) {
        form.getFlatFields().forEach(f => (f.touched = n));
      },
      get() {
        return form.getFlatFields().some(f => f.touched);
      },
    },
  });

  return [form, ctx];
}
