(function () {
  var appRoot = document.getElementById('app');
  var modalRoot = document.getElementById('modalRoot');
  var toastRoot = document.getElementById('toastRoot');
  var core = window.demoCore;
  var state = window.demoStore.getState();
  var session = window.demoStore.getSession();
  var ui = {
    page: normalizePage(window.location.hash.replace('#', '') || 'home'),
    tabs: [],
    activeTabId: '',
    baseTab: 'users',
    filters: {
      pendingFill: { name: '', start: '', end: '' },
      pendingReview: { name: '', start: '', end: '' },
      myReports: { name: '', start: '', end: '' },
      reportView: { name: '', departmentId: '', start: '', end: '' },
      templates: { name: '', status: '' }
    },
    modal: null,
    picker: null,
    toasts: []
  };

  if (!session || !session.currentUserId || !getCurrentUser()) {
    redirectToLogin();
    return;
  }

  ensurePageAccess();
  bindEvents();
  render();

  function bindEvents() {
    window.addEventListener('hashchange', function () {
      ui.page = normalizePage(window.location.hash.replace('#', '') || 'home');
      ensurePageAccess();
      openMenuTab(ui.page);
      render();
    });

    document.addEventListener('click', function (event) {
      var trigger = event.target.closest('[data-action]');
      if (!trigger) {
        return;
      }
      handleAction(trigger);
    });

    document.addEventListener('submit', function (event) {
      var form = event.target;
      if (!form.matches('[data-form]')) {
        return;
      }
      event.preventDefault();
      handleFormSubmit(form);
    });

    document.addEventListener('change', function (event) {
      var target = event.target;
      if (target.id === 'demoDateSwitch') {
        state.meta.demoDate = target.value;
        persist();
        render();
        pushToast('演示业务日期已切换为 ' + state.meta.demoDate, 'success');
        return;
      }
      if (target.id === 'userSwitch') {
        switchUser(target.value);
        return;
      }
      if (target.hasAttribute('data-picker-item')) {
        toggleArrayValue(ui.picker.selectedIds, target.getAttribute('data-picker-item'), target.checked);
        return;
      }
      syncModalInput(target);
    });

    document.addEventListener('input', function (event) {
      syncModalInput(event.target);
    });
  }

  function handleAction(trigger) {
    var action = trigger.getAttribute('data-action');
    var id = trigger.getAttribute('data-id') || '';
    var extra = trigger.getAttribute('data-extra') || '';

    switch (action) {
      case 'navigate':
        openMenuTab(id);
        window.location.hash = '#' + id;
        break;
      case 'activate-tab':
        activateTab(id);
        break;
      case 'close-tab':
        closeTab(id);
        break;
      case 'logout':
        window.demoStore.clearSession();
        redirectToLogin();
        break;
      case 'reset-demo':
        if (window.confirm('确定重置本地演示数据吗？')) {
          window.demoStore.resetState();
          redirectToLogin();
        }
        break;
      case 'close-modal':
        ui.modal = null;
        ui.picker = null;
        renderModal();
        break;
      case 'open-create-report':
        openReportEditor(id, '');
        break;
      case 'open-edit-report':
        openReportEditor('', id);
        break;
      case 'open-view-report':
        openReportView(id, false);
        break;
      case 'open-review-report':
        openReportView(id, true);
        break;
      case 'report-add-row':
        addReportRow(id);
        break;
      case 'report-remove-row':
        removeReportRow(id, extra);
        break;
      case 'restore-last-week':
        restoreLastWeek();
        break;
      case 'save-report-draft':
        saveReport('DRAFT');
        break;
      case 'submit-report':
        saveReport('PENDING');
        break;
      case 'approve-report':
        reviewReport('APPROVED');
        break;
      case 'reject-report':
        reviewReport('RETURNED');
        break;
      case 'base-tab':
        ui.baseTab = id;
        render();
        break;
      case 'open-template-editor':
        openTemplateEditor(id || '');
        break;
      case 'template-add-object':
        addTemplateObject();
        break;
      case 'template-remove-object':
        removeTemplateObject(id);
        break;
      case 'template-add-field':
        addTemplateField(id);
        break;
      case 'template-remove-field':
        removeTemplateField(id, extra);
        break;
      case 'save-template':
        saveTemplate();
        break;
      case 'toggle-template-status':
        toggleEntityStatus('templates', id);
        break;
      case 'open-config-editor':
        openConfigEditor(id, extra || '');
        break;
      case 'save-config':
        saveConfigEditor();
        break;
      case 'toggle-entity-status':
        toggleEntityStatus(id, extra);
        break;
      case 'dict-add-item':
        addDictionaryItem();
        break;
      case 'dict-remove-item':
        removeDictionaryItem(id);
        break;
      case 'quick-login':
        switchUser(id);
        break;
      case 'open-picker':
        openPicker(id, extra);
        break;
      case 'close-picker':
        ui.picker = null;
        renderModal();
        break;
      case 'picker-confirm':
        confirmPicker();
        break;
      default:
        break;
    }
  }

  function handleFormSubmit(form) {
    var formName = form.getAttribute('data-form');
    if (formName === 'change-password') {
      handlePasswordChange(form);
      return;
    }
    var values = readFilterForm(form);
    if (formName === 'filter-pending-fill') {
      ui.filters.pendingFill = values;
    } else if (formName === 'filter-pending-review') {
      ui.filters.pendingReview = values;
    } else if (formName === 'filter-my-reports') {
      ui.filters.myReports = values;
    } else if (formName === 'filter-report-view') {
      ui.filters.reportView = values;
    } else if (formName === 'filter-templates') {
      ui.filters.templates = values;
    }
    render();
  }

  function render() {
    var currentUser = getCurrentUser();
    var visibleMenus = getVisibleMenus(currentUser);
    syncTabsWithMenus(visibleMenus);
    ui.page = getCurrentNavPath();

    appRoot.innerHTML =
      '<div class="app-layout">' +
      renderSidebar(currentUser, visibleMenus) +
      '<div class="main-shell">' +
      renderTopbar(currentUser) +
      renderTabbar(visibleMenus) +
      '<main class="content">' +
      renderPage(currentUser) +
      '</main>' +
      '</div>' +
      '</div>';

    renderModal();
    renderToasts();
  }

  function renderSidebar(currentUser, menus) {
    var groups = [
      { title: '周报填报和查看', paths: ['home', 'pending-fill', 'pending-review', 'my-reports', 'report-view'] },
      { title: '基础配置', paths: ['template-management', 'users', 'departments', 'dictionaries', 'roles', 'menus', 'profile'] }
    ];
    return (
      '<aside class="sidebar">' +
      '<div class="sidebar-brand">' +
      '<h1>周报管理</h1>' +
      '<p>' + escapeHtml(state.meta.companyName) + '</p>' +
      '</div>' +
      '<div class="menu-list">' +
      groups.map(function (group) {
        var children = group.paths.map(function (path) {
          return menus.find(function (menu) {
            return menu.path === path;
          });
        }).filter(Boolean);
        if (!children.length) {
          return '';
        }
        return '<section class="outlook-group"><div class="outlook-header">' + escapeHtml(group.title) + '</div><div class="outlook-body">' + children.map(function (menu) {
          var count = getMenuCount(menu.path, currentUser);
          return '<button class="menu-item ' + (getCurrentNavPath() === menu.path ? 'active' : '') + '" data-action="navigate" data-id="' + escapeHtml(menu.path) + '"><span>' + escapeHtml(menu.name) + '</span>' + (count ? '<span class="menu-badge">' + count + '</span>' : '') + '</button>';
        }).join('') + '</div></section>';
      }).join('') +
      '</div>' +
      '<div class="sidebar-footer">' +
      '<div>Demo 版本：' + escapeHtml(state.meta.version) + '</div>' +
      '<div style="margin-top: 6px;">当前日期规则以页面右上角演示日期为准</div>' +
      '</div>' +
      '</aside>'
    );
  }

  function renderTopbar(currentUser) {
    var activeTab = getActiveTab();
    return (
      '<header class="topbar">' +
      '<div class="topbar-meta">' +
      '<div>' +
      '<div class="topbar-title">' + escapeHtml(activeTab ? activeTab.title : getPageTitle(ui.page)) + '</div>' +
      '<div class="topbar-subtitle">当前登录：' + escapeHtml(currentUser.name) + ' / ' + escapeHtml(currentUser.employeeNo) + '</div>' +
      '</div>' +
      '</div>' +
      '<div class="topbar-actions">' +
      '<label class="topbar-card compact">演示日期' +
      '<select id="demoDateSwitch">' +
      '<option value="2026-03-18"' + selectedAttr(state.meta.demoDate === '2026-03-18') + '>2026-03-18 周三（可暂存草稿）</option>' +
      '<option value="2026-03-22"' + selectedAttr(state.meta.demoDate === '2026-03-22') + '>2026-03-22 周日（可正式提交）</option>' +
      '</select>' +
      '</label>' +
      '<label class="topbar-card compact">切换账号' +
      '<select id="userSwitch">' +
      state.users.filter(function (item) {
        return item.status === 'ENABLED';
      }).map(function (item) {
        return '<option value="' + escapeHtml(item.id) + '"' + selectedAttr(item.id === currentUser.id) + '>' + escapeHtml(item.name + ' / ' + item.employeeNo) + '</option>';
      }).join('') +
      '</select>' +
      '</label>' +
      '<button class="btn btn-light" data-action="reset-demo">重置数据</button>' +
      '<button class="btn btn-light" data-action="logout">退出登录</button>' +
      '</div>' +
      '</header>'
    );
  }

  function renderTabbar(menus) {
    return '<div class="tabbar">' + ui.tabs.map(function (tab) {
      var menu = tab.type === 'menu' ? menus.find(function (item) { return item.path === tab.path; }) : true;
      if (!menu) { return ''; }
      var closable = !(tab.type === 'menu' && tab.path === menus[0].path);
      return '<button class="work-tab ' + (ui.activeTabId === tab.id ? 'active' : '') + '" data-action="activate-tab" data-id="' + escapeHtml(tab.id) + '"><span>' + escapeHtml(tab.title) + '</span>' + (closable ? '<span class="work-tab-close" data-action="close-tab" data-id="' + escapeHtml(tab.id) + '">x</span>' : '') + '</button>';
    }).join('') + '</div>';
  }

  function renderPage(currentUser) {
    var activeTab = getActiveTab();
    if (activeTab && activeTab.type === 'report-editor') {
      return renderReportEditorWorkspace(activeTab);
    }
    if (activeTab && activeTab.type === 'report-view') {
      return renderReportViewWorkspace(activeTab);
    }
    switch (ui.page) {
      case 'home':
        return renderHomePage(currentUser);
      case 'pending-fill':
        return renderPendingFillPage(currentUser);
      case 'pending-review':
        return renderPendingReviewPage(currentUser);
      case 'my-reports':
        return renderMyReportsPage(currentUser);
      case 'report-view':
        return renderReportViewPage(currentUser);
      case 'template-management':
        return renderTemplatePage();
      case 'users':
        return renderUsersPage();
      case 'departments':
        return renderDepartmentsPage();
      case 'dictionaries':
        return renderDictionariesPage();
      case 'roles':
        return renderRolesPage();
      case 'menus':
        return renderMenusPage();
      case 'profile':
        return renderProfilePage(currentUser);
      default:
        return '';
    }
  }

  function renderModal() {
    if (!ui.modal && !ui.picker) {
      modalRoot.innerHTML = '';
      return;
    }
    var overlays = '';
    if (ui.modal) {
      var content = '';
      if (ui.modal.type === 'report-editor') {
        content = renderReportEditorModal();
      } else if (ui.modal.type === 'report-view') {
        content = renderReportViewModal();
      } else if (ui.modal.type === 'template-editor') {
        content = renderTemplateEditorModal();
      } else if (ui.modal.type === 'config-editor') {
        content = renderConfigEditorModal();
      }
      overlays += '<div class="modal-root"><div class="modal ' + (ui.modal.small ? 'small' : '') + '">' + content + '</div></div>';
    }
    if (ui.picker) {
      overlays += renderPickerModal();
    }
    modalRoot.innerHTML = overlays;
  }

  function renderToasts() {
    toastRoot.innerHTML = ui.toasts.map(function (toast) {
      return '<div class="toast toast-' + escapeHtml(toast.type) + '">' + escapeHtml(toast.message) + '</div>';
    }).join('');
  }

  function pushToast(message, type) {
    ui.toasts.push({ id: generateId('TOAST'), message: message, type: type || 'success' });
    if (ui.toasts.length > 4) {
      ui.toasts.shift();
    }
    renderToasts();
    window.setTimeout(function () {
      ui.toasts.shift();
      renderToasts();
    }, 2800);
  }

  function getCurrentUser() { return getUser(session.currentUserId); }
  function getUser(id) { return state.users.find(function (item) { return item.id === id; }); }
  function normalizePage(page) { return page || 'home'; }
  function redirectToLogin() { window.location.href = './login.html'; }

  function renderHomePage(currentUser) {
    return renderComingSoonPage('系统首页', '周报填报和查看相关页面暂不实现，当前阶段仅交付登录和基础配置功能。');
  }

  function renderPendingFillPage(currentUser) {
    return renderComingSoonPage('待我填报', '该菜单后续再实现，本轮不进入周报填报流程。');
  }

  function renderPendingReviewPage(currentUser) {
    return renderComingSoonPage('待我审核', '该菜单后续再实现，本轮不进入周报审核流程。');
  }

  function renderMyReportsPage(currentUser) {
    return renderComingSoonPage('我填报的周报', '该菜单后续再实现，本轮不进入周报历史查询流程。');
  }

  function renderReportViewPage(currentUser) {
    return renderComingSoonPage('周报查看', '该菜单后续再实现，本轮不进入周报查看流程。');
  }

  function renderComingSoonPage(title, desc) {
    return (
      renderPageHead(title, desc) +
      '<section class="card">' +
      '<div class="empty-state">' +
      '<strong style="display:block; margin-bottom: 10px;">当前菜单暂未纳入本轮实现范围</strong>' +
      '<span>本轮仅交付登录能力，以及基础配置下的个人信息、模板管理、用户、部门、字典、角色和菜单维护功能。</span>' +
      '</div>' +
      '</section>'
    );
  }

  function renderTemplatePage() {
    var rows = filterTemplateRows(state.templates, ui.filters.templates);
    return (
      renderPageHead('周报模板管理', '模板由基础信息、填报角色、查看角色、查看部门范围和多个数据对象组成。角色和部门范围通过“文本框 + 按钮挑选”方式多选维护。') +
      renderFilterCard('filter-templates', [
        inputField('模板名称', 'name', ui.filters.templates.name, '请输入模板名称'),
        selectField('状态', 'status', ui.filters.templates.status, [
          { value: '', label: '全部状态' },
          { value: 'ENABLED', label: '启用' },
          { value: 'DISABLED', label: '停用' }
        ])
      ], '<button class="btn btn-primary" type="button" data-action="open-template-editor">新增模板</button>') +
      '<section class="card"><div class="card-title"><h3>模板列表</h3><span class="tag tag-primary">' + rows.length + ' 个模板</span></div>' +
      renderTemplateTable(rows) +
      '</section>'
    );
  }

  function renderBaseConfigPage() {
    return (
      renderPageHead('基础配置', '统一维护用户、部门、数据字典、角色和菜单。权限控制到菜单级，审核人由提交时直属领导自动确定。') +
      '<section class="card"><div class="tabs">' +
      renderTab('users', '用户信息维护') +
      renderTab('departments', '部门信息维护') +
      renderTab('dictionaries', '数据字典维护') +
      renderTab('roles', '角色维护') +
      renderTab('menus', '菜单维护') +
      '</div><div style="margin-top:18px;">' + renderBaseTabContent() + '</div></section>'
    );
  }

  function renderUsersPage() {
    return renderPageHead('用户信息维护', '维护工号、密码、中文姓名、所属部门、直属领导、用户状态和角色信息。') + '<section class="card">' + renderUsersTab() + '</section>';
  }

  function renderDepartmentsPage() {
    return renderPageHead('部门信息维护', '部门不考虑多级结构，统一在此维护部门编码、部门名称和状态。') + '<section class="card">' + renderDepartmentsTab() + '</section>';
  }

  function renderDictionariesPage() {
    return renderPageHead('数据字典维护', '模板中的下拉单选字段通过数据字典类型提供候选值。') + '<section class="card">' + renderDictionariesTab() + '</section>';
  }

  function renderRolesPage() {
    return renderPageHead('角色维护', '维护角色并分配角色下用户，模板填报角色与查看角色均从此处选择。') + '<section class="card">' + renderRolesTab() + '</section>';
  }

  function renderMenusPage() {
    return renderPageHead('菜单维护', '菜单权限控制到菜单级别，左侧 Outlook Bar 的页面访问能力由此配置。') + '<section class="card">' + renderMenusTab() + '</section>';
  }

  function renderProfilePage(currentUser) {
    return (
      renderPageHead('个人信息', '登录用户可查看自己的工号、姓名、部门、角色等基础信息，并在此处修改登录密码。') +
      '<section class="grid grid-2">' +
      '<div class="card"><div class="card-title"><h3>基础信息</h3><span class="tag tag-primary">只读</span></div><div class="desc-list">' +
      renderDescItem('工号', currentUser.employeeNo) +
      renderDescItem('姓名', currentUser.name) +
      renderDescItem('部门', getDepartmentName(currentUser.departmentId)) +
      renderDescItem('直属领导', getUserName(currentUser.leaderId) || '未配置') +
      renderDescItem('用户状态', currentUser.status === 'ENABLED' ? '启用' : '停用') +
      renderDescItem('角色', getRoleNames(currentUser.roleIds).join('、') || '-') +
      '</div></div>' +
      '<div class="card"><div class="card-title"><h3>修改密码</h3><span class="tag tag-warning">模拟交互</span></div>' +
      '<form class="stack" data-form="change-password">' +
      '<div class="field"><label for="oldPassword">原密码</label><input id="oldPassword" name="oldPassword" type="password" /></div>' +
      '<div class="field"><label for="newPassword">新密码</label><input id="newPassword" name="newPassword" type="password" /></div>' +
      '<div class="field"><label for="confirmPassword">确认新密码</label><input id="confirmPassword" name="confirmPassword" type="password" /></div>' +
      '<div class="button-row"><button class="btn btn-primary" type="submit">保存密码</button></div>' +
      '</form></div>' +
      '</section>'
    );
  }

  function renderReportEditorWorkspace(tab) {
    var draft = tab.draft;
    var template = getTemplate(draft.templateId);
    var user = getUser(draft.userId);
    return renderPageHead(tab.title, '当前页面为页签式填报工作区。周中可暂存草稿，周六和周日可正式提交。') +
      '<section class="card"><div class="notice-box">当前演示业务日期：' + escapeHtml(state.meta.demoDate) + '。提交时会自动固化直属领导为审核人。</div></section>' +
      '<section class="card"><div class="desc-list">' +
      renderDescItem('姓名', user.name) +
      renderDescItem('部门', getDepartmentName(user.departmentId)) +
      renderDescItem('报告周期', getWeekLabel(draft.weekStart, draft.weekEnd)) +
      renderDescItem('直属领导', getUserName(user.leaderId) || '未配置') +
      '</div></section>' +
      template.objects.map(function (objectDef, sectionIndex) {
        return renderReportObjectEditor(objectDef, draft.sections[sectionIndex], sectionIndex);
      }).join('') +
      '<section class="card"><div class="button-row"><button class="btn btn-light" data-action="restore-last-week">还原上周周报</button><button class="btn btn-secondary" data-action="save-report-draft">暂存草稿</button><button class="btn btn-primary" data-action="submit-report">正式提交</button></div></section>';
  }

  function renderReportViewWorkspace(tab) {
    var report = getReport(tab.reportId);
    var template = getTemplate(report.templateId);
    var user = getUser(report.userId);
    return renderPageHead(tab.title, tab.reviewMode ? '当前页面为审核工作区，可填写审核意见并完成审核。' : '当前页面为只读查看工作区。') +
      '<section class="card"><div class="desc-list">' +
      renderDescItem('填报人', user.name) +
      renderDescItem('所属部门', getDepartmentName(user.departmentId)) +
      renderDescItem('周报周期', getWeekLabel(report.weekStart, report.weekEnd)) +
      renderDescItem('当前状态', statusText(report.status)) +
      renderDescItem('提交时间', report.submittedAt || '-') +
      renderDescItem('审核人', getUserName(report.reviewerId) || '-') +
      '</div></section>' +
      template.objects.map(function (objectDef) {
        return renderReportObjectReadonly(objectDef, findReportSection(report, objectDef.id));
      }).join('') +
      (tab.reviewMode
        ? '<section class="card"><div class="field"><label for="reviewOpinion">审核意见</label><textarea id="reviewOpinion" class="report-textarea" data-review-opinion="1" placeholder="审核意见可为空">' + escapeHtml(tab.reviewOpinion || '') + '</textarea></div><div class="button-row" style="margin-top:16px;"><button class="btn btn-danger" data-action="reject-report">审核退回</button><button class="btn btn-primary" data-action="approve-report">审核通过</button></div></section>'
        : '<section class="card"><div class="notice-box">审核意见：' + escapeHtml(report.reviewerOpinion || '无') + '</div></section>');
  }

  function renderPageHead(title, desc) {
    return (
      '<section class="page-head"><div><h2>' + escapeHtml(title) + '</h2><p>' + escapeHtml(desc) + '</p></div>' +
      '<div class="button-row"><button class="btn btn-light" data-action="quick-login" data-id="ADMIN001">切到管理员</button><button class="btn btn-light" data-action="quick-login" data-id="E1001">切到填报人</button><button class="btn btn-light" data-action="quick-login" data-id="M2001">切到审核人</button></div>' +
      '</section>'
    );
  }

  function renderMetricCard(label, value, desc, type) {
    var cls = type === 'danger' ? 'tag-danger' : type === 'success' ? 'tag-success' : 'tag-primary';
    return '<article class="card metric-card"><span class="metric-label">' + escapeHtml(label) + '</span><strong class="metric-value">' + escapeHtml(String(value)) + '</strong><div class="split"><span class="metric-desc">' + escapeHtml(desc) + '</span><span class="tag ' + cls + '">' + escapeHtml(label) + '</span></div></article>';
  }

  function renderProgressCard(label, value) {
    return '<article class="card metric-card"><span class="metric-label">' + escapeHtml(label) + '</span><strong class="metric-value">' + escapeHtml(value + '%') + '</strong><div class="metric-bar"><span style="width:' + clamp(value, 0, 100) + '%"></span></div><div class="metric-desc">已填任务 / 总任务，按当前自然周计算</div></article>';
  }

  function renderDepartmentChart() {
    return '<div class="chart">' + getDepartmentSummary().map(function (row) {
      var plannedWidth = row.max ? (row.planned / row.max) * 100 : 0;
      var approvedWidth = row.max ? (row.approved / row.max) * 100 : 0;
      return '<div class="chart-row"><strong>' + escapeHtml(row.departmentName) + '</strong><div class="chart-track"><span class="planned" style="width:' + plannedWidth + '%"></span><span class="approved" style="width:' + approvedWidth + '%"></span></div><div class="chart-values">应填 ' + row.planned + ' / 已审核 ' + row.approved + '</div></div>';
    }).join('') + '</div>';
  }

  function renderTodoCard(report, reviewMode) {
    var template = getTemplate(report.templateId);
    var reportUser = getUser(report.userId);
    return '<article class="list-card" style="margin-bottom:12px;"><div class="split"><strong>' + escapeHtml(template.name) + '</strong>' + renderStatusTag(report.status) + '</div><p>' + escapeHtml(reportUser.name + ' / ' + getDepartmentName(reportUser.departmentId) + ' / 周期：' + getWeekLabel(report.weekStart, report.weekEnd)) + '</p><div class="button-row" style="margin-top:12px;"><button class="btn btn-secondary" data-action="' + (reviewMode ? 'open-review-report' : 'open-view-report') + '" data-id="' + escapeHtml(report.id) + '">' + (reviewMode ? '去审核' : '查看') + '</button></div></article>';
  }

  function renderRecentReportTable(rows) {
    return '<div class="table-wrap"><table class="table"><thead><tr><th>周报名称</th><th>周期</th><th>状态</th><th>操作</th></tr></thead><tbody>' + rows.map(function (report) {
      return '<tr><td>' + escapeHtml(getTemplate(report.templateId).name) + '</td><td>' + escapeHtml(getWeekLabel(report.weekStart, report.weekEnd)) + '</td><td>' + renderStatusTag(report.status) + '</td><td><button class="btn btn-light" data-action="open-view-report" data-id="' + escapeHtml(report.id) + '">查看</button></td></tr>';
    }).join('') + '</tbody></table></div>';
  }

  function renderPendingFillTable(rows) {
    if (!rows.length) {
      return '<div class="empty-state">当前筛选条件下没有待填报任务。</div>';
    }
    return '<div class="table-wrap"><table class="table"><thead><tr><th>周报名称</th><th>开始时间</th><th>结束时间</th><th>当前状态</th><th>编制时间</th><th>操作</th></tr></thead><tbody>' + rows.map(function (row) {
      return '<tr><td>' + escapeHtml(row.templateName) + '</td><td>' + escapeHtml(row.weekStart) + '</td><td>' + escapeHtml(row.weekEnd) + '</td><td>' + renderStatusTag(row.status) + '</td><td>' + escapeHtml(row.createdAt || '-') + '</td><td>' + renderPendingFillAction(row) + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  }

  function renderPendingReviewTable(rows) {
    return '<div class="table-wrap"><table class="table"><thead><tr><th>周报名称</th><th>填报人</th><th>填报部门</th><th>周报周期</th><th>提交时间</th><th>状态</th><th>操作</th></tr></thead><tbody>' + rows.map(function (report) {
      var template = getTemplate(report.templateId);
      var user = getUser(report.userId);
      return '<tr><td>' + escapeHtml(template.name) + '</td><td>' + escapeHtml(user.name) + '</td><td>' + escapeHtml(getDepartmentName(user.departmentId)) + '</td><td>' + escapeHtml(getWeekLabel(report.weekStart, report.weekEnd)) + '</td><td>' + escapeHtml(report.submittedAt || '-') + '</td><td>' + renderStatusTag(report.status) + '</td><td><button class="btn btn-secondary" data-action="open-review-report" data-id="' + escapeHtml(report.id) + '">审核</button></td></tr>';
    }).join('') + '</tbody></table></div>';
  }

  function renderMyReportsTable(rows) {
    return '<div class="table-wrap"><table class="table"><thead><tr><th>周报名称</th><th>周报周期</th><th>状态</th><th>编制时间</th><th>审核人</th><th>审核意见</th><th>操作</th></tr></thead><tbody>' + rows.map(function (report) {
      return '<tr><td>' + escapeHtml(getTemplate(report.templateId).name) + '</td><td>' + escapeHtml(getWeekLabel(report.weekStart, report.weekEnd)) + '</td><td>' + renderStatusTag(report.status) + '</td><td>' + escapeHtml(report.createdAt || '-') + '</td><td>' + escapeHtml(getUserName(report.reviewerId) || '-') + '</td><td>' + escapeHtml(report.reviewerOpinion || '-') + '</td><td>' + renderMyReportAction(report) + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  }

  function renderReportViewTable(rows) {
    return '<div class="table-wrap"><table class="table"><thead><tr><th>周报名称</th><th>填报人</th><th>所属部门</th><th>周报周期</th><th>审核时间</th><th>操作</th></tr></thead><tbody>' + rows.map(function (report) {
      var user = getUser(report.userId);
      return '<tr><td>' + escapeHtml(getTemplate(report.templateId).name) + '</td><td>' + escapeHtml(user.name) + '</td><td>' + escapeHtml(getDepartmentName(user.departmentId)) + '</td><td>' + escapeHtml(getWeekLabel(report.weekStart, report.weekEnd)) + '</td><td>' + escapeHtml(report.reviewedAt || '-') + '</td><td><button class="btn btn-light" data-action="open-view-report" data-id="' + escapeHtml(report.id) + '">查看</button></td></tr>';
    }).join('') + '</tbody></table></div>';
  }

  function renderTemplateTable(rows) {
    return '<div class="table-wrap"><table class="table"><thead><tr><th>模板名称</th><th>模板编码</th><th>状态</th><th>填报角色</th><th>查看角色</th><th>查看部门范围</th><th>数据对象数</th><th>操作</th></tr></thead><tbody>' + rows.map(function (item) {
      return '<tr><td>' + escapeHtml(item.name) + '</td><td>' + escapeHtml(item.code) + '</td><td>' + renderSimpleStatusTag(item.status) + '</td><td>' + escapeHtml(getRoleNames(item.reporterRoleIds).join('、')) + '</td><td>' + escapeHtml(getRoleNames(item.viewerRoleIds).join('、')) + '</td><td>' + escapeHtml(item.departmentScopeIds.map(getDepartmentName).join('、')) + '</td><td>' + item.objects.length + '</td><td><div class="button-row"><button class="btn btn-secondary" data-action="open-template-editor" data-id="' + escapeHtml(item.id) + '">编辑</button><button class="btn btn-light" data-action="toggle-template-status" data-id="' + escapeHtml(item.id) + '">' + (item.status === 'ENABLED' ? '停用' : '启用') + '</button></div></td></tr>';
    }).join('') + '</tbody></table></div>';
  }

  function renderBaseTabContent() {
    switch (ui.baseTab) {
      case 'users':
        return renderUsersTab();
      case 'departments':
        return renderDepartmentsTab();
      case 'dictionaries':
        return renderDictionariesTab();
      case 'roles':
        return renderRolesTab();
      case 'menus':
        return renderMenusTab();
      default:
        return '';
    }
  }

  function renderUsersTab() {
    return '<div class="stack"><div class="split"><div class="text-muted">维护工号、姓名、部门、直属领导、状态和角色。</div><button class="btn btn-primary" data-action="open-config-editor" data-id="user">新增用户</button></div><div class="table-wrap"><table class="table"><thead><tr><th>工号</th><th>姓名</th><th>部门</th><th>直属领导</th><th>状态</th><th>角色</th><th>操作</th></tr></thead><tbody>' + state.users.map(function (user) {
      return '<tr><td>' + escapeHtml(user.employeeNo) + '</td><td>' + escapeHtml(user.name) + '</td><td>' + escapeHtml(getDepartmentName(user.departmentId)) + '</td><td>' + escapeHtml(getUserName(user.leaderId) || '-') + '</td><td>' + renderSimpleStatusTag(user.status) + '</td><td>' + escapeHtml(getRoleNames(user.roleIds).join('、')) + '</td><td><div class="button-row"><button class="btn btn-secondary" data-action="open-config-editor" data-id="user" data-extra="' + escapeHtml(user.id) + '">编辑</button><button class="btn btn-light" data-action="toggle-entity-status" data-id="users" data-extra="' + escapeHtml(user.id) + '">' + (user.status === 'ENABLED' ? '停用' : '启用') + '</button></div></td></tr>';
    }).join('') + '</tbody></table></div></div>';
  }

  function renderDepartmentsTab() {
    return '<div class="stack"><div class="split"><div class="text-muted">部门不考虑多级结构，仅维护一个层级信息。</div><button class="btn btn-primary" data-action="open-config-editor" data-id="department">新增部门</button></div><div class="table-wrap"><table class="table"><thead><tr><th>部门编码</th><th>部门名称</th><th>状态</th><th>操作</th></tr></thead><tbody>' + state.departments.map(function (item) {
      return '<tr><td>' + escapeHtml(item.code) + '</td><td>' + escapeHtml(item.name) + '</td><td>' + renderSimpleStatusTag(item.status) + '</td><td><div class="button-row"><button class="btn btn-secondary" data-action="open-config-editor" data-id="department" data-extra="' + escapeHtml(item.id) + '">编辑</button><button class="btn btn-light" data-action="toggle-entity-status" data-id="departments" data-extra="' + escapeHtml(item.id) + '">' + (item.status === 'ENABLED' ? '停用' : '启用') + '</button></div></td></tr>';
    }).join('') + '</tbody></table></div></div>';
  }

  function renderDictionariesTab() {
    return '<div class="stack"><div class="split"><div class="text-muted">字典类型与字典项统一维护，下拉选择框直接引用字典类型编码。</div><button class="btn btn-primary" data-action="open-config-editor" data-id="dictionary">新增字典类型</button></div>' + state.dictionaries.map(function (dict) {
      return '<article class="section-panel"><div class="section-head"><div class="split"><div><h4>' + escapeHtml(dict.typeName + ' / ' + dict.typeCode) + '</h4><p>状态：' + escapeHtml(dict.status === 'ENABLED' ? '启用' : '停用') + '</p></div><div class="button-row"><button class="btn btn-secondary" data-action="open-config-editor" data-id="dictionary" data-extra="' + escapeHtml(dict.id) + '">编辑</button><button class="btn btn-light" data-action="toggle-entity-status" data-id="dictionaries" data-extra="' + escapeHtml(dict.id) + '">' + (dict.status === 'ENABLED' ? '停用' : '启用') + '</button></div></div></div><div class="section-body"><div class="table-wrap"><table class="table"><thead><tr><th>字典项编码</th><th>字典项名称</th><th>排序号</th><th>状态</th></tr></thead><tbody>' + dict.items.map(function (item) {
        return '<tr><td>' + escapeHtml(item.code) + '</td><td>' + escapeHtml(item.name) + '</td><td>' + escapeHtml(String(item.orderNo)) + '</td><td>' + renderSimpleStatusTag(item.status) + '</td></tr>';
      }).join('') + '</tbody></table></div></div></article>';
    }).join('') + '</div>';
  }

  function renderRolesTab() {
    return '<div class="stack"><div class="split"><div class="text-muted">角色可绑定多个用户，菜单访问由菜单配置的角色决定。</div><button class="btn btn-primary" data-action="open-config-editor" data-id="role">新增角色</button></div><div class="table-wrap"><table class="table"><thead><tr><th>角色编码</th><th>角色名称</th><th>状态</th><th>关联用户</th><th>操作</th></tr></thead><tbody>' + state.roles.map(function (role) {
      var users = state.users.filter(function (item) {
        return item.roleIds.indexOf(role.id) >= 0;
      });
      return '<tr><td>' + escapeHtml(role.code) + '</td><td>' + escapeHtml(role.name) + '</td><td>' + renderSimpleStatusTag(role.status) + '</td><td>' + escapeHtml(users.map(function (item) { return item.name; }).join('、') || '-') + '</td><td><div class="button-row"><button class="btn btn-secondary" data-action="open-config-editor" data-id="role" data-extra="' + escapeHtml(role.id) + '">编辑</button><button class="btn btn-light" data-action="toggle-entity-status" data-id="roles" data-extra="' + escapeHtml(role.id) + '">' + (role.status === 'ENABLED' ? '停用' : '启用') + '</button></div></td></tr>';
    }).join('') + '</tbody></table></div></div>';
  }

  function renderMenusTab() {
    return '<div class="stack"><div class="split"><div class="text-muted">菜单权限控制到菜单级别，不单独建设按钮级权限。</div><button class="btn btn-primary" data-action="open-config-editor" data-id="menu">新增菜单</button></div><div class="table-wrap"><table class="table"><thead><tr><th>菜单名称</th><th>路径</th><th>排序</th><th>可访问角色</th><th>操作</th></tr></thead><tbody>' + state.menus.slice().sort(function (a, b) { return a.orderNo - b.orderNo; }).map(function (menu) {
      return '<tr><td>' + escapeHtml(menu.name) + '</td><td>' + escapeHtml(menu.path) + '</td><td>' + escapeHtml(String(menu.orderNo)) + '</td><td>' + escapeHtml(getRoleNames(menu.roleIds).join('、')) + '</td><td><button class="btn btn-secondary" data-action="open-config-editor" data-id="menu" data-extra="' + escapeHtml(menu.id) + '">编辑</button></td></tr>';
    }).join('') + '</tbody></table></div></div>';
  }

  function renderFilterCard(formName, fields, extraAction) {
    return '<section class="card"><form data-form="' + escapeHtml(formName) + '"><div class="filter-grid">' + fields.join('') + '</div><div class="button-row" style="margin-top:16px;"><button class="btn btn-primary" type="submit">查询</button>' + (extraAction || '') + '</div></form></section>';
  }

  function renderDescItem(label, value) {
    return '<div class="desc-item"><strong>' + escapeHtml(label) + '</strong><span>' + escapeHtml(value) + '</span></div>';
  }

  function renderTab(id, label) {
    return '<button class="tab ' + (ui.baseTab === id ? 'active' : '') + '" data-action="base-tab" data-id="' + escapeHtml(id) + '">' + escapeHtml(label) + '</button>';
  }

  function renderStatusTag(status) {
    var map = {
      DRAFT: ['tag-muted', '草稿'],
      PENDING: ['tag-warning', '待审核'],
      RETURNED: ['tag-danger', '已退回'],
      APPROVED: ['tag-success', '已审核'],
      UNCREATED: ['tag-primary', '未创建']
    };
    var item = map[status] || ['tag-muted', status];
    return '<span class="tag ' + item[0] + '">' + item[1] + '</span>';
  }

  function renderSimpleStatusTag(status) {
    return '<span class="tag ' + (status === 'ENABLED' ? 'tag-success' : 'tag-muted') + '">' + (status === 'ENABLED' ? '启用' : '停用') + '</span>';
  }

  function renderAnnouncementTag(level) {
    var classMap = { IMPORTANT: 'tag-danger', NORMAL: 'tag-muted', NEW: 'tag-success' };
    var textMap = { IMPORTANT: '重要', NORMAL: '普通', NEW: '新增' };
    return '<span class="tag ' + (classMap[level] || 'tag-muted') + '">' + (textMap[level] || level) + '</span>';
  }

  function renderPendingFillAction(row) {
    if (!row.reportId) {
      return '<button class="btn btn-primary" data-action="open-create-report" data-id="' + escapeHtml(row.templateId) + '">填报</button>';
    }
    if (row.status === 'DRAFT' || row.status === 'RETURNED') {
      return '<button class="btn btn-secondary" data-action="open-edit-report" data-id="' + escapeHtml(row.reportId) + '">继续填报</button>';
    }
    return '<button class="btn btn-light" data-action="open-view-report" data-id="' + escapeHtml(row.reportId) + '">查看</button>';
  }

  function renderMyReportAction(report) {
    if (canEditReport(report)) {
      return '<button class="btn btn-secondary" data-action="open-edit-report" data-id="' + escapeHtml(report.id) + '">继续编辑</button>';
    }
    return '<button class="btn btn-light" data-action="open-view-report" data-id="' + escapeHtml(report.id) + '">查看</button>';
  }

  function renderReportEditorModal() {
    var draft = ui.modal.draft;
    var template = getTemplate(draft.templateId);
    var user = getUser(draft.userId);
    return '<div class="modal-head"><div><strong style="font-size:20px;">' + escapeHtml((ui.modal.mode === 'create' ? '新增' : '编辑') + ' - ' + template.name) + '</strong><div class="text-muted compact">对象表格录入，多行数据独立维护</div></div><button class="btn btn-light" data-action="close-modal">关闭</button></div>' +
      '<div class="modal-body"><div class="notice-box">当前演示业务日期：' + escapeHtml(state.meta.demoDate) + '。周中可填写并暂存草稿；周六、周日可正式提交。提交时会自动固化直属领导为审核人。</div>' +
      '<div class="desc-list">' +
      renderDescItem('姓名', user.name) +
      renderDescItem('部门', getDepartmentName(user.departmentId)) +
      renderDescItem('报告周期', getWeekLabel(draft.weekStart, draft.weekEnd)) +
      renderDescItem('直属领导', getUserName(user.leaderId) || '未配置') +
      '</div>' +
      template.objects.map(function (objectDef, sectionIndex) {
        var section = draft.sections[sectionIndex];
        return renderReportObjectEditor(objectDef, section, sectionIndex);
      }).join('') +
      '</div>' +
      '<div class="modal-foot"><div class="button-row"><button class="btn btn-light" data-action="restore-last-week">还原上周周报</button></div><div class="button-row"><button class="btn btn-light" data-action="close-modal">取消</button><button class="btn btn-secondary" data-action="save-report-draft">暂存</button><button class="btn btn-primary" data-action="submit-report">提交</button></div></div>';
  }

  function renderReportObjectEditor(objectDef, section, sectionIndex) {
    return '<article class="section-panel"><div class="section-head"><div class="split"><div><h4>' + escapeHtml(objectDef.name) + '</h4><p>' + escapeHtml(objectDef.description || '无对象说明') + '</p></div><button class="btn btn-secondary" data-action="report-add-row" data-id="' + escapeHtml(objectDef.id) + '">新增行</button></div></div><div class="section-body"><div class="report-table"><table><thead><tr>' +
      objectDef.fields.map(function (field) {
        return '<th>' + escapeHtml(field.name + (field.required ? ' *' : '')) + '</th>';
      }).join('') +
      '<th>操作</th></tr></thead><tbody>' +
      (section.rows.length ? section.rows.map(function (row, rowIndex) {
        return '<tr>' + objectDef.fields.map(function (field) {
          return '<td>' + renderReportFieldControl(field, row.values[field.code] || '', sectionIndex, rowIndex) + '</td>';
        }).join('') + '<td><button class="btn btn-light" data-action="report-remove-row" data-id="' + escapeHtml(objectDef.id) + '" data-extra="' + escapeHtml(row.id) + '">删除</button></td></tr>';
      }).join('') : '<tr><td colspan="' + (objectDef.fields.length + 1) + '"><div class="empty-state">当前对象暂无行数据，请点击“新增行”。</div></td></tr>') +
      '</tbody></table></div></div></article>';
  }

  function renderReportFieldControl(field, value, sectionIndex, rowIndex) {
    var attrs = ' data-report-section-index="' + sectionIndex + '" data-report-row-index="' + rowIndex + '" data-report-field-code="' + escapeHtml(field.code) + '"';
    if (field.controlType === 'TEXTAREA') {
      return '<textarea class="report-textarea"' + attrs + ' placeholder="请输入' + escapeHtml(field.name) + '">' + escapeHtml(value) + '</textarea>';
    }
    if (field.controlType === 'SELECT') {
      return '<select class="report-select"' + attrs + '>' + getDictOptions(field.dictTypeCode, value) + '</select>';
    }
    if (field.controlType === 'DATE') {
      return '<input class="report-input" type="date" value="' + escapeHtml(value) + '"' + attrs + ' />';
    }
    return '<input class="report-input" type="text" value="' + escapeHtml(value) + '"' + attrs + ' placeholder="请输入' + escapeHtml(field.name) + '" />';
  }

  function renderReportViewModal() {
    var report = getReport(ui.modal.reportId);
    var template = getTemplate(report.templateId);
    var user = getUser(report.userId);
    return '<div class="modal-head"><div><strong style="font-size:20px;">' + escapeHtml(template.name) + '</strong><div class="text-muted compact">' + escapeHtml(user.name + ' / ' + getDepartmentName(user.departmentId) + ' / ' + getWeekLabel(report.weekStart, report.weekEnd)) + '</div></div><button class="btn btn-light" data-action="close-modal">关闭</button></div>' +
      '<div class="modal-body"><div class="desc-list">' +
      renderDescItem('填报人', user.name) +
      renderDescItem('提交时间', report.submittedAt || '-') +
      renderDescItem('审核人', getUserName(report.reviewerId) || '-') +
      renderDescItem('当前状态', statusText(report.status)) +
      '</div>' +
      template.objects.map(function (objectDef) {
        return renderReportObjectReadonly(objectDef, findReportSection(report, objectDef.id));
      }).join('') +
      (ui.modal.reviewMode
        ? '<div class="field"><label for="reviewOpinion">审核意见</label><textarea id="reviewOpinion" class="report-textarea" data-review-opinion="1" placeholder="审核意见可为空">' + escapeHtml(ui.modal.reviewOpinion || '') + '</textarea></div>'
        : '<div class="notice-box">审核意见：' + escapeHtml(report.reviewerOpinion || '无') + '</div>') +
      '</div>' +
      '<div class="modal-foot"><div></div><div class="button-row"><button class="btn btn-light" data-action="close-modal">关闭</button>' +
      (ui.modal.reviewMode ? '<button class="btn btn-danger" data-action="reject-report">审核退回</button><button class="btn btn-primary" data-action="approve-report">审核通过</button>' : '') +
      '</div></div>';
  }

  function renderReportObjectReadonly(objectDef, section) {
    return '<article class="section-panel"><div class="section-head"><h4>' + escapeHtml(objectDef.name) + '</h4><p>' + escapeHtml(objectDef.description || '无对象说明') + '</p></div><div class="section-body"><div class="report-table"><table><thead><tr>' +
      objectDef.fields.map(function (field) {
        return '<th>' + escapeHtml(field.name) + '</th>';
      }).join('') +
      '</tr></thead><tbody>' +
      (section.rows.length ? section.rows.map(function (row) {
        return '<tr>' + objectDef.fields.map(function (field) {
          return '<td>' + escapeHtml(displayFieldValue(field, row.values[field.code] || '')) + '</td>';
        }).join('') + '</tr>';
      }).join('') : '<tr><td colspan="' + objectDef.fields.length + '"><div class="empty-state">该对象暂无填报数据。</div></td></tr>') +
      '</tbody></table></div></div></article>';
  }

  function renderTemplateEditorModal() {
    var draft = ui.modal.draft;
    return '<div class="modal-head"><div><strong style="font-size:20px;">' + escapeHtml((ui.modal.mode === 'create' ? '新增' : '编辑') + '模板') + '</strong><div class="text-muted compact">模板对象支持新增、删除，字段支持设置数据类型和控件类型</div></div><button class="btn btn-light" data-action="close-modal">关闭</button></div>' +
      '<div class="modal-body"><div class="grid grid-2">' +
      renderBoundField('模板名称', draft.name, { root: 'name' }, 'input', '请输入模板名称') +
      renderBoundField('模板编码', draft.code, { root: 'code' }, 'input', '请输入模板编码') +
      renderBoundField('模板说明', draft.description, { root: 'description' }, 'textarea', '请输入模板说明') +
      renderBoundSelect('状态', draft.status, { root: 'status' }, [{ value: 'ENABLED', label: '启用' }, { value: 'DISABLED', label: '停用' }]) +
      '</div>' +
      '<div class="grid grid-3">' +
      renderPickerField('填报角色', draft.reporterRoleIds.map(function (id) { return getRole(id); }).filter(Boolean).map(function (item) { return item.name; }).join('，'), 'reporterRoleIds', 'reporter-roles') +
      renderPickerField('查看角色', draft.viewerRoleIds.map(function (id) { return getRole(id); }).filter(Boolean).map(function (item) { return item.name; }).join('，'), 'viewerRoleIds', 'viewer-roles') +
      renderPickerField('查看部门范围', draft.departmentScopeIds.map(function (id) { return getDepartment(id); }).filter(Boolean).map(function (item) { return item.name; }).join('，'), 'departmentScopeIds', 'departments') +
      '</div>' +
      '<div class="split"><strong>数据对象定义</strong><button class="btn btn-secondary" data-action="template-add-object">新增对象</button></div>' +
      draft.objects.map(function (objectDef, objectIndex) {
        return '<article class="section-panel"><div class="section-head"><div class="split"><div><h4>对象 ' + (objectIndex + 1) + '：' + escapeHtml(objectDef.name || '未命名对象') + '</h4><p>多行表格对象，字段顺序决定展示顺序</p></div><div class="button-row"><button class="btn btn-light" data-action="template-add-field" data-id="' + objectIndex + '">新增字段</button><button class="btn btn-light" data-action="template-remove-object" data-id="' + objectIndex + '">删除对象</button></div></div></div><div class="section-body"><div class="grid grid-2">' +
          renderBoundField('对象名称', objectDef.name, { objectIndex: objectIndex, objectKey: 'name' }, 'input', '请输入对象名称') +
          renderBoundField('对象编码', objectDef.code, { objectIndex: objectIndex, objectKey: 'code' }, 'input', '请输入对象编码') +
          renderBoundField('显示顺序', String(objectDef.orderNo || ''), { objectIndex: objectIndex, objectKey: 'orderNo' }, 'input', '请输入顺序') +
          renderBoundSelect('是否必填', objectDef.required ? 'Y' : 'N', { objectIndex: objectIndex, objectKey: 'required', boolSelect: '1' }, [{ value: 'Y', label: '是' }, { value: 'N', label: '否' }]) +
          renderBoundField('对象说明', objectDef.description, { objectIndex: objectIndex, objectKey: 'description' }, 'textarea', '请输入对象说明') +
          '</div><div class="table-wrap"><table class="table"><thead><tr><th>字段名称</th><th>字段编码</th><th>数据类型</th><th>控件类型</th><th>必填</th><th>默认值</th><th>字典编码</th><th>顺序</th><th>操作</th></tr></thead><tbody>' +
          objectDef.fields.map(function (field, fieldIndex) {
            return '<tr><td>' + boundInput(field.name, { objectIndex: objectIndex, fieldIndex: fieldIndex, fieldKey: 'name' }) + '</td><td>' + boundInput(field.code, { objectIndex: objectIndex, fieldIndex: fieldIndex, fieldKey: 'code' }) + '</td><td>' + boundSelect(field.dataType, { objectIndex: objectIndex, fieldIndex: fieldIndex, fieldKey: 'dataType' }, [{ value: 'STRING', label: '字符' }, { value: 'NUMBER', label: '数字' }, { value: 'DATE', label: '日期' }]) + '</td><td>' + boundSelect(field.controlType, { objectIndex: objectIndex, fieldIndex: fieldIndex, fieldKey: 'controlType' }, getControlOptions(field.dataType)) + '</td><td>' + boundSelect(field.required ? 'Y' : 'N', { objectIndex: objectIndex, fieldIndex: fieldIndex, fieldKey: 'required', boolSelect: '1' }, [{ value: 'Y', label: '是' }, { value: 'N', label: '否' }]) + '</td><td>' + boundInput(field.defaultValue || '', { objectIndex: objectIndex, fieldIndex: fieldIndex, fieldKey: 'defaultValue' }) + '</td><td>' + boundInput(field.dictTypeCode || '', { objectIndex: objectIndex, fieldIndex: fieldIndex, fieldKey: 'dictTypeCode' }) + '</td><td>' + boundInput(String(field.orderNo || ''), { objectIndex: objectIndex, fieldIndex: fieldIndex, fieldKey: 'orderNo' }) + '</td><td><button class="btn btn-light" data-action="template-remove-field" data-id="' + objectIndex + '" data-extra="' + fieldIndex + '">删除</button></td></tr>';
          }).join('') +
          '</tbody></table></div></div></article>';
      }).join('') +
      '</div><div class="modal-foot"><div></div><div class="button-row"><button class="btn btn-light" data-action="close-modal">取消</button><button class="btn btn-primary" data-action="save-template">保存模板</button></div></div>';
  }

  function renderConfigEditorModal() {
    return '<div class="modal-head"><div><strong style="font-size:20px;">' + escapeHtml((ui.modal.mode === 'create' ? '新增' : '编辑') + getConfigTitle(ui.modal.entityType)) + '</strong></div><button class="btn btn-light" data-action="close-modal">关闭</button></div><div class="modal-body">' + renderConfigEditorBody() + '</div><div class="modal-foot"><div></div><div class="button-row"><button class="btn btn-light" data-action="close-modal">取消</button><button class="btn btn-primary" data-action="save-config">保存</button></div></div>';
  }

  function renderConfigEditorBody() {
    var entityType = ui.modal.entityType;
    var draft = ui.modal.draft;
    if (entityType === 'user') {
      return '<div class="grid grid-2">' +
        renderBoundField('工号', draft.employeeNo, { configKey: 'employeeNo' }, 'input', '请输入工号') +
        renderBoundField('中文姓名', draft.name, { configKey: 'name' }, 'input', '请输入姓名') +
        renderBoundField('登录密码', draft.password, { configKey: 'password' }, 'input', '请输入密码') +
        renderBoundSelect('所属部门', draft.departmentId, { configKey: 'departmentId' }, state.departments.map(function (item) { return { value: item.id, label: item.name }; })) +
        renderBoundSelect('直属领导', draft.leaderId || '', { configKey: 'leaderId' }, [{ value: '', label: '未配置' }].concat(state.users.map(function (item) { return { value: item.id, label: item.name + ' / ' + item.employeeNo }; }))) +
        renderBoundSelect('用户状态', draft.status, { configKey: 'status' }, [{ value: 'ENABLED', label: '启用' }, { value: 'DISABLED', label: '停用' }]) +
        '</div>' + renderCheckGroup('角色集合', draft.roleIds, 'roleIds', state.roles, 'config');
    }
    if (entityType === 'department') {
      return '<div class="grid grid-2">' +
        renderBoundField('部门编码', draft.code, { configKey: 'code' }, 'input', '请输入部门编码') +
        renderBoundField('部门名称', draft.name, { configKey: 'name' }, 'input', '请输入部门名称') +
        renderBoundSelect('状态', draft.status, { configKey: 'status' }, [{ value: 'ENABLED', label: '启用' }, { value: 'DISABLED', label: '停用' }]) +
        '</div>';
    }
    if (entityType === 'role') {
      return '<div class="grid grid-2">' +
        renderBoundField('角色编码', draft.code, { configKey: 'code' }, 'input', '请输入角色编码') +
        renderBoundField('角色名称', draft.name, { configKey: 'name' }, 'input', '请输入角色名称') +
        renderBoundSelect('状态', draft.status, { configKey: 'status' }, [{ value: 'ENABLED', label: '启用' }, { value: 'DISABLED', label: '停用' }]) +
        '</div>' + renderCheckGroup('角色下用户', draft.userIds || [], 'userIds', state.users, 'config');
    }
    if (entityType === 'menu') {
      return '<div class="grid grid-2">' +
        renderBoundField('菜单名称', draft.name, { configKey: 'name' }, 'input', '请输入菜单名称') +
        renderBoundField('菜单路径', draft.path, { configKey: 'path' }, 'input', '请输入菜单路径') +
        renderBoundField('排序号', String(draft.orderNo || ''), { configKey: 'orderNo' }, 'input', '请输入排序号') +
        '</div>' + renderCheckGroup('可访问角色', draft.roleIds, 'roleIds', state.roles, 'config');
    }
    if (entityType === 'dictionary') {
      return '<div class="grid grid-2">' +
        renderBoundField('字典类型编码', draft.typeCode, { configKey: 'typeCode' }, 'input', '请输入字典类型编码') +
        renderBoundField('字典类型名称', draft.typeName, { configKey: 'typeName' }, 'input', '请输入字典类型名称') +
        renderBoundSelect('状态', draft.status, { configKey: 'status' }, [{ value: 'ENABLED', label: '启用' }, { value: 'DISABLED', label: '停用' }]) +
        '</div><div class="split"><strong>字典项列表</strong><button class="btn btn-secondary" data-action="dict-add-item">新增字典项</button></div><div class="table-wrap"><table class="table"><thead><tr><th>编码</th><th>名称</th><th>排序号</th><th>状态</th><th>操作</th></tr></thead><tbody>' +
        draft.items.map(function (item, index) {
          return '<tr><td>' + configInput(item.code, { dictIndex: index, dictKey: 'code' }) + '</td><td>' + configInput(item.name, { dictIndex: index, dictKey: 'name' }) + '</td><td>' + configInput(String(item.orderNo || ''), { dictIndex: index, dictKey: 'orderNo' }) + '</td><td>' + configSelect(item.status, { dictIndex: index, dictKey: 'status' }, [{ value: 'ENABLED', label: '启用' }, { value: 'DISABLED', label: '停用' }]) + '</td><td><button class="btn btn-light" data-action="dict-remove-item" data-id="' + index + '">删除</button></td></tr>';
        }).join('') +
        '</tbody></table></div>';
    }
    return '';
  }

  function renderPickerField(label, valueText, targetKey, sourceType) {
    return '<div class="field"><label>' + escapeHtml(label) + '</label><div class="field-inline"><input value="' + escapeHtml(valueText || '') + '" readonly placeholder="请选择后自动回填" /><button class="btn btn-secondary" type="button" data-action="open-picker" data-id="' + escapeHtml(targetKey) + '" data-extra="' + escapeHtml(sourceType) + '">选择</button></div></div>';
  }

  function renderPickerModal() {
    return '<div class="modal-root"><div class="modal small"><div class="modal-head"><div><strong style="font-size:20px;">' + escapeHtml(ui.picker.title) + '</strong><div class="text-muted compact">支持多选，确认后以逗号形式回填到文本框。</div></div><button class="btn btn-light" data-action="close-picker">关闭</button></div><div class="modal-body"><div class="multi-check">' + ui.picker.options.map(function (item) {
      return '<label class="check-item"><input type="checkbox" data-picker-item="' + escapeHtml(item.id) + '"' + (ui.picker.selectedIds.indexOf(item.id) >= 0 ? ' checked' : '') + ' /><span>' + escapeHtml(item.name) + '</span></label>';
    }).join('') + '</div></div><div class="modal-foot"><div></div><div class="button-row"><button class="btn btn-light" data-action="close-picker">取消</button><button class="btn btn-primary" data-action="picker-confirm">确定</button></div></div></div></div>';
  }

  function openReportEditor(templateId, reportId) {
    var currentUser = getCurrentUser();
    var week = getCurrentWeek();
    var tab;
    if (reportId) {
      var report = deepClone(getReport(reportId));
      tab = {
        id: 'report-editor-' + report.id,
        type: 'report-editor',
        path: ui.page,
        basePath: ui.page,
        title: getTemplate(report.templateId).name + ' - 填报',
        draft: report
      };
    } else {
      var template = getTemplate(templateId);
      tab = {
        id: 'report-editor-' + template.id + '-' + currentUser.id,
        type: 'report-editor',
        path: ui.page,
        basePath: ui.page,
        title: template.name + ' - 填报',
        draft: createEmptyReport(template, currentUser, week)
      };
    }
    upsertWorkspaceTab(tab);
  }

  function openReportView(reportId, reviewMode) {
    var report = getReport(reportId);
    upsertWorkspaceTab({
      id: 'report-view-' + report.id + '-' + (reviewMode ? 'review' : 'view'),
      type: 'report-view',
      path: ui.page,
      basePath: ui.page,
      title: getTemplate(report.templateId).name + (reviewMode ? ' - 审核' : ' - 查看'),
      reportId: report.id,
      reviewMode: !!reviewMode,
      reviewOpinion: report.reviewerOpinion || ''
    });
  }

  function addReportRow(objectId) {
    var activeTab = getActiveTab();
    var template = getTemplate(activeTab.draft.templateId);
    var objectDef = template.objects.find(function (item) { return item.id === objectId; });
    var section = activeTab.draft.sections.find(function (item) { return item.objectId === objectId; });
    section.rows.push({ id: generateId('ROW'), values: createEmptyValues(objectDef.fields) });
    render();
  }

  function removeReportRow(objectId, rowId) {
    var activeTab = getActiveTab();
    var section = activeTab.draft.sections.find(function (item) { return item.objectId === objectId; });
    section.rows = section.rows.filter(function (item) { return item.id !== rowId; });
    render();
  }

  function restoreLastWeek() {
    var draft = getActiveTab().draft;
    var previous = state.reports.find(function (report) {
      return report.userId === draft.userId &&
        report.templateId === draft.templateId &&
        report.weekEnd === addDays(draft.weekStart, -1) &&
        report.status !== 'DRAFT' &&
        report.templateVersion === draft.templateVersion;
    });
    if (!previous) {
      pushToast('未找到可还原的上周已提交周报，或模板结构已变化。', 'warning');
      return;
    }
    draft.sections = deepClone(previous.sections);
    render();
    pushToast('已还原上周周报内容', 'success');
  }

  function saveReport(targetStatus) {
    var activeTab = getActiveTab();
    var draft = activeTab.draft;
    var currentUser = getCurrentUser();
    if (targetStatus === 'PENDING') {
      if (!isWeekend(state.meta.demoDate)) {
        pushToast('仅周六或周日允许正式提交周报。', 'danger');
        return;
      }
      if (!currentUser.leaderId) {
        pushToast('当前用户未配置直属领导，无法提交周报。', 'danger');
        return;
      }
      var validation = validateReportDraft(getTemplate(draft.templateId), draft);
      if (!validation.ok) {
        pushToast(validation.message, 'danger');
        return;
      }
    }
    var now = state.meta.demoDate + ' 18:00:00';
    var existing = draft.id ? state.reports.find(function (item) { return item.id === draft.id; }) : null;
    if (existing) {
      Object.assign(existing, deepClone(draft));
    } else {
      draft.id = generateId('REP');
      state.reports.push(deepClone(draft));
      existing = state.reports[state.reports.length - 1];
    }
    existing.createdAt = existing.createdAt || now;
    if (targetStatus === 'DRAFT') {
      existing.status = 'DRAFT';
      existing.reviewerId = '';
      existing.submittedAt = '';
      existing.reviewedAt = '';
      existing.reviewerOpinion = '';
      pushToast(isWeekend(state.meta.demoDate) ? '周报已暂存为草稿' : '周中填写内容已暂存为草稿', 'success');
    } else {
      existing.status = 'PENDING';
      existing.reviewerId = currentUser.leaderId;
      existing.submittedAt = now;
      existing.reviewedAt = '';
      existing.reviewerOpinion = '';
      pushToast('周报已提交，等待直属领导审核', 'success');
    }
    persist();
    closeTab(activeTab.id, true);
    render();
  }

  function reviewReport(targetStatus) {
    var activeTab = getActiveTab();
    var report = getReport(activeTab.reportId);
    if (!report || report.status !== 'PENDING') {
      pushToast('当前周报已被处理，不能重复审核。', 'warning');
      return;
    }
    report.status = targetStatus;
    report.reviewedAt = state.meta.demoDate + ' 21:30:00';
    report.reviewerOpinion = activeTab.reviewOpinion || '';
    persist();
    closeTab(activeTab.id, true);
    render();
    pushToast(targetStatus === 'APPROVED' ? '审核通过成功' : '审核退回成功', 'success');
  }

  function openTemplateEditor(templateId) {
    var draft = templateId ? deepClone(getTemplate(templateId)) : {
      id: '',
      code: '',
      name: '',
      description: '',
      status: 'ENABLED',
      version: 1,
      reporterRoleIds: [],
      viewerRoleIds: [],
      departmentScopeIds: [],
      objects: [createEmptyObject(1)]
    };
    ui.modal = { type: 'template-editor', mode: templateId ? 'edit' : 'create', draft: draft };
    renderModal();
  }

  function openPicker(targetKey, sourceType) {
    var options = [];
    var title = '选择';
    if (sourceType === 'reporter-roles') {
      options = state.roles.filter(isReporterRole).map(function (item) { return { id: item.id, name: item.name }; });
      title = '选择填报角色';
    } else if (sourceType === 'viewer-roles') {
      options = state.roles.map(function (item) { return { id: item.id, name: item.name }; });
      title = '选择查看角色';
    } else if (sourceType === 'departments') {
      options = state.departments.map(function (item) { return { id: item.id, name: item.name }; });
      title = '选择查看部门范围';
    }
    ui.picker = {
      targetKey: targetKey,
      sourceType: sourceType,
      title: title,
      options: options,
      selectedIds: deepClone(ui.modal.draft[targetKey] || [])
    };
    renderModal();
  }

  function confirmPicker() {
    if (!ui.picker || !ui.modal || ui.modal.type !== 'template-editor') {
      return;
    }
    ui.modal.draft[ui.picker.targetKey] = deepClone(ui.picker.selectedIds);
    ui.picker = null;
    renderModal();
  }

  function addTemplateObject() {
    ui.modal.draft.objects.push(createEmptyObject(ui.modal.draft.objects.length + 1));
    renderModal();
  }

  function removeTemplateObject(index) {
    ui.modal.draft.objects.splice(Number(index), 1);
    renderModal();
  }

  function addTemplateField(index) {
    var objectDef = ui.modal.draft.objects[Number(index)];
    objectDef.fields.push(createEmptyField(objectDef.fields.length + 1));
    renderModal();
  }

  function removeTemplateField(objectIndex, fieldIndex) {
    ui.modal.draft.objects[Number(objectIndex)].fields.splice(Number(fieldIndex), 1);
    renderModal();
  }

  function saveTemplate() {
    var result = core.upsertTemplate(state, ui.modal.draft);
    if (!result.ok) {
      pushToast(result.error, 'danger');
      return;
    }
    persist();
    ui.modal = null;
    render();
    pushToast('模板已保存', 'success');
  }

  function openConfigEditor(entityType, entityId) {
    var draft;
    if (entityType === 'user') {
      draft = entityId ? deepClone(getUser(entityId)) : { id: '', employeeNo: '', password: '123456', name: '', departmentId: state.departments[0] && state.departments[0].id, leaderId: '', status: 'ENABLED', roleIds: [] };
    } else if (entityType === 'department') {
      draft = entityId ? deepClone(getDepartment(entityId)) : { id: '', code: '', name: '', status: 'ENABLED' };
    } else if (entityType === 'dictionary') {
      draft = entityId ? deepClone(state.dictionaries.find(function (item) { return item.id === entityId; })) : { id: '', typeCode: '', typeName: '', status: 'ENABLED', items: [{ code: '', name: '', orderNo: 1, status: 'ENABLED' }] };
    } else if (entityType === 'role') {
      draft = entityId ? deepClone(getRole(entityId)) : { id: '', code: '', name: '', status: 'ENABLED' };
      draft.userIds = state.users.filter(function (item) { return item.roleIds.indexOf(draft.id) >= 0; }).map(function (item) { return item.id; });
    } else if (entityType === 'menu') {
      draft = entityId ? deepClone(state.menus.find(function (item) { return item.id === entityId; })) : { id: '', name: '', path: '', orderNo: state.menus.length + 1, roleIds: [] };
    }
    ui.modal = { type: 'config-editor', small: entityType !== 'dictionary', entityType: entityType, mode: entityId ? 'edit' : 'create', draft: draft };
    renderModal();
  }

  function saveConfigEditor() {
    var entityType = ui.modal.entityType;
    var draft = ui.modal.draft;
    var result = null;
    if (entityType === 'user') {
      result = core.upsertUser(state, draft);
    } else if (entityType === 'department') {
      result = core.upsertDepartment(state, draft);
    } else if (entityType === 'dictionary') {
      result = core.upsertDictionary(state, draft);
    } else if (entityType === 'role') {
      result = core.upsertRole(state, draft);
    } else if (entityType === 'menu') {
      result = core.upsertMenu(state, draft);
    }
    if (!result || !result.ok) {
      pushToast(result ? result.error : '保存失败。', 'danger');
      return;
    }
    persist();
    ui.modal = null;
    render();
    pushToast('配置已保存', 'success');
  }

  function addDictionaryItem() {
    ui.modal.draft.items.push({ code: '', name: '', orderNo: ui.modal.draft.items.length + 1, status: 'ENABLED' });
    renderModal();
  }

  function removeDictionaryItem(index) {
    ui.modal.draft.items.splice(Number(index), 1);
    renderModal();
  }

  function switchUser(userId) {
    var target = getUser(userId);
    if (!target) {
      return;
    }
    window.demoStore.setSession({ currentUserId: target.id, loginAt: new Date().toISOString() });
    session = window.demoStore.getSession();
    ensurePageAccess();
    render();
    pushToast('已切换到账号：' + target.name, 'success');
  }

  function toggleEntityStatus(collectionName, entityId) {
    var result = core.toggleEntityStatus(state, collectionName, entityId);
    if (!result.ok) {
      pushToast(result.error, 'danger');
      return;
    }
    persist();
    render();
    pushToast('状态已更新', 'success');
  }

  function handlePasswordChange(form) {
    var currentUser = getCurrentUser();
    var data = new FormData(form);
    var oldPassword = String(data.get('oldPassword') || '');
    var newPassword = String(data.get('newPassword') || '');
    var confirmPassword = String(data.get('confirmPassword') || '');
    var result = core.changePassword(state, currentUser.id, oldPassword, newPassword, confirmPassword);
    if (!result.ok) {
      pushToast(result.error, 'danger');
      return;
    }
    persist();
    form.reset();
    pushToast('密码已修改（仅保存在本地 Demo 数据中）', 'success');
  }

  function syncModalInput(target) {
    var activeTab = getActiveTab();
    if (activeTab && activeTab.type === 'report-view' && target.hasAttribute('data-review-opinion')) {
      activeTab.reviewOpinion = target.value;
      return;
    }
    if (activeTab && activeTab.type === 'report-editor' && target.hasAttribute('data-report-field-code')) {
      activeTab.draft.sections[Number(target.getAttribute('data-report-section-index'))]
        .rows[Number(target.getAttribute('data-report-row-index'))]
        .values[target.getAttribute('data-report-field-code')] = target.value;
      return;
    }
    if (!ui.modal) {
      return;
    }
    if (target.hasAttribute('data-check-key')) {
      syncCheckInput(target);
      return;
    }
    if (ui.modal.type === 'template-editor' && hasTemplateBinding(target)) {
      syncTemplateBinding(target);
      return;
    }
    if (ui.modal.type === 'config-editor' && hasConfigBinding(target)) {
      syncConfigBinding(target);
    }
  }

  function syncCheckInput(target) {
    var key = target.getAttribute('data-check-key');
    var value = target.getAttribute('data-check-value');
    if (!Array.isArray(ui.modal.draft[key])) {
      ui.modal.draft[key] = [];
    }
    toggleArrayValue(ui.modal.draft[key], value, target.checked);
  }

  function syncTemplateBinding(target) {
    var draft = ui.modal.draft;
    var rootKey = target.getAttribute('data-bind-root');
    if (rootKey) {
      draft[rootKey] = target.value;
      return;
    }
    var objectIndex = target.getAttribute('data-bind-object-index');
    var objectKey = target.getAttribute('data-bind-object-key');
    if (objectIndex !== null && objectIndex !== '' && objectKey) {
      draft.objects[Number(objectIndex)][objectKey] = target.getAttribute('data-bind-bool-select') ? target.value === 'Y' : target.value;
      return;
    }
    var fieldIndex = target.getAttribute('data-bind-field-index');
    var fieldKey = target.getAttribute('data-bind-field-key');
    if (objectIndex !== null && objectIndex !== '' && fieldIndex !== null && fieldIndex !== '' && fieldKey) {
      draft.objects[Number(objectIndex)].fields[Number(fieldIndex)][fieldKey] = target.getAttribute('data-bind-bool-select') ? target.value === 'Y' : target.value;
    }
  }

  function syncConfigBinding(target) {
    var draft = ui.modal.draft;
    var configKey = target.getAttribute('data-bind-config-key');
    if (configKey) {
      draft[configKey] = target.value;
      return;
    }
    var dictIndex = target.getAttribute('data-bind-dict-index');
    var dictKey = target.getAttribute('data-bind-dict-key');
    if (dictIndex !== null && dictIndex !== '' && dictKey) {
      draft.items[Number(dictIndex)][dictKey] = target.value;
    }
  }

  function validateReportDraft(template, draft) {
    for (var i = 0; i < template.objects.length; i += 1) {
      var objectDef = template.objects[i];
      var section = draft.sections[i];
      if (objectDef.required && !section.rows.length) {
        return { ok: false, message: '对象“' + objectDef.name + '”至少需要录入一行数据。' };
      }
      for (var r = 0; r < section.rows.length; r += 1) {
        for (var f = 0; f < objectDef.fields.length; f += 1) {
          var field = objectDef.fields[f];
          if (field.required && !String(section.rows[r].values[field.code] || '').trim()) {
            return { ok: false, message: '请补全对象“' + objectDef.name + '”中的必填字段“' + field.name + '”。' };
          }
        }
      }
    }
    return { ok: true };
  }

  function filterPendingFillRows(rows, filters) {
    return rows.filter(function (item) {
      return matchCommonFilters(item.templateName, item.weekStart, item.weekEnd, filters);
    });
  }

  function filterReportRows(rows, filters) {
    return rows.filter(function (item) {
      return matchCommonFilters(getTemplate(item.templateId).name, item.weekStart, item.weekEnd, filters);
    });
  }

  function filterViewableRows(rows, filters) {
    return rows.filter(function (item) {
      if (filters.departmentId && getUser(item.userId).departmentId !== filters.departmentId) {
        return false;
      }
      return matchCommonFilters(getTemplate(item.templateId).name, item.weekStart, item.weekEnd, filters);
    });
  }

  function filterTemplateRows(rows, filters) {
    return rows.filter(function (item) {
      if (filters.name && item.name.indexOf(filters.name) < 0) {
        return false;
      }
      if (filters.status && item.status !== filters.status) {
        return false;
      }
      return true;
    });
  }

  function matchCommonFilters(name, start, end, filters) {
    if (filters.name && name.indexOf(filters.name) < 0) {
      return false;
    }
    if (filters.start && start < filters.start) {
      return false;
    }
    if (filters.end && end > filters.end) {
      return false;
    }
    return true;
  }

  function readFilterForm(form) {
    var result = {};
    new FormData(form).forEach(function (value, key) {
      result[key] = String(value || '').trim();
    });
    return result;
  }

  function getHomeStats(user) {
    var rows = getPendingFillRows(user);
    var total = rows.length;
    var done = rows.filter(function (item) { return item.status === 'PENDING' || item.status === 'APPROVED'; }).length;
    return { total: total, done: done, todo: total - done, rate: total ? Math.round((done / total) * 100) : 0 };
  }

  function getPendingFillRows(user) {
    var week = getCurrentWeek();
    return getTemplatesForUser(user).map(function (template) {
      var report = state.reports.find(function (item) {
        return item.userId === user.id && item.templateId === template.id && item.weekStart === week.start && item.weekEnd === week.end;
      });
      return {
        templateId: template.id,
        templateName: template.name,
        weekStart: week.start,
        weekEnd: week.end,
        status: report ? report.status : 'UNCREATED',
        reportId: report ? report.id : '',
        createdAt: report ? report.createdAt : ''
      };
    });
  }

  function getPendingReviewReports(user) {
    return state.reports.filter(function (report) {
      return report.reviewerId === user.id && report.status === 'PENDING';
    }).sort(sortByCreatedDesc);
  }

  function getReportsForUser(userId) {
    return state.reports.filter(function (report) {
      return report.userId === userId;
    }).sort(sortByCreatedDesc);
  }

  function getViewableReports(user) {
    return state.reports.filter(function (report) {
      if (report.status !== 'APPROVED') {
        return false;
      }
      var template = getTemplate(report.templateId);
      var reportUser = getUser(report.userId);
      return isSuperAdmin(user) || (hasAnyRole(user.roleIds, template.viewerRoleIds) && template.departmentScopeIds.indexOf(reportUser.departmentId) >= 0);
    }).sort(sortByCreatedDesc);
  }

  function getDepartmentSummary() {
    var week = getCurrentWeek();
    var rows = state.departments.map(function (department) {
      var planned = 0;
      state.users.filter(function (user) {
        return user.departmentId === department.id && user.status === 'ENABLED';
      }).forEach(function (user) {
        planned += getTemplatesForUser(user).length;
      });
      var approved = state.reports.filter(function (report) {
        return report.status === 'APPROVED' && report.weekStart === week.start && report.weekEnd === week.end && getUser(report.userId).departmentId === department.id;
      }).length;
      return { departmentName: department.name, planned: planned, approved: approved, max: 1 };
    });
    var max = rows.reduce(function (acc, item) { return Math.max(acc, item.planned, item.approved); }, 1);
    rows.forEach(function (item) { item.max = max; });
    return rows;
  }

  function getCurrentWeek() {
    var current = parseDate(state.meta.demoDate);
    var weekday = current.getDay() || 7;
    var start = addDays(formatDate(current), -(weekday - 1));
    return { start: start, end: addDays(start, 6) };
  }

  function getTemplatesForUser(user) {
    return state.templates.filter(function (template) {
      return template.status === 'ENABLED' && hasAnyRole(user.roleIds, template.reporterRoleIds);
    });
  }

  function canEditReport(report) {
    var week = getCurrentWeek();
    return (report.status === 'DRAFT' || report.status === 'RETURNED') && report.weekStart === week.start && report.weekEnd === week.end;
  }

  function getMenuCount(path, user) {
    if (path === 'pending-fill') {
      return getPendingFillRows(user).filter(function (item) {
        return item.status === 'UNCREATED' || item.status === 'DRAFT' || item.status === 'RETURNED';
      }).length;
    }
    if (path === 'pending-review') {
      return getPendingReviewReports(user).length;
    }
    return '';
  }

  function getRole(id) { return state.roles.find(function (item) { return item.id === id; }); }
  function getDepartment(id) { return state.departments.find(function (item) { return item.id === id; }); }
  function getTemplate(id) { return state.templates.find(function (item) { return item.id === id; }); }
  function getReport(id) { return state.reports.find(function (item) { return item.id === id; }); }

  function getDepartmentName(id) { var item = getDepartment(id); return item ? item.name : ''; }
  function getUserName(id) { var item = getUser(id); return item ? item.name : ''; }
  function getRoleNames(ids) {
    return (ids || []).map(function (id) {
      var role = getRole(id);
      return role ? role.name : id;
    });
  }

  function getVisibleMenus(user) {
    return core.sortMenus(state.menus).filter(function (menu) {
      return isSuperAdmin(user) || hasAnyRole(user.roleIds, menu.roleIds);
    });
  }

  function syncTabsWithMenus(menus) {
    var paths = menus.map(function (item) { return item.path; });
    ui.tabs = ui.tabs.filter(function (tab) {
      return tab.type !== 'menu' || paths.indexOf(tab.path) >= 0;
    });
    if (!ui.tabs.length) {
      ui.tabs.push({ id: paths[0], type: 'menu', path: paths[0], title: getPageTitle(paths[0]) });
    }
    if (!ui.tabs.some(function (tab) { return tab.id === ui.activeTabId; })) {
      ui.activeTabId = ui.tabs[0].id;
    }
    if (paths.indexOf(ui.page) >= 0 && !ui.tabs.some(function (tab) { return tab.type === 'menu' && tab.path === ui.page; })) {
      ui.tabs.push({ id: ui.page, type: 'menu', path: ui.page, title: getPageTitle(ui.page) });
    }
  }

  function openMenuTab(path) {
    var tab = ui.tabs.find(function (item) { return item.type === 'menu' && item.path === path; });
    if (!tab) {
      tab = { id: path, type: 'menu', path: path, title: getPageTitle(path) };
      ui.tabs.push(tab);
    }
    ui.page = path;
    ui.activeTabId = tab.id;
  }

  function upsertWorkspaceTab(tab) {
    var found = ui.tabs.find(function (item) { return item.id === tab.id; });
    if (!found) {
      ui.tabs.push(tab);
    } else {
      Object.assign(found, tab);
    }
    ui.activeTabId = tab.id;
    ui.page = tab.basePath || tab.path;
    render();
  }

  function activateTab(tabId) {
    var tab = ui.tabs.find(function (item) { return item.id === tabId; });
    if (!tab) {
      return;
    }
    ui.activeTabId = tab.id;
    ui.page = tab.basePath || tab.path;
    if (tab.type === 'menu') {
      window.location.hash = '#' + tab.path;
    } else {
      render();
    }
  }

  function closeTab(tabId, skipRender) {
    if (ui.tabs.length <= 1) {
      return;
    }
    var index = ui.tabs.findIndex(function (tab) { return tab.id === tabId; });
    if (index < 0) {
      return;
    }
    ui.tabs.splice(index, 1);
    if (ui.activeTabId === tabId) {
      var fallback = ui.tabs[Math.max(0, index - 1)];
      ui.activeTabId = fallback.id;
      ui.page = fallback.basePath || fallback.path;
      if (fallback.type === 'menu') {
        window.location.hash = '#' + fallback.path;
      } else if (!skipRender) {
        render();
      }
    } else {
      if (!skipRender) {
        render();
      }
    }
  }

  function getActiveTab() {
    return ui.tabs.find(function (tab) { return tab.id === ui.activeTabId; }) || ui.tabs[0];
  }

  function getCurrentNavPath() {
    var activeTab = getActiveTab();
    return activeTab ? (activeTab.basePath || activeTab.path || ui.page) : ui.page;
  }

  function ensurePageAccess() {
    var menus = getVisibleMenus(getCurrentUser());
    if (!menus.some(function (item) { return item.path === ui.page; })) {
      ui.page = menus[0].path;
      window.location.hash = '#' + ui.page;
    }
    if (!ui.tabs.length) {
      openMenuTab(ui.page);
    }
  }

  function createEmptyReport(template, user, week) {
    return {
      id: '',
      templateId: template.id,
      templateVersion: template.version,
      userId: user.id,
      reviewerId: '',
      status: 'DRAFT',
      weekStart: week.start,
      weekEnd: week.end,
      createdAt: state.meta.demoDate + ' 10:00:00',
      submittedAt: '',
      reviewedAt: '',
      reviewerOpinion: '',
      sections: template.objects.map(function (objectDef) {
        return {
          objectId: objectDef.id,
          rows: objectDef.required ? [{ id: generateId('ROW'), values: createEmptyValues(objectDef.fields) }] : []
        };
      })
    };
  }

  function createEmptyValues(fields) {
    var result = {};
    fields.forEach(function (field) {
      result[field.code] = field.defaultValue || '';
    });
    return result;
  }

  function createEmptyObject(index) {
    return { id: generateId('OBJ'), code: 'OBJ_' + index, name: '新对象' + index, orderNo: index, description: '', required: true, fields: [createEmptyField(1)] };
  }

  function createEmptyField(index) {
    return { code: 'FIELD_' + index, name: '新字段' + index, dataType: 'STRING', controlType: 'TEXT', required: true, defaultValue: '', dictTypeCode: '', orderNo: index };
  }

  function findReportSection(report, objectId) {
    return report.sections.find(function (item) { return item.objectId === objectId; }) || { objectId: objectId, rows: [] };
  }

  function displayFieldValue(field, value) {
    if (field.controlType === 'SELECT' && field.dictTypeCode) {
      return getDictLabel(field.dictTypeCode, value) || value;
    }
    return value || '-';
  }

  function getDictOptions(typeCode, currentValue) {
    var dict = state.dictionaries.find(function (item) { return item.typeCode === typeCode; });
    if (!dict) {
      return '<option value="">无字典数据</option>';
    }
    return dict.items.filter(function (item) {
      return item.status === 'ENABLED';
    }).sort(function (a, b) {
      return a.orderNo - b.orderNo;
    }).map(function (item) {
      return '<option value="' + escapeHtml(item.code) + '"' + selectedAttr(item.code === currentValue) + '>' + escapeHtml(item.name) + '</option>';
    }).join('');
  }

  function getDictLabel(typeCode, code) {
    var dict = state.dictionaries.find(function (item) { return item.typeCode === typeCode; });
    if (!dict) {
      return code;
    }
    var item = dict.items.find(function (entry) { return entry.code === code; });
    return item ? item.name : code;
  }

  function getControlOptions(dataType) {
    if (dataType === 'DATE') {
      return [{ value: 'DATE', label: '日期' }];
    }
    if (dataType === 'NUMBER') {
      return [{ value: 'TEXT', label: '数字输入框' }];
    }
    return [
      { value: 'TEXT', label: '单行文本' },
      { value: 'TEXTAREA', label: '多行文本' },
      { value: 'SELECT', label: '下拉单选' }
    ];
  }

  function getPageTitle(page) {
    var menu = state.menus.find(function (item) { return item.path === page; });
    return menu ? menu.name : '周报管理系统';
  }

  function getConfigTitle(entityType) {
    return {
      user: '用户信息',
      department: '部门信息',
      dictionary: '数据字典',
      role: '角色信息',
      menu: '菜单信息'
    }[entityType] || '';
  }

  function renderCheckGroup(label, values, key, options) {
    return '<div class="field"><label>' + escapeHtml(label) + '</label><div class="multi-check">' + options.map(function (item) {
      return '<label class="check-item"><input type="checkbox" ' + (values.indexOf(item.id) >= 0 ? 'checked' : '') + ' data-check-key="' + escapeHtml(key) + '" data-check-value="' + escapeHtml(item.id) + '" /><span>' + escapeHtml(item.name || item.typeName) + '</span></label>';
    }).join('') + '</div></div>';
  }

  function renderBoundField(label, value, bindings, controlType, placeholder) {
    return '<div class="field"><label>' + escapeHtml(label) + '</label>' + (controlType === 'textarea'
      ? '<textarea ' + boundAttrs(bindings) + ' placeholder="' + escapeHtml(placeholder || '') + '">' + escapeHtml(value || '') + '</textarea>'
      : '<input ' + boundAttrs(bindings) + ' type="text" value="' + escapeHtml(value || '') + '" placeholder="' + escapeHtml(placeholder || '') + '" />') + '</div>';
  }

  function renderBoundSelect(label, value, bindings, options) {
    return '<div class="field"><label>' + escapeHtml(label) + '</label>' + boundSelect(value, bindings, options) + '</div>';
  }

  function boundInput(value, bindings) {
    return '<input class="report-input" ' + boundAttrs(bindings) + ' type="text" value="' + escapeHtml(value || '') + '" />';
  }

  function configInput(value, bindings) {
    return '<input class="report-input" ' + boundAttrs(bindings) + ' type="text" value="' + escapeHtml(value || '') + '" />';
  }

  function boundSelect(value, bindings, options) {
    return '<select class="report-select" ' + boundAttrs(bindings) + '>' + options.map(function (item) {
      return '<option value="' + escapeHtml(item.value) + '"' + selectedAttr(item.value === value) + '>' + escapeHtml(item.label) + '</option>';
    }).join('') + '</select>';
  }

  function configSelect(value, bindings, options) {
    return boundSelect(value, bindings, options);
  }

  function boundAttrs(bindings) {
    return Object.keys(bindings).map(function (key) {
      return 'data-bind-' + camelToKebab(key) + '="' + escapeHtml(String(bindings[key])) + '"';
    }).join(' ');
  }

  function inputField(label, name, value, placeholder, type) {
    return '<div class="field"><label for="' + escapeHtml(name) + '">' + escapeHtml(label) + '</label><input id="' + escapeHtml(name) + '" name="' + escapeHtml(name) + '" value="' + escapeHtml(value || '') + '" placeholder="' + escapeHtml(placeholder || '') + '" type="' + escapeHtml(type || 'text') + '" /></div>';
  }

  function selectField(label, name, value, options) {
    return '<div class="field"><label for="' + escapeHtml(name) + '">' + escapeHtml(label) + '</label><select id="' + escapeHtml(name) + '" name="' + escapeHtml(name) + '">' + options.map(function (item) {
      return '<option value="' + escapeHtml(item.value) + '"' + selectedAttr(item.value === value) + '>' + escapeHtml(item.label) + '</option>';
    }).join('') + '</select></div>';
  }

  function hasTemplateBinding(target) {
    return Array.prototype.some.call(target.attributes, function (attr) {
      return attr.name === 'data-bind-root' || attr.name.indexOf('data-bind-object-') === 0 || attr.name.indexOf('data-bind-field-') === 0;
    });
  }

  function hasConfigBinding(target) {
    return Array.prototype.some.call(target.attributes, function (attr) {
      return attr.name.indexOf('data-bind-config-') === 0 || attr.name.indexOf('data-bind-dict-') === 0;
    });
  }

  function selectedAttr(condition) { return condition ? ' selected' : ''; }
  function statusText(status) { return { DRAFT: '草稿', PENDING: '待审核', RETURNED: '已退回', APPROVED: '已审核', UNCREATED: '未创建' }[status] || status; }
  function sortByCreatedDesc(a, b) { return String(b.createdAt || '').localeCompare(String(a.createdAt || '')); }
  function parseDate(value) { return new Date(value + 'T00:00:00'); }
  function formatDate(date) { return date.toISOString().slice(0, 10); }
  function addDays(dateStr, amount) { var date = parseDate(dateStr); date.setDate(date.getDate() + amount); return formatDate(date); }
  function getWeekLabel(start, end) { return start + ' 至 ' + end; }
  function isWeekend(dateStr) { var day = parseDate(dateStr).getDay(); return day === 0 || day === 6; }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function isSuperAdmin(user) { return user.roleIds.indexOf('ROLE_SUPER_ADMIN') >= 0; }
  function hasAnyRole(userRoleIds, targetRoleIds) { return targetRoleIds.some(function (roleId) { return userRoleIds.indexOf(roleId) >= 0; }); }
  function toggleArrayValue(list, value, checked) { var index = list.indexOf(value); if (checked && index < 0) { list.push(value); } if (!checked && index >= 0) { list.splice(index, 1); } }
  function generateId(prefix) { return prefix + '_' + Math.random().toString(36).slice(2, 8).toUpperCase(); }
  function deepClone(value) { return JSON.parse(JSON.stringify(value)); }
  function persist() { window.demoStore.saveState(state); }
  function camelToKebab(value) { return value.replace(/[A-Z]/g, function (match) { return '-' + match.toLowerCase(); }); }
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isReporterRole(role) { return role.code.indexOf('REPORTER') >= 0; }
})();
