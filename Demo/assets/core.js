(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
    return;
  }
  root.demoCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeText(value) {
    return String(value == null ? '' : value).trim();
  }

  function normalizeKey(value) {
    return normalizeText(value).toUpperCase();
  }

  function generateId(prefix) {
    return prefix + '_' + Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  function getCollection(state, name) {
    if (!state || !Array.isArray(state[name])) {
      throw new Error('Invalid collection: ' + name);
    }
    return state[name];
  }

  function authenticate(state, employeeNo, password) {
    var account = normalizeKey(employeeNo);
    var inputPassword = normalizeText(password);
    var user = getCollection(state, 'users').find(function (item) {
      return normalizeKey(item.employeeNo) === account;
    });

    if (!account || !inputPassword) {
      return { ok: false, error: '请输入工号和密码' };
    }
    if (!user || user.password !== inputPassword) {
      return { ok: false, error: '工号或密码错误' };
    }
    if (user.status !== 'ENABLED') {
      return { ok: false, error: '当前用户已停用' };
    }
    return { ok: true, user: deepClone(user) };
  }

  function changePassword(state, userId, oldPassword, newPassword, confirmPassword) {
    var user = getCollection(state, 'users').find(function (item) {
      return item.id === userId;
    });
    if (!user) {
      return { ok: false, error: '用户不存在' };
    }
    if (user.password !== normalizeText(oldPassword)) {
      return { ok: false, error: '原密码不正确。' };
    }
    if (normalizeText(newPassword).length < 6) {
      return { ok: false, error: '新密码至少 6 位。' };
    }
    if (normalizeText(newPassword) !== normalizeText(confirmPassword)) {
      return { ok: false, error: '两次输入的新密码不一致。' };
    }
    user.password = normalizeText(newPassword);
    return { ok: true, user: deepClone(user) };
  }

  function validateUnique(list, key, value, currentId, label) {
    var conflict = list.find(function (item) {
      return normalizeKey(item[key]) === normalizeKey(value) && item.id !== currentId;
    });
    if (conflict) {
      return label + '已存在。';
    }
    return '';
  }

  function upsertUser(state, draft) {
    var users = getCollection(state, 'users');
    var payload = deepClone(draft);
    payload.employeeNo = normalizeKey(payload.employeeNo);
    payload.name = normalizeText(payload.name);
    payload.password = normalizeText(payload.password || '123456');
    payload.departmentId = normalizeText(payload.departmentId);
    payload.leaderId = normalizeText(payload.leaderId);
    payload.status = payload.status || 'ENABLED';
    payload.roleIds = Array.isArray(payload.roleIds) ? payload.roleIds.slice() : [];

    if (!payload.employeeNo) {
      return { ok: false, error: '用户工号不能为空。' };
    }
    if (!payload.name) {
      return { ok: false, error: '用户姓名不能为空。' };
    }
    if (!payload.departmentId) {
      return { ok: false, error: '所属部门不能为空。' };
    }
    var uniqueError = validateUnique(users, 'employeeNo', payload.employeeNo, payload.id, '工号');
    if (uniqueError) {
      return { ok: false, error: uniqueError };
    }

    var existing = users.find(function (item) {
      return item.id === payload.id;
    });
    if (existing) {
      Object.assign(existing, payload);
      return { ok: true, entity: deepClone(existing) };
    }

    payload.id = payload.id || payload.employeeNo || generateId('USER');
    users.push(payload);
    return { ok: true, entity: deepClone(payload) };
  }

  function upsertDepartment(state, draft) {
    var departments = getCollection(state, 'departments');
    var payload = deepClone(draft);
    payload.code = normalizeKey(payload.code);
    payload.name = normalizeText(payload.name);
    payload.status = payload.status || 'ENABLED';

    if (!payload.code) {
      return { ok: false, error: '部门编码不能为空。' };
    }
    if (!payload.name) {
      return { ok: false, error: '部门名称不能为空。' };
    }
    var uniqueError = validateUnique(departments, 'code', payload.code, payload.id, '部门编码');
    if (uniqueError) {
      return { ok: false, error: uniqueError };
    }

    var existing = departments.find(function (item) {
      return item.id === payload.id;
    });
    if (existing) {
      Object.assign(existing, payload);
      return { ok: true, entity: deepClone(existing) };
    }

    payload.id = payload.id || generateId('DEPT');
    departments.push(payload);
    return { ok: true, entity: deepClone(payload) };
  }

  function upsertRole(state, draft) {
    var roles = getCollection(state, 'roles');
    var users = getCollection(state, 'users');
    var payload = deepClone(draft);
    payload.code = normalizeKey(payload.code);
    payload.name = normalizeText(payload.name);
    payload.status = payload.status || 'ENABLED';
    payload.userIds = Array.isArray(payload.userIds) ? payload.userIds.slice() : [];

    if (!payload.code) {
      return { ok: false, error: '角色编码不能为空。' };
    }
    if (!payload.name) {
      return { ok: false, error: '角色名称不能为空。' };
    }
    var uniqueError = validateUnique(roles, 'code', payload.code, payload.id, '角色编码');
    if (uniqueError) {
      return { ok: false, error: uniqueError };
    }

    var existing = roles.find(function (item) {
      return item.id === payload.id;
    });
    var roleId = existing ? existing.id : (payload.id || generateId('ROLE'));
    var roleEntity = existing || { id: roleId };
    Object.assign(roleEntity, {
      id: roleId,
      code: payload.code,
      name: payload.name,
      status: payload.status
    });
    if (!existing) {
      roles.push(roleEntity);
    }

    users.forEach(function (user) {
      var hasRole = user.roleIds.indexOf(roleId) >= 0;
      var shouldHaveRole = payload.userIds.indexOf(user.id) >= 0;
      if (shouldHaveRole && !hasRole) {
        user.roleIds.push(roleId);
      }
      if (!shouldHaveRole && hasRole) {
        user.roleIds = user.roleIds.filter(function (item) {
          return item !== roleId;
        });
      }
    });

    return { ok: true, entity: deepClone(roleEntity) };
  }

  function upsertDictionary(state, draft) {
    var dictionaries = getCollection(state, 'dictionaries');
    var payload = deepClone(draft);
    payload.typeCode = normalizeKey(payload.typeCode);
    payload.typeName = normalizeText(payload.typeName);
    payload.status = payload.status || 'ENABLED';
    payload.items = Array.isArray(payload.items) ? payload.items.map(function (item, index) {
      return {
        code: normalizeKey(item.code),
        name: normalizeText(item.name),
        orderNo: Number(item.orderNo || index + 1),
        status: item.status || 'ENABLED'
      };
    }) : [];

    if (!payload.typeCode) {
      return { ok: false, error: '字典类型编码不能为空。' };
    }
    if (!payload.typeName) {
      return { ok: false, error: '字典类型名称不能为空。' };
    }
    if (!payload.items.length) {
      return { ok: false, error: '至少需要一个字典项。' };
    }
    var duplicateItem = {};
    var hasDuplicateItem = payload.items.some(function (item) {
      if (!item.code || !item.name) {
        duplicateItem.error = '字典项编码和名称不能为空。';
        return true;
      }
      if (duplicateItem[item.code]) {
        duplicateItem.error = '字典项编码不能重复。';
        return true;
      }
      duplicateItem[item.code] = true;
      return false;
    });
    if (hasDuplicateItem) {
      return { ok: false, error: duplicateItem.error };
    }
    var uniqueError = validateUnique(dictionaries, 'typeCode', payload.typeCode, payload.id, '字典类型编码');
    if (uniqueError) {
      return { ok: false, error: uniqueError };
    }

    var existing = dictionaries.find(function (item) {
      return item.id === payload.id;
    });
    if (existing) {
      Object.assign(existing, payload);
      return { ok: true, entity: deepClone(existing) };
    }

    payload.id = payload.id || generateId('DICT');
    dictionaries.push(payload);
    return { ok: true, entity: deepClone(payload) };
  }

  function upsertMenu(state, draft) {
    var menus = getCollection(state, 'menus');
    var payload = deepClone(draft);
    payload.name = normalizeText(payload.name);
    payload.path = normalizeText(payload.path);
    payload.orderNo = Number(payload.orderNo || 1);
    payload.roleIds = Array.isArray(payload.roleIds) ? payload.roleIds.slice() : [];

    if (!payload.name) {
      return { ok: false, error: '菜单名称不能为空。' };
    }
    if (!payload.path) {
      return { ok: false, error: '菜单路径不能为空。' };
    }
    var uniqueError = validateUnique(menus, 'path', payload.path, payload.id, '菜单路径');
    if (uniqueError) {
      return { ok: false, error: uniqueError };
    }

    var existing = menus.find(function (item) {
      return item.id === payload.id;
    });
    if (existing) {
      Object.assign(existing, payload);
      return { ok: true, entity: deepClone(existing) };
    }

    payload.id = payload.id || generateId('MENU');
    menus.push(payload);
    return { ok: true, entity: deepClone(payload) };
  }

  function upsertTemplate(state, draft) {
    var templates = getCollection(state, 'templates');
    var payload = deepClone(draft);
    payload.code = normalizeKey(payload.code);
    payload.name = normalizeText(payload.name);
    payload.description = normalizeText(payload.description);
    payload.status = payload.status || 'ENABLED';
    payload.reporterRoleIds = Array.isArray(payload.reporterRoleIds) ? payload.reporterRoleIds.slice() : [];
    payload.viewerRoleIds = Array.isArray(payload.viewerRoleIds) ? payload.viewerRoleIds.slice() : [];
    payload.departmentScopeIds = Array.isArray(payload.departmentScopeIds) ? payload.departmentScopeIds.slice() : [];
    payload.objects = Array.isArray(payload.objects) ? payload.objects.map(function (objectItem, objectIndex) {
      return {
        id: objectItem.id || generateId('OBJ'),
        code: normalizeKey(objectItem.code),
        name: normalizeText(objectItem.name),
        orderNo: Number(objectItem.orderNo || objectIndex + 1),
        description: normalizeText(objectItem.description),
        required: !!objectItem.required,
        fields: Array.isArray(objectItem.fields) ? objectItem.fields.map(function (fieldItem, fieldIndex) {
          return {
            code: normalizeKey(fieldItem.code),
            name: normalizeText(fieldItem.name),
            dataType: fieldItem.dataType || 'STRING',
            controlType: fieldItem.controlType || 'TEXT',
            required: !!fieldItem.required,
            defaultValue: normalizeText(fieldItem.defaultValue),
            dictTypeCode: normalizeKey(fieldItem.dictTypeCode),
            orderNo: Number(fieldItem.orderNo || fieldIndex + 1)
          };
        }) : []
      };
    }) : [];

    if (!payload.name) {
      return { ok: false, error: '模板名称不能为空。' };
    }
    if (!payload.code) {
      return { ok: false, error: '模板编码不能为空。' };
    }
    if (!payload.reporterRoleIds.length) {
      return { ok: false, error: '至少需要配置一个填报角色。' };
    }
    if (!payload.objects.length) {
      return { ok: false, error: '至少需要一个数据对象。' };
    }
    for (var i = 0; i < payload.objects.length; i += 1) {
      var objectItem = payload.objects[i];
      if (!objectItem.name || !objectItem.code) {
        return { ok: false, error: '对象名称和对象编码不能为空。' };
      }
      if (!objectItem.fields.length) {
        return { ok: false, error: '每个对象至少需要一个字段。' };
      }
      for (var j = 0; j < objectItem.fields.length; j += 1) {
        var fieldItem = objectItem.fields[j];
        if (!fieldItem.name || !fieldItem.code) {
          return { ok: false, error: '字段名称和字段编码不能为空。' };
        }
      }
    }
    var uniqueError = validateUnique(templates, 'code', payload.code, payload.id, '模板编码');
    if (uniqueError) {
      return { ok: false, error: uniqueError };
    }

    var existing = templates.find(function (item) {
      return item.id === payload.id;
    });
    if (existing) {
      Object.assign(existing, payload);
      return { ok: true, entity: deepClone(existing) };
    }

    payload.id = payload.id || generateId('TPL');
    payload.version = Number(payload.version || 1);
    templates.push(payload);
    return { ok: true, entity: deepClone(payload) };
  }

  function toggleEntityStatus(state, collectionName, entityId) {
    var entity = getCollection(state, collectionName).find(function (item) {
      return item.id === entityId;
    });
    if (!entity) {
      return { ok: false, error: '目标数据不存在。' };
    }
    entity.status = entity.status === 'ENABLED' ? 'DISABLED' : 'ENABLED';
    return { ok: true, entity: deepClone(entity) };
  }

  function sortMenus(menus) {
    return menus.slice().sort(function (a, b) {
      return Number(a.orderNo || 0) - Number(b.orderNo || 0);
    });
  }

  return {
    deepClone: deepClone,
    authenticate: authenticate,
    changePassword: changePassword,
    upsertUser: upsertUser,
    upsertDepartment: upsertDepartment,
    upsertRole: upsertRole,
    upsertDictionary: upsertDictionary,
    upsertMenu: upsertMenu,
    upsertTemplate: upsertTemplate,
    toggleEntityStatus: toggleEntityStatus,
    sortMenus: sortMenus,
    normalizeKey: normalizeKey
  };
});
