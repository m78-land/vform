import { VFormConfig, VForm } from './types';
import { defaultFormConfig } from './common';
import { formFactory } from './formFactory';
import { fieldFactory } from './fieldFactory';
import { listFactory } from './listFactory';

export function createVForm(config: VFormConfig = {}): VForm {
  const vConfig = {
    ...defaultFormConfig,
    ...config,
  };

  const [form, ctx] = formFactory(vConfig);

  form.createField = fieldFactory(form, ctx);

  form.createList = listFactory(form, ctx);

  return form;
}
