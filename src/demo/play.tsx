import { createVForm } from '@m78/vform';

const form = createVForm({});

const list = form.createList({
  name: 'list',
  defaultValue: [
    {
      name: 'lxj',
      desc: '1',
    },
    // {
    //   name: 'lxj2',
    //   desc: '2',
    // },
    // {
    //   name: 'lxj3',
    //   desc: '3',
    // },
  ],
  onFillField: (vl, key, index) => {
    console.log(123, key, index);
    vl.add(
      [
        form.createField({ name: vl.withName(index, 'name'), separate: true }),
        form.createField({ name: vl.withName(index, 'desc'), separate: true }),
      ],
      key,
    );
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

// list.add(
//   [
//     form.createField({ name: ['list', '0', 'name'], separate: true }),
//     form.createField({ name: ['list', '0', 'desc'], separate: true }),
//   ],
//   undefined,
//   // true,
// );

//
// list.add([
//   form.createField({ name: ['list', '2', 'name'], separate: true }),
//   form.createField({ name: ['list', '2', 'desc'], separate: true }),
// ]);

// list.add([
//   form.createField({ name: ['list', '1', 'name'], separate: true }),
//   form.createField({ name: ['list', '1', 'desc'], separate: true }),
// ]);

list.value = [
  {
    name: 'lxj',
    desc: '1',
  },
  {
    name: 'lxj2',
    desc: '2',
  },
  {
    name: 'lxj3',
    desc: '3',
  },
];

list.move(0, 2);

// list.reset();

console.log(form.getFields());

setTimeout(() => {
  console.log(form.getValues());
});
