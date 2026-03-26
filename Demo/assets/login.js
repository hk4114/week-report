(function () {
  var state = window.demoStore.ensureData();
  var session = window.demoStore.getSession();

  if (session && session.currentUserId) {
    var currentUser = state.users.find(function (item) {
      return item.id === session.currentUserId;
    });
    window.location.href = './index.html#' + getLandingPage(currentUser);
  }

  var demoAccountList = document.getElementById('demoAccountList');
  var loginForm = document.getElementById('loginForm');
  var resetDemoBtn = document.getElementById('resetDemoBtn');

  var accountNotes = {
    ADMIN001: '全量菜单与配置能力',
    E1001: '体验待我填报、草稿暂存、还原上周',
    M2001: '体验待我审核、审核通过/退回',
    V3001: '体验周报查看和权限范围'
  };

  renderAccounts();

  loginForm.addEventListener('submit', function (event) {
    event.preventDefault();
    var formData = new FormData(loginForm);
    var employeeNo = String(formData.get('employeeNo') || '').trim().toUpperCase();
    var password = String(formData.get('password') || '').trim();
    var result = window.demoCore.authenticate(state, employeeNo, password);

    if (!result.ok) {
      window.alert(result.error);
      return;
    }

    window.demoStore.setSession({
      currentUserId: result.user.id,
      loginAt: new Date().toISOString()
    });
    window.location.href = './index.html#' + getLandingPage(result.user);
  });

  resetDemoBtn.addEventListener('click', function () {
    var confirmed = window.confirm('确定重置本地演示数据吗？重置后会清空当前的模拟操作结果。');
    if (!confirmed) {
      return;
    }
    window.demoStore.resetState();
    state = window.demoStore.ensureData();
    window.alert('演示数据已重置');
    renderAccounts();
  });

  demoAccountList.addEventListener('click', function (event) {
    var button = event.target.closest('[data-account]');
    if (!button) {
      return;
    }
    var account = button.getAttribute('data-account');
    var password = button.getAttribute('data-password');
    document.getElementById('employeeNo').value = account;
    document.getElementById('password').value = password;
  });

  function renderAccounts() {
    var preferredOrder = ['ADMIN001', 'E1001', 'M2001', 'V3001'];
    var users = preferredOrder
      .map(function (id) {
        return state.users.find(function (item) {
          return item.id === id;
        });
      })
      .filter(Boolean);

    demoAccountList.innerHTML = users
      .map(function (user) {
        return (
          '<article class="demo-account">' +
          '<div>' +
          '<h4>' + escapeHtml(user.name) + ' / ' + escapeHtml(user.employeeNo) + '</h4>' +
          '<p>' + escapeHtml(accountNotes[user.id] || '演示账号') + '</p>' +
          '</div>' +
          '<button class="btn btn-secondary" type="button" data-account="' + escapeHtml(user.employeeNo) + '" data-password="' + escapeHtml(user.password) + '">填入账号</button>' +
          '</article>'
        );
      })
      .join('');
  }

  function getLandingPage(user) {
    if (!user) {
      return 'profile';
    }
    if (user.roleIds.indexOf('ROLE_SUPER_ADMIN') >= 0 || user.roleIds.indexOf('ROLE_SYSTEM_ADMIN') >= 0) {
      return 'template-management';
    }
    return 'profile';
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
})();
