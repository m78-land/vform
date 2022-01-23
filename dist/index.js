import { __awaiter, __generator, __spreadArray, __assign } from 'tslib';
import cloneDeep from 'lodash/cloneDeep';
import { createVerify } from '@m78/verify';
import { createEvent, stringifyNamePath, setNamePathValue, getNamePathValue, isNumber, isTrueEmpty, isArray, ensureArray, createRandString, move, swap } from '@lxjx/utils';

var defaultFormConfig = {
    defaultValue: {},
    verifyFirst: false,
};
/** 如果field属于某个list, 将list设置为它的parent */
var privateKeyParent = 'parent';
/** 为vList设置一个用于存储默认字段的私有属性, 用于重置list时将其还原 */
var privateKeyDefaultField = 'defaultField';
/** 检测一个field like是否为 listField */
function isListField(f) {
    return 'list' in f;
}
/** 为对象设私有属性设置值 */
function setPrivateKey(obj, k, v) {
    obj["__" + k] = v;
}
/** 获取对象设私有属性 */
function getPrivateKey(obj, k) {
    return obj["__" + k];
}
/** 将任意多个field数组去重并合并返回 */
function uniqueFields() {
    var fields = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        fields[_i] = arguments[_i];
    }
    var ls = [];
    var checkMap = {};
    fields.forEach(function (fList) {
        fList.forEach(function (it) {
            if (!checkMap[it.key]) {
                checkMap[it.key] = 1;
                ls.push(it);
            }
        });
    });
    return ls;
}
/** 根据传入事件获取一个可以将多次触发合并到一次的emit, 实现nextTick */
function getNextTickEmit(e) {
    var queue = [];
    var nextTickT;
    return function push() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        queue.push.apply(queue, args);
        clearTimeout(nextTickT);
        nextTickT = setTimeout(function () {
            var m = {};
            e.emit(
            // 过滤掉同name的值
            queue.filter(function (item) {
                var has = !!m[item.key];
                m[item.key] = item.key;
                return !has;
            }));
            queue = [];
        }, 0);
    };
}

function formFactory(config) {
    var _this = this;
    var dv = config.defaultValue, verifyFirst = config.verifyFirst;
    var updateEvent = createEvent();
    var changeEvent = createEvent();
    var submitEvent = createEvent();
    var resetEvent = createEvent();
    var failEvent = createEvent();
    var tickUpdate = getNextTickEmit(updateEvent);
    var tickChange = getNextTickEmit(changeEvent);
    var verifyInstance = createVerify(config);
    var ctx = {
        sortSeed: 0,
        sortStep: 100,
        defaultValue: cloneDeep(dv),
        list: [],
        touchLock: false,
        fieldFailEmitLock: false,
    };
    var form = {
        defaultValue: ctx.defaultValue,
        updateEvent: updateEvent,
        changeEvent: changeEvent,
        submitEvent: submitEvent,
        resetEvent: resetEvent,
        failEvent: failEvent,
        verifyInstance: verifyInstance,
        tickUpdate: tickUpdate,
        tickChange: tickChange,
    };
    form.getField = function (name) {
        return form.getFlatFields().find(function (item) { return item.key === stringifyNamePath(name); }) || null;
    };
    form.getFields = function (validIsTrue) {
        if (validIsTrue)
            return ctx.list.filter(function (i) { return i.valid; });
        return ctx.list;
    };
    form.getFlatFields = function (validIsTrue) {
        var ls = [];
        function recursionGetter(list) {
            if (!(list === null || list === void 0 ? void 0 : list.length))
                return;
            list.forEach(function (field) {
                if (validIsTrue) {
                    field.valid && ls.push(field);
                }
                else {
                    ls.push(field);
                }
                if (isListField(field)) {
                    if (validIsTrue && !field.valid)
                        return;
                    field.list.forEach(function (listItem) {
                        recursionGetter(listItem.list);
                    });
                }
            });
        }
        // 对主列表进行一次排序
        ctx.list.sort(function (a, b) { return a.sort - b.sort; });
        recursionGetter(ctx.list);
        return ls;
    };
    form.getValue = function (name) {
        var f = form.getField(name);
        if (!f)
            return;
        return f.value;
    };
    form.getValues = function () {
        var data = {};
        form.getFlatFields(true).forEach(function (field) {
            // list不获取值, 子级会自动设置
            if (isListField(field))
                return;
            setNamePathValue(data, field.name, field.value);
        });
        return data;
    };
    form.setValues = function (v) {
        var fields = form.getFlatFields();
        fields.forEach(function (f) {
            f.value = getNamePathValue(v, f.name);
        });
    };
    form.reset = function () {
        form.getFlatFields().forEach(function (f) { return f.reset(); });
        resetEvent.emit();
    };
    form.verify = function () { return __awaiter(_this, void 0, void 0, function () {
        var errors, ls, _i, ls_1, l, sErrors;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    errors = [];
                    ls = form.getFlatFields(true);
                    ctx.fieldFailEmitLock = true;
                    _i = 0, ls_1 = ls;
                    _a.label = 1;
                case 1:
                    if (!(_i < ls_1.length)) return [3 /*break*/, 4];
                    l = ls_1[_i];
                    return [4 /*yield*/, l.verify()];
                case 2:
                    sErrors = _a.sent();
                    if (sErrors) {
                        errors.push(l);
                        if (verifyFirst)
                            return [3 /*break*/, 4];
                    }
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    ctx.fieldFailEmitLock = false;
                    if (errors.length) {
                        form.failEvent.emit(errors, true);
                        return [2 /*return*/, errors];
                    }
                    return [2 /*return*/, null];
            }
        });
    }); };
    form.submit = function () { return __awaiter(_this, void 0, void 0, function () {
        var rejFields;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, form.verify()];
                case 1:
                    rejFields = _a.sent();
                    if (!rejFields)
                        submitEvent.emit(form.getValues());
                    return [2 /*return*/];
            }
        });
    }); };
    form.remove = function (name) {
        var ls = form.getFlatFields();
        var key = stringifyNamePath(name);
        var ind = ls.findIndex(function (item) { return item.key === key; });
        var cur = ls[ind];
        var parent = getPrivateKey(cur, privateKeyParent);
        if (parent) {
            parent.list.forEach(function (item) {
                var i = item.list.findIndex(function (it) { return it.key === key; });
                if (i !== -1) {
                    tickUpdate.apply(void 0, __spreadArray([parent], item.list.splice(i, 1)));
                }
            });
            return;
        }
        var ind2 = ctx.list.findIndex(function (item) { return item.key === cur.key; });
        if (ind2 !== -1) {
            ctx.list.splice(ind, 1);
            if (isListField(cur)) {
                tickUpdate.apply(void 0, __spreadArray([cur], cur.getFlatChildren()));
            }
            else {
                tickUpdate(cur);
            }
        }
    };
    form.listIncludeNames = function (names, filedList) {
        var nameMap = {};
        names.forEach(function (name) { return (nameMap[stringifyNamePath(name)] = 1); });
        var cur = filedList.find(function (item) { return !!nameMap[item.key]; });
        return !!cur;
    };
    Object.defineProperties(form, {
        changed: {
            get: function () {
                return form.getFlatFields().some(function (f) { return f.changed; });
            },
        },
        touched: {
            set: function (n) {
                form.getFlatFields().forEach(function (f) { return (f.touched = n); });
            },
            get: function () {
                return form.getFlatFields().some(function (f) { return f.touched; });
            },
        },
    });
    return [form, ctx];
}

function fieldFactory(form, ctx) {
    return function createField(fConf) {
        var _this = this;
        var name = fConf.name, defaultValue = fConf.defaultValue, _sort = fConf.sort;
        var existField = form.getField(name);
        if (existField)
            return existField;
        var touched = false;
        var validating = false;
        var valid = true;
        var sort = _sort;
        var value = cloneDeep(getDefaultValue(true));
        var error = '';
        // 未设置sort时自动生成
        if (!isNumber(sort)) {
            ctx.sortSeed += ctx.sortStep;
            sort = ctx.sortSeed;
        }
        var field = __assign(__assign({}, fConf), { name: name,
            sort: sort });
        /** 依次从 Field -> List -> Form 获取该字段的默认值, 如果传入skipParentCheck则跳过list检测 */
        function getDefaultValue(skipParentCheck) {
            if (defaultValue !== undefined)
                return defaultValue;
            if (!skipParentCheck) {
                // 如果存在list父级, 应该从父级取defaultValue
                var parent_1 = getPrivateKey(field, privateKeyParent);
                if (parent_1 && parent_1.defaultValue !== undefined) {
                    var obj = {};
                    setNamePathValue(obj, parent_1.name, parent_1.defaultValue);
                    return getNamePathValue(obj, field.name);
                }
            }
            return getNamePathValue(form.defaultValue, name);
        }
        field.reset = function () {
            ctx.touchLock = true;
            // 如果是list则将其重置, 只保留包含default的项
            if (isListField(field)) {
                // 更新所有现有字段
                form.tickUpdate.apply(form, field.getFlatChildren());
                field.list = __spreadArray([], getPrivateKey(field, privateKeyDefaultField));
                // 原地交换, 主要目的是更新name中的index
                if (field.list.length !== 0) {
                    field.swap(0, 0);
                }
                // 为以更新的列表还原值
                field.getFlatChildren().forEach(function (it) {
                    it.value = it.defaultValue;
                    it.touched = false;
                });
            }
            else {
                field.value = cloneDeep(field.defaultValue);
            }
            field.validating = false;
            field.error = '';
            field.touched = false;
            ctx.touchLock = false;
        };
        field.verify = function () { return __awaiter(_this, void 0, void 0, function () {
            var delayLoadingTimer, rej, nextError, isSame;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        field.touched = true;
                        delayLoadingTimer = setTimeout(function () {
                            field.validating = true;
                        }, 200);
                        return [4 /*yield*/, form.verifyInstance.singleAsyncCheck(field.value, field, {
                                extraMeta: {
                                    form: form,
                                },
                            })];
                    case 1:
                        rej = _a.sent();
                        clearTimeout(delayLoadingTimer);
                        nextError = rej ? rej[0].message : '';
                        isSame = field.error === nextError;
                        field.error = nextError;
                        field.validating = false;
                        if (!isSame && !ctx.fieldFailEmitLock && rej) {
                            form.failEvent.emit([field], false);
                        }
                        return [2 /*return*/, field.error ? field : null];
                }
            });
        }); };
        Object.defineProperties(field, {
            defaultValue: {
                configurable: true,
                enumerable: true,
                get: function () {
                    return getDefaultValue();
                },
            },
            key: {
                configurable: true,
                enumerable: true,
                get: function () {
                    return stringifyNamePath(name);
                },
            },
            touched: {
                configurable: true,
                enumerable: true,
                get: function () {
                    return touched;
                },
                set: function (n) {
                    if (touched === n)
                        return;
                    touched = n;
                    form.tickUpdate(field);
                },
            },
            value: {
                configurable: true,
                enumerable: true,
                get: function () {
                    return value;
                },
                set: function (n) {
                    if (value === n)
                        return;
                    value = n;
                    if (!ctx.touchLock)
                        field.touched = true;
                    form.changeEvent.emit([field]);
                },
            },
            validating: {
                configurable: true,
                enumerable: true,
                get: function () {
                    return validating;
                },
                set: function (n) {
                    if (validating === n)
                        return;
                    validating = n;
                    form.tickUpdate(field);
                },
            },
            error: {
                configurable: true,
                enumerable: true,
                get: function () {
                    return error;
                },
                set: function (err) {
                    if (error === err)
                        return;
                    error = err;
                    form.tickUpdate(field);
                },
            },
            valid: {
                configurable: true,
                enumerable: true,
                get: function () {
                    return valid;
                },
                set: function (v) {
                    if (valid === v)
                        return;
                    valid = v;
                    form.tickUpdate(field);
                },
            },
            changed: {
                configurable: true,
                enumerable: true,
                get: function () {
                    if (field.defaultValue === field.value)
                        return false;
                    if (isTrueEmpty(field.defaultValue) && isTrueEmpty(field.value))
                        return false;
                    try {
                        // 这里使用stringify是基于以下考量:
                        // - 能适应绝大多数情况的对比
                        // - 对于表单值这样的小型转换, 性能足够优秀
                        // - 相对于浅对比, 这种对比方式能在更多场景下获得更好的效果, 否则会经常出现引用地址变更导致changed与预期不符
                        return JSON.stringify(field.defaultValue) !== JSON.stringify(field.value);
                    }
                    catch (e) {
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

function listFactory(form, ctx) {
    var createList = function (fConf) {
        var existField = form.getField(fConf.name);
        if (existField)
            return existField;
        var field = form.createField(__assign(__assign({}, fConf), { separate: true }));
        // value不是数组时将其强制转换为数组
        if (!isArray(field.value)) {
            ctx.touchLock = true;
            field.value = [];
            ctx.touchLock = false;
        }
        var vList = Object.assign(field, {
            list: [],
        });
        // 备份需要为自动fill的字段填充的值
        var fillValueMap = {};
        setPrivateKey(vList, privateKeyDefaultField, []);
        vList.getFlatChildren = function (validIsTrue) {
            var ls = [];
            if (validIsTrue && !vList.valid)
                return [];
            vList.list.forEach(function (item) {
                item.list.forEach(function (f) {
                    if (validIsTrue) {
                        f.valid && ls.push(f);
                    }
                    else {
                        ls.push(f);
                    }
                });
            });
            return ls;
        };
        /** 获取指定key的listItem */
        function getListItemByKey(key) {
            var ind = vList.list.findIndex(function (item) { return item.key === key; });
            return [vList.list[ind] || null, ind];
        }
        /** children顺序变更后使用, 同步所有item的index为其所在位置的索引 */
        function syncItemNameIndex() {
            var indInd = ensureArray(vList.name).length;
            vList.list.forEach(function (item, index) {
                item.list.forEach(function (it) {
                    it.name[indInd] = String(index);
                });
            });
        }
        /** swap&move生成器 */
        function swapAndMoveHelper(ind1, ind2, fn) {
            var updateList = [vList];
            var fCurrent = vList.list[ind1];
            var tCurrent = vList.list[ind2];
            if (!fCurrent || !tCurrent)
                return;
            updateList.push.apply(updateList, __spreadArray(__spreadArray([], fCurrent.list), tCurrent.list));
            fn(vList.list, ind1, ind2);
            syncItemNameIndex();
            form.tickUpdate.apply(form, updateList);
            form.tickChange(vList);
        }
        vList.withName = function (index, name) {
            if (name === void 0) { name = []; }
            return __spreadArray(__spreadArray(__spreadArray([], ensureArray(vList.name)), [String(index)]), ensureArray(name));
        };
        vList.add = function (_a) {
            var _b;
            var _c = _a === void 0 ? {} : _a, _d = _c.fields, fields = _d === void 0 ? [] : _d, key = _c.key, isDefault = _c.isDefault, fillValue = _c.fillValue;
            var updateList = [vList];
            // 为所有子项设置私有字段标示
            fields.forEach(function (item) {
                setPrivateKey(item, privateKeyParent, vList);
            });
            var _key = key || createRandString();
            // 当前操作的item记录
            var _current = null;
            // 如果传入了fillValue则覆盖当前的
            if (fillValue !== undefined) {
                fillValueMap[_key] = fillValue;
            }
            // 未传入key时先后新增
            if (!key) {
                var lItem = {
                    key: _key,
                    list: uniqueFields(fields),
                };
                if (isDefault) {
                    getPrivateKey(vList, privateKeyDefaultField)[vList.list.length] = lItem;
                }
                vList.list.push(lItem);
                updateList.push.apply(updateList, fields);
                _current = lItem;
            }
            else {
                // 包含key, 新增到key的位置并去重
                var current = getListItemByKey(_key)[0];
                if (current) {
                    current.list = uniqueFields(current.list, fields);
                    updateList.push.apply(updateList, current.list);
                    _current = current;
                }
            }
            var index = vList.list.findIndex(function (item) { return item === _current; });
            // 为所有新增的field设置默认值或fillValues
            if (_current) {
                var fillData_1 = fillValueMap[_key];
                // 用于fillValue取值的对象
                var vData_1 = {};
                if (fillData_1 !== undefined) {
                    setNamePathValue(vData_1, vList.withName(index), fillData_1);
                }
                _current.list.forEach(function (item) {
                    ctx.touchLock = true;
                    if (fillData_1 !== undefined) {
                        item.value = getNamePathValue(vData_1, item.name);
                    }
                    else if (item.value === undefined) {
                        item.value = item.defaultValue;
                    }
                    ctx.touchLock = false;
                });
            }
            // 未传入field时, 通知onFillField
            if (!fields.length) {
                (_b = fConf.onFillField) === null || _b === void 0 ? void 0 : _b.call(fConf, vList, _key, index);
            }
            form.tickUpdate.apply(form, updateList);
            form.tickChange(vList);
        };
        vList.remove = function (index) {
            var updateList = [vList];
            var current = vList.list[index];
            if (current) {
                updateList.push.apply(updateList, current.list);
                vList.list.splice(index, 1);
                syncItemNameIndex();
                form.tickUpdate.apply(form, updateList);
                form.tickChange(vList);
            }
        };
        vList.move = function (key1, key2) { return swapAndMoveHelper(key1, key2, move); };
        vList.swap = function (key1, key2) { return swapAndMoveHelper(key1, key2, swap); };
        Object.defineProperty(vList, 'value', {
            configurable: true,
            enumerable: true,
            // 获取值, 需要获取所有子级的值并组合返回
            get: function () {
                var obj = {};
                vList.getFlatChildren(true).forEach(function (item) {
                    setNamePathValue(obj, item.name, item.value);
                });
                return getNamePathValue(obj, vList.name);
            },
            // 设置值, 需要设置所有子级的值
            set: function (val) {
                var _a;
                if (!isArray(val))
                    return;
                var len = vList.list.length;
                var diff = val.length - len;
                if (diff < 0) {
                    // val长度小于当期记录数, 删除list中多出来的记录
                    var rLs = vList.list.splice(val.length, Math.abs(diff));
                    var changes = rLs.reduce(function (p, i) {
                        p.push.apply(p, i.list);
                        return p;
                    }, []);
                    if (changes.length)
                        form.tickUpdate.apply(form, changes);
                }
                else if (diff > 0) {
                    // val大于当前记录数, 将缺少的记录添加为空白记录并触发onFillField
                    for (var i = 0; i < diff; i++) {
                        var curIndex = len + i;
                        vList.add({
                            fillValue: val[curIndex],
                        });
                        var key = vList.list[curIndex].key;
                        // 自动增加了记录, 对外通知
                        (_a = fConf.onFillField) === null || _a === void 0 ? void 0 : _a.call(fConf, vList, key, curIndex);
                    }
                }
                vList.getFlatChildren().forEach(function (item) {
                    var obj = {};
                    setNamePathValue(obj, vList.name, val);
                    item.value = getNamePathValue(obj, item.name);
                });
                // 将值记录到fillValue中, 用于处理field挂载在value赋值之后的情况
                vList.list.forEach(function (item, index) {
                    fillValueMap[item.key] = val[index];
                });
                form.tickChange(vList);
            },
        });
        // 包含默认值时将列表扩展到对应长度, 列表字段无法确定所以交给用户根据list长度自动补全
        if (isArray(vList.defaultValue) && vList.defaultValue.length) {
            vList.defaultValue.forEach(function () {
                return vList.add({
                    isDefault: true,
                });
            });
            fConf.onFillField &&
                vList.list.forEach(function (item, index) { var _a; return (_a = fConf.onFillField) === null || _a === void 0 ? void 0 : _a.call(fConf, vList, item.key, index); });
        }
        if (!fConf.separate) {
            ctx.list.push(vList);
        }
        return vList;
    };
    return createList;
}

function createVForm(config) {
    if (config === void 0) { config = {}; }
    var vConfig = __assign(__assign({}, defaultFormConfig), config);
    var _a = formFactory(vConfig), form = _a[0], ctx = _a[1];
    form.createField = fieldFactory(form, ctx);
    form.createList = listFactory(form, ctx);
    return form;
}

export { createVForm };
