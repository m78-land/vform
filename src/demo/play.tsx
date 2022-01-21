import { createVForm } from '@m78/vform';
import { setNamePathValue } from '@lxjx/utils';

const obj = {
  list: [5555],
};

setNamePathValue(obj, ['list', '5'], 123123);

// obj.list[3] = 4444;

console.log(obj);

const form = createVForm({});

form.updateEvent.on(f => {
  console.log('update', f);
});

form.changeEvent.on(f => {
  console.log('change', f);
});

const list = form.createList({
  name: 'list',
  defaultValue: [
    {
      name: '1lxj',
      desc: '1',
    },
    {
      name: '2lxj2',
      desc: '2',
    },
    {
      name: '3lxj3',
      desc: '3',
    },
  ],
  onFillField: (vl, key, index) => {
    setTimeout(() => {
      vl.add({
        fields: [
          form.createField({ name: vl.withName(index, 'name'), separate: true }),
          form.createField({ name: vl.withName(index, 'desc'), separate: true }),
        ],
        key,
      });
    });
  },
});

// list.list.forEach((it, index) => {
//   list.add(
//     [
//       form.createField({
//         name: ['list', index.toString(), 'name'],
//         separate: true,
//         defaultValue: 111,
//       }),
//       form.createField({ name: ['list', index.toString(), 'desc'], separate: true }),
//     ],
//     it.key,
//     // true,
//   );
// });
//

// list.add({
//   fields: [
//     form.createField({ name: ['list', '0', 'name'], separate: true, defaultValue: 111 }),
//     form.createField({ name: ['list', '0', 'desc'], separate: true, defaultValue: 1111 }),
//   ],
// });

// list.value = [
//   {
//     name: 'lxj',
//     desc: '1',
//   },
//   {
//     name: 'lxj2',
//     desc: '2',
//   },
//   {
//     name: 'lxj3',
//     desc: '3',
//   },
//   {
//     name: 'lxj4',
//     desc: '4',
//   },
// ];

// 字段异步设置, 但是期间有value变更 如何处理

console.log(form.getFields());

list.add({
  fillValue: { name: 'hehe', desc: 44 },
});

list.add({
  fillValue: { name: 'hehe', desc: 44 },
});

list.add({
  fillValue: { name: 'hehe', desc: 44 },
});

setTimeout(() => {
  console.log(form.getValues());
}, 500);
