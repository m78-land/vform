import { __awaiter, __generator, __spreadArray, __assign } from 'tslib';
import cloneDeep from 'lodash/cloneDeep';
import { createVerify } from '@m78/verify';
import { createEvent, stringifyNamePath, setNamePathValue, getNamePathValue, isNumber, isTrueEmpty, isArray, createRandString, ensureArray, move, swap } from '@lxjx/utils';

var defaultFormConfig = {
    defaultValue: {},
    verifyFirst: false,
};
/** 检测一个field like是否为 listField */
function isListField(f) {
    return 'list' in f;
}
/** 设置field私有属性, 用于判断field是否属于某个list */
function setPrivateParent(field, parent) {
    field.__parent = parent;
}
function getPrivateParent(field) {
    return field.__parent || null;
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
        tickUpdate: tickUpdate,
        tickChange: tickChange,
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
        var parent = getPrivateParent(cur);
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
                var parent_1 = getPrivateParent(field);
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
                field.list = field.list
                    .filter(function (item) { return isNumber(item.defaultIndex); })
                    .sort(function (a, b) { return a.defaultIndex - b.defaultIndex; });
                // 原地交换, 主要目的是更新name中的index
                if (field.list.length !== 0) {
                    field.swap(0, 0);
                }
            }
            field.value = cloneDeep(field.defaultValue);
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
                    ctx.tickUpdate(field);
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
                    ctx.tickUpdate(field);
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
                    ctx.tickUpdate(field);
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
                    ctx.tickUpdate(field);
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
        var field = form.createField(__assign(__assign({}, fConf), { separate: true }));
        if (!isArray(field.value)) {
            ctx.touchLock = true;
            field.value = [];
            ctx.touchLock = false;
        }
        var vList = Object.assign(field, {
            list: [],
        });
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
            ctx.tickUpdate.apply(ctx, updateList);
            ctx.tickChange(vList);
        }
        vList.add = function (fields, key, isDefault) {
            var updateList = [vList];
            // 设置私有字段标示
            fields.forEach(function (item) {
                setPrivateParent(item, vList);
            });
            if (!key) {
                vList.list.push({
                    key: createRandString(),
                    list: uniqueFields(fields),
                    defaultIndex: isDefault ? vList.list.length : undefined,
                });
                updateList.push.apply(updateList, fields);
            }
            else {
                var current = getListItemByKey(key)[0];
                if (current) {
                    current.list = uniqueFields(current.list, fields);
                    updateList.push.apply(updateList, current.list);
                }
            }
            // 将所有新增字段的值设置为默认值?
            fields.forEach(function (item) {
                ctx.touchLock = true;
                if (item.value === undefined) {
                    item.value = item.defaultValue;
                }
                ctx.touchLock = false;
            });
            ctx.tickUpdate.apply(ctx, updateList);
            ctx.tickChange(vList);
        };
        vList.remove = function (index) {
            var updateList = [vList];
            var current = vList.list[index];
            if (current) {
                updateList.push.apply(updateList, current.list);
                vList.list.splice(index, 1);
                syncItemNameIndex();
                ctx.tickUpdate.apply(ctx, updateList);
                ctx.tickChange(vList);
            }
        };
        vList.move = function (key1, key2) { return swapAndMoveHelper(key1, key2, move); };
        vList.swap = function (key1, key2) { return swapAndMoveHelper(key1, key2, swap); };
        vList.withName = function (index, name) {
            return __spreadArray(__spreadArray(__spreadArray([], ensureArray(vList.name)), [String(index)]), ensureArray(name));
        };
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
                vList.getFlatChildren().forEach(function (item) {
                    var obj = {};
                    setNamePathValue(obj, vList.name, val);
                    item.value = getNamePathValue(obj, item.name);
                });
            },
        });
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
