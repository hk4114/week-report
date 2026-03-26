(function () {
  var STORAGE_KEY = 'weekly-report-demo-state-v2';
  var SESSION_KEY = 'weekly-report-demo-session-v2';

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  var seedData = {
    meta: {
      systemName: '周报管理系统 Demo',
      companyName: '星川信息科技有限公司',
      version: 'V2.0',
      demoDate: '2026-03-22',
      weekdayDemoDate: '2026-03-18',
      lastResetAt: '2026-03-23 11:40:00'
    },
    departments: [
      { id: 'D001', code: 'TECH', name: '技术研发部', status: 'ENABLED' },
      { id: 'D002', code: 'PROD', name: '产品管理部', status: 'ENABLED' },
      { id: 'D003', code: 'ADMIN', name: '行政人事部', status: 'ENABLED' },
      { id: 'D004', code: 'FIN', name: '财务管理部', status: 'ENABLED' },
      { id: 'D005', code: 'MKT', name: '市场销售部', status: 'ENABLED' }
    ],
    roles: [
      { id: 'ROLE_SUPER_ADMIN', code: 'SUPER_ADMIN', name: '超级管理员', status: 'ENABLED' },
      { id: 'ROLE_SYSTEM_ADMIN', code: 'SYSTEM_ADMIN', name: '系统管理员', status: 'ENABLED' },
      { id: 'ROLE_DEV_REPORTER', code: 'DEV_REPORTER', name: '研发周报填报角色', status: 'ENABLED' },
      { id: 'ROLE_PM_REPORTER', code: 'PM_REPORTER', name: '项目经理填报角色', status: 'ENABLED' },
      { id: 'ROLE_ADMIN_REPORTER', code: 'ADMIN_REPORTER', name: '行政周报填报角色', status: 'ENABLED' },
      { id: 'ROLE_WEEKLY_VIEWER', code: 'WEEKLY_VIEWER', name: '周报查看角色', status: 'ENABLED' },
      { id: 'ROLE_MANAGER', code: 'MANAGER', name: '直属领导角色', status: 'ENABLED' }
    ],
    users: [
      {
        id: 'ADMIN001',
        employeeNo: 'ADMIN001',
        password: 'admin123',
        name: '系统管理员',
        departmentId: 'D001',
        leaderId: '',
        status: 'ENABLED',
        roleIds: ['ROLE_SUPER_ADMIN', 'ROLE_SYSTEM_ADMIN']
      },
      {
        id: 'E1001',
        employeeNo: 'E1001',
        password: '123456',
        name: '张三',
        departmentId: 'D001',
        leaderId: 'M2001',
        status: 'ENABLED',
        roleIds: ['ROLE_DEV_REPORTER', 'ROLE_PM_REPORTER']
      },
      {
        id: 'E1002',
        employeeNo: 'E1002',
        password: '123456',
        name: '王敏',
        departmentId: 'D002',
        leaderId: 'M2001',
        status: 'ENABLED',
        roleIds: ['ROLE_PM_REPORTER']
      },
      {
        id: 'E1003',
        employeeNo: 'E1003',
        password: '123456',
        name: '赵雪',
        departmentId: 'D003',
        leaderId: 'C3001',
        status: 'ENABLED',
        roleIds: ['ROLE_ADMIN_REPORTER']
      },
      {
        id: 'M2001',
        employeeNo: 'M2001',
        password: '123456',
        name: '李四',
        departmentId: 'D001',
        leaderId: 'C3001',
        status: 'ENABLED',
        roleIds: ['ROLE_MANAGER', 'ROLE_WEEKLY_VIEWER']
      },
      {
        id: 'C3001',
        employeeNo: 'C3001',
        password: '123456',
        name: '陈总',
        departmentId: 'D005',
        leaderId: '',
        status: 'ENABLED',
        roleIds: ['ROLE_WEEKLY_VIEWER']
      },
      {
        id: 'V3001',
        employeeNo: 'V3001',
        password: '123456',
        name: '周欣',
        departmentId: 'D005',
        leaderId: 'C3001',
        status: 'ENABLED',
        roleIds: ['ROLE_WEEKLY_VIEWER']
      }
    ],
    menus: [
      {
        id: 'MENU_HOME',
        name: '首页',
        path: 'home',
        orderNo: 1,
        roleIds: [
          'ROLE_SUPER_ADMIN',
          'ROLE_SYSTEM_ADMIN',
          'ROLE_DEV_REPORTER',
          'ROLE_PM_REPORTER',
          'ROLE_ADMIN_REPORTER',
          'ROLE_WEEKLY_VIEWER',
          'ROLE_MANAGER'
        ]
      },
      {
        id: 'MENU_PENDING_FILL',
        name: '待我填报',
        path: 'pending-fill',
        orderNo: 2,
        roleIds: ['ROLE_SUPER_ADMIN', 'ROLE_SYSTEM_ADMIN', 'ROLE_DEV_REPORTER', 'ROLE_PM_REPORTER', 'ROLE_ADMIN_REPORTER']
      },
      {
        id: 'MENU_PENDING_REVIEW',
        name: '待我审核',
        path: 'pending-review',
        orderNo: 3,
        roleIds: ['ROLE_SUPER_ADMIN', 'ROLE_MANAGER']
      },
      {
        id: 'MENU_MY_REPORTS',
        name: '我填报的周报',
        path: 'my-reports',
        orderNo: 4,
        roleIds: ['ROLE_SUPER_ADMIN', 'ROLE_SYSTEM_ADMIN', 'ROLE_DEV_REPORTER', 'ROLE_PM_REPORTER', 'ROLE_ADMIN_REPORTER']
      },
      {
        id: 'MENU_REPORT_VIEW',
        name: '周报查看',
        path: 'report-view',
        orderNo: 5,
        roleIds: ['ROLE_SUPER_ADMIN', 'ROLE_MANAGER', 'ROLE_WEEKLY_VIEWER']
      },
      {
        id: 'MENU_TEMPLATE',
        name: '周报模板管理',
        path: 'template-management',
        orderNo: 6,
        roleIds: ['ROLE_SUPER_ADMIN', 'ROLE_SYSTEM_ADMIN']
      },
      {
        id: 'MENU_USERS',
        name: '用户信息维护',
        path: 'users',
        orderNo: 7,
        roleIds: ['ROLE_SUPER_ADMIN', 'ROLE_SYSTEM_ADMIN']
      },
      {
        id: 'MENU_DEPARTMENTS',
        name: '部门信息维护',
        path: 'departments',
        orderNo: 8,
        roleIds: ['ROLE_SUPER_ADMIN', 'ROLE_SYSTEM_ADMIN']
      },
      {
        id: 'MENU_DICTIONARIES',
        name: '数据字典维护',
        path: 'dictionaries',
        orderNo: 9,
        roleIds: ['ROLE_SUPER_ADMIN', 'ROLE_SYSTEM_ADMIN']
      },
      {
        id: 'MENU_ROLES',
        name: '角色维护',
        path: 'roles',
        orderNo: 10,
        roleIds: ['ROLE_SUPER_ADMIN', 'ROLE_SYSTEM_ADMIN']
      },
      {
        id: 'MENU_MENUS',
        name: '菜单维护',
        path: 'menus',
        orderNo: 11,
        roleIds: ['ROLE_SUPER_ADMIN', 'ROLE_SYSTEM_ADMIN']
      },
      {
        id: 'MENU_PROFILE',
        name: '个人信息',
        path: 'profile',
        orderNo: 12,
        roleIds: [
          'ROLE_SUPER_ADMIN',
          'ROLE_SYSTEM_ADMIN',
          'ROLE_DEV_REPORTER',
          'ROLE_PM_REPORTER',
          'ROLE_ADMIN_REPORTER',
          'ROLE_WEEKLY_VIEWER',
          'ROLE_MANAGER'
        ]
      }
    ],
    dictionaries: [
      {
        id: 'DICT_PROJECT_LIST',
        typeCode: 'PROJECT_LIST',
        typeName: '项目清单',
        status: 'ENABLED',
        items: [
          { code: 'PJT001', name: '星链客户门户项目', orderNo: 1, status: 'ENABLED' },
          { code: 'PJT002', name: '移动办公 App 二期', orderNo: 2, status: 'ENABLED' },
          { code: 'PJT003', name: '财务共享平台升级', orderNo: 3, status: 'ENABLED' }
        ]
      },
      {
        id: 'DICT_PROJECT_STAGE',
        typeCode: 'PROJECT_STAGE',
        typeName: '项目阶段',
        status: 'ENABLED',
        items: [
          { code: 'INIT', name: '立项', orderNo: 1, status: 'ENABLED' },
          { code: 'DEV', name: '开发中', orderNo: 2, status: 'ENABLED' },
          { code: 'TEST', name: '测试中', orderNo: 3, status: 'ENABLED' },
          { code: 'ONLINE', name: '已上线', orderNo: 4, status: 'ENABLED' }
        ]
      },
      {
        id: 'DICT_TASK_STATUS',
        typeCode: 'TASK_STATUS',
        typeName: '任务状态',
        status: 'ENABLED',
        items: [
          { code: 'DONE', name: '已完成', orderNo: 1, status: 'ENABLED' },
          { code: 'DOING', name: '进行中', orderNo: 2, status: 'ENABLED' },
          { code: 'RISK', name: '存在风险', orderNo: 3, status: 'ENABLED' }
        ]
      },
      {
        id: 'DICT_ISSUE_LEVEL',
        typeCode: 'ISSUE_LEVEL',
        typeName: '问题级别',
        status: 'ENABLED',
        items: [
          { code: 'HIGH', name: '高', orderNo: 1, status: 'ENABLED' },
          { code: 'MEDIUM', name: '中', orderNo: 2, status: 'ENABLED' },
          { code: 'LOW', name: '低', orderNo: 3, status: 'ENABLED' }
        ]
      },
      {
        id: 'DICT_ADMIN_TASK_TYPE',
        typeCode: 'ADMIN_TASK_TYPE',
        typeName: '行政任务类型',
        status: 'ENABLED',
        items: [
          { code: 'NOTICE', name: '制度通知', orderNo: 1, status: 'ENABLED' },
          { code: 'MEETING', name: '会议组织', orderNo: 2, status: 'ENABLED' },
          { code: 'SERVICE', name: '员工服务', orderNo: 3, status: 'ENABLED' }
        ]
      }
    ],
    templates: [
      {
        id: 'TPL_DEV',
        code: 'TPL_DEV_WEEKLY',
        name: '研发周报',
        description: '面向研发工程师的自然周工作填报模板',
        status: 'ENABLED',
        version: 1,
        reporterRoleIds: ['ROLE_DEV_REPORTER'],
        viewerRoleIds: ['ROLE_WEEKLY_VIEWER', 'ROLE_SUPER_ADMIN'],
        departmentScopeIds: ['D001'],
        objects: [
          {
            id: 'OBJ_DEV_TASK',
            code: 'DEV_TASK',
            name: '本周研发任务',
            orderNo: 1,
            description: '记录本周完成或推进中的任务',
            required: true,
            fields: [
              { code: 'WORK_ITEM', name: '工作事项', dataType: 'STRING', controlType: 'TEXT', required: true, orderNo: 1, defaultValue: '' },
              { code: 'WORK_HOURS', name: '投入工时', dataType: 'NUMBER', controlType: 'TEXT', required: true, orderNo: 2, defaultValue: '8' },
              { code: 'TASK_STATUS', name: '任务状态', dataType: 'STRING', controlType: 'SELECT', required: true, dictTypeCode: 'TASK_STATUS', orderNo: 3, defaultValue: 'DOING' },
              { code: 'RESULT_DESC', name: '输出结果', dataType: 'STRING', controlType: 'TEXTAREA', required: true, orderNo: 4, defaultValue: '' }
            ]
          },
          {
            id: 'OBJ_DEV_RISK',
            code: 'DEV_RISK',
            name: '问题与风险',
            orderNo: 2,
            description: '记录问题和对应处理计划',
            required: false,
            fields: [
              { code: 'ISSUE_NAME', name: '问题名称', dataType: 'STRING', controlType: 'TEXT', required: true, orderNo: 1, defaultValue: '' },
              { code: 'ISSUE_LEVEL', name: '问题级别', dataType: 'STRING', controlType: 'SELECT', required: true, dictTypeCode: 'ISSUE_LEVEL', orderNo: 2, defaultValue: 'MEDIUM' },
              { code: 'HANDLE_PLAN', name: '处理计划', dataType: 'STRING', controlType: 'TEXTAREA', required: false, orderNo: 3, defaultValue: '' }
            ]
          }
        ]
      },
      {
        id: 'TPL_PM',
        code: 'TPL_PM_WEEKLY',
        name: '项目经理周报',
        description: '面向项目经理的项目进度与协调事项周报',
        status: 'ENABLED',
        version: 1,
        reporterRoleIds: ['ROLE_PM_REPORTER'],
        viewerRoleIds: ['ROLE_WEEKLY_VIEWER', 'ROLE_SUPER_ADMIN'],
        departmentScopeIds: ['D001', 'D002'],
        objects: [
          {
            id: 'OBJ_PM_PROGRESS',
            code: 'PM_PROGRESS',
            name: '项目进度',
            orderNo: 1,
            description: '记录项目本周进展与下周计划',
            required: true,
            fields: [
              { code: 'PROJECT_NAME', name: '项目名称', dataType: 'STRING', controlType: 'SELECT', required: true, dictTypeCode: 'PROJECT_LIST', orderNo: 1, defaultValue: 'PJT001' },
              { code: 'PROJECT_STAGE', name: '项目阶段', dataType: 'STRING', controlType: 'SELECT', required: true, dictTypeCode: 'PROJECT_STAGE', orderNo: 2, defaultValue: 'DEV' },
              { code: 'PROGRESS_PERCENT', name: '完成百分比', dataType: 'NUMBER', controlType: 'TEXT', required: true, orderNo: 3, defaultValue: '50' },
              { code: 'THIS_WEEK_RESULT', name: '本周成果', dataType: 'STRING', controlType: 'TEXTAREA', required: true, orderNo: 4, defaultValue: '' },
              { code: 'NEXT_WEEK_PLAN', name: '下周计划', dataType: 'STRING', controlType: 'TEXTAREA', required: true, orderNo: 5, defaultValue: '' }
            ]
          },
          {
            id: 'OBJ_PM_SUPPORT',
            code: 'PM_SUPPORT',
            name: '协调事项',
            orderNo: 2,
            description: '记录跨部门协调和支持事项',
            required: false,
            fields: [
              { code: 'COLLAB_ITEM', name: '协调事项', dataType: 'STRING', controlType: 'TEXT', required: true, orderNo: 1, defaultValue: '' },
              { code: 'OWNER', name: '责任人', dataType: 'STRING', controlType: 'TEXT', required: true, orderNo: 2, defaultValue: '' },
              { code: 'TARGET_DATE', name: '目标日期', dataType: 'DATE', controlType: 'DATE', required: false, orderNo: 3, defaultValue: '' },
              { code: 'NEED_SUPPORT', name: '需支持内容', dataType: 'STRING', controlType: 'TEXTAREA', required: false, orderNo: 4, defaultValue: '' }
            ]
          }
        ]
      },
      {
        id: 'TPL_ADMIN',
        code: 'TPL_ADMIN_WEEKLY',
        name: '行政服务周报',
        description: '面向行政人事人员的服务类周报',
        status: 'ENABLED',
        version: 1,
        reporterRoleIds: ['ROLE_ADMIN_REPORTER'],
        viewerRoleIds: ['ROLE_WEEKLY_VIEWER', 'ROLE_SUPER_ADMIN'],
        departmentScopeIds: ['D003'],
        objects: [
          {
            id: 'OBJ_ADMIN_WORK',
            code: 'ADMIN_WORK',
            name: '行政服务事项',
            orderNo: 1,
            description: '记录行政服务与执行情况',
            required: true,
            fields: [
              { code: 'WORK_TOPIC', name: '事项主题', dataType: 'STRING', controlType: 'TEXT', required: true, orderNo: 1, defaultValue: '' },
              { code: 'TASK_TYPE', name: '任务类型', dataType: 'STRING', controlType: 'SELECT', required: true, dictTypeCode: 'ADMIN_TASK_TYPE', orderNo: 2, defaultValue: 'SERVICE' },
              { code: 'COMPLETION', name: '完成说明', dataType: 'STRING', controlType: 'TEXTAREA', required: true, orderNo: 3, defaultValue: '' },
              { code: 'SERVICE_SCORE', name: '满意度评分', dataType: 'NUMBER', controlType: 'TEXT', required: false, orderNo: 4, defaultValue: '90' }
            ]
          },
          {
            id: 'OBJ_ADMIN_NOTICE',
            code: 'ADMIN_NOTICE',
            name: '通知追踪',
            orderNo: 2,
            description: '记录发文与反馈情况',
            required: false,
            fields: [
              { code: 'NOTICE_TITLE', name: '通知标题', dataType: 'STRING', controlType: 'TEXT', required: true, orderNo: 1, defaultValue: '' },
              { code: 'PUBLISH_DATE', name: '发布日期', dataType: 'DATE', controlType: 'DATE', required: false, orderNo: 2, defaultValue: '' },
              { code: 'FEEDBACK', name: '反馈情况', dataType: 'STRING', controlType: 'TEXTAREA', required: false, orderNo: 3, defaultValue: '' }
            ]
          }
        ]
      }
    ],
    announcements: [
      {
        id: 'ANN001',
        level: 'IMPORTANT',
        title: '本周周报提交窗口开放至 2026-03-22 23:59',
        content: '本自然周周报仅允许在周六、周日录入和提交。请各部门按要求完成填报。',
        publishDate: '2026-03-20'
      },
      {
        id: 'ANN002',
        level: 'NORMAL',
        title: '模板字段已统一改为对象表格录入模式',
        content: 'Demo 原型中的所有模板均按“数据对象 + 数据项 + 多行表格”统一展示。',
        publishDate: '2026-03-18'
      },
      {
        id: 'ANN003',
        level: 'NEW',
        title: '新增行政服务周报查看示例数据',
        content: '查看角色可在周报查看菜单中浏览已审核数据，范围受模板与部门限制。',
        publishDate: '2026-03-16'
      }
    ],
    reports: [
      {
        id: 'REP_DEV_20260322_E1001',
        templateId: 'TPL_DEV',
        templateVersion: 1,
        userId: 'E1001',
        reviewerId: 'M2001',
        status: 'DRAFT',
        weekStart: '2026-03-16',
        weekEnd: '2026-03-22',
        createdAt: '2026-03-22 10:15:00',
        submittedAt: '',
        reviewedAt: '',
        reviewerOpinion: '',
        sections: [
          {
            objectId: 'OBJ_DEV_TASK',
            rows: [
              {
                id: 'ROW_A1',
                values: {
                  WORK_ITEM: '完成消息中心重构',
                  WORK_HOURS: '18',
                  TASK_STATUS: 'DONE',
                  RESULT_DESC: '完成接口适配与前端联调，已提交测试'
                }
              },
              {
                id: 'ROW_A2',
                values: {
                  WORK_ITEM: '优化首页统计卡片渲染',
                  WORK_HOURS: '10',
                  TASK_STATUS: 'DOING',
                  RESULT_DESC: '完成首版样式和数据聚合逻辑'
                }
              }
            ]
          },
          {
            objectId: 'OBJ_DEV_RISK',
            rows: [
              {
                id: 'ROW_B1',
                values: {
                  ISSUE_NAME: '历史接口返回字段不统一',
                  ISSUE_LEVEL: 'MEDIUM',
                  HANDLE_PLAN: '已与后端确认字段映射方案，计划下周统一改造'
                }
              }
            ]
          }
        ]
      },
      {
        id: 'REP_DEV_20260315_E1001',
        templateId: 'TPL_DEV',
        templateVersion: 1,
        userId: 'E1001',
        reviewerId: 'M2001',
        status: 'APPROVED',
        weekStart: '2026-03-09',
        weekEnd: '2026-03-15',
        createdAt: '2026-03-15 18:20:00',
        submittedAt: '2026-03-15 20:05:00',
        reviewedAt: '2026-03-16 09:20:00',
        reviewerOpinion: '内容完整，问题跟踪清楚。',
        sections: [
          {
            objectId: 'OBJ_DEV_TASK',
            rows: [
              {
                id: 'ROW_C1',
                values: {
                  WORK_ITEM: '完成权限树组件封装',
                  WORK_HOURS: '16',
                  TASK_STATUS: 'DONE',
                  RESULT_DESC: '支持菜单树、角色回显和节点禁用'
                }
              }
            ]
          },
          {
            objectId: 'OBJ_DEV_RISK',
            rows: [
              {
                id: 'ROW_C2',
                values: {
                  ISSUE_NAME: '联调环境不稳定',
                  ISSUE_LEVEL: 'LOW',
                  HANDLE_PLAN: '改用本地模拟数据继续推进页面开发'
                }
              }
            ]
          }
        ]
      },
      {
        id: 'REP_PM_20260315_E1001',
        templateId: 'TPL_PM',
        templateVersion: 1,
        userId: 'E1001',
        reviewerId: 'M2001',
        status: 'APPROVED',
        weekStart: '2026-03-09',
        weekEnd: '2026-03-15',
        createdAt: '2026-03-15 16:40:00',
        submittedAt: '2026-03-15 21:00:00',
        reviewedAt: '2026-03-16 09:30:00',
        reviewerOpinion: '协调事项写得比较具体，可以继续保持。',
        sections: [
          {
            objectId: 'OBJ_PM_PROGRESS',
            rows: [
              {
                id: 'ROW_D1',
                values: {
                  PROJECT_NAME: 'PJT001',
                  PROJECT_STAGE: 'DEV',
                  PROGRESS_PERCENT: '65',
                  THIS_WEEK_RESULT: '完成首页流程评审和核心模块拆解',
                  NEXT_WEEK_PLAN: '推进待我填报和待我审核联动'
                }
              }
            ]
          },
          {
            objectId: 'OBJ_PM_SUPPORT',
            rows: [
              {
                id: 'ROW_D2',
                values: {
                  COLLAB_ITEM: '确认统一登录样式',
                  OWNER: '设计组',
                  TARGET_DATE: '2026-03-17',
                  NEED_SUPPORT: '希望输出完整控件规范'
                }
              }
            ]
          }
        ]
      },
      {
        id: 'REP_PM_20260322_E1002',
        templateId: 'TPL_PM',
        templateVersion: 1,
        userId: 'E1002',
        reviewerId: 'M2001',
        status: 'PENDING',
        weekStart: '2026-03-16',
        weekEnd: '2026-03-22',
        createdAt: '2026-03-22 14:10:00',
        submittedAt: '2026-03-22 21:15:00',
        reviewedAt: '',
        reviewerOpinion: '',
        sections: [
          {
            objectId: 'OBJ_PM_PROGRESS',
            rows: [
              {
                id: 'ROW_E1',
                values: {
                  PROJECT_NAME: 'PJT002',
                  PROJECT_STAGE: 'TEST',
                  PROGRESS_PERCENT: '82',
                  THIS_WEEK_RESULT: '完成测试轮次问题归类并输出上线清单',
                  NEXT_WEEK_PLAN: '推进验收和上线发布准备'
                }
              }
            ]
          },
          {
            objectId: 'OBJ_PM_SUPPORT',
            rows: [
              {
                id: 'ROW_E2',
                values: {
                  COLLAB_ITEM: '接口验收确认',
                  OWNER: '测试负责人',
                  TARGET_DATE: '2026-03-24',
                  NEED_SUPPORT: '需确认剩余 2 个高优问题排期'
                }
              }
            ]
          }
        ]
      },
      {
        id: 'REP_PM_20260315_E1002',
        templateId: 'TPL_PM',
        templateVersion: 1,
        userId: 'E1002',
        reviewerId: 'M2001',
        status: 'APPROVED',
        weekStart: '2026-03-09',
        weekEnd: '2026-03-15',
        createdAt: '2026-03-15 15:10:00',
        submittedAt: '2026-03-15 19:50:00',
        reviewedAt: '2026-03-16 08:50:00',
        reviewerOpinion: '风险识别到位。',
        sections: [
          {
            objectId: 'OBJ_PM_PROGRESS',
            rows: [
              {
                id: 'ROW_F1',
                values: {
                  PROJECT_NAME: 'PJT002',
                  PROJECT_STAGE: 'DEV',
                  PROGRESS_PERCENT: '74',
                  THIS_WEEK_RESULT: '完成任务清单和里程碑同步',
                  NEXT_WEEK_PLAN: '组织测试用例评审'
                }
              }
            ]
          },
          {
            objectId: 'OBJ_PM_SUPPORT',
            rows: []
          }
        ]
      },
      {
        id: 'REP_ADMIN_20260322_E1003',
        templateId: 'TPL_ADMIN',
        templateVersion: 1,
        userId: 'E1003',
        reviewerId: 'C3001',
        status: 'RETURNED',
        weekStart: '2026-03-16',
        weekEnd: '2026-03-22',
        createdAt: '2026-03-22 12:30:00',
        submittedAt: '2026-03-22 18:40:00',
        reviewedAt: '2026-03-22 21:00:00',
        reviewerOpinion: '请补充满意度评分的依据，并完善通知反馈情况。',
        sections: [
          {
            objectId: 'OBJ_ADMIN_WORK',
            rows: [
              {
                id: 'ROW_G1',
                values: {
                  WORK_TOPIC: '员工福利发放',
                  TASK_TYPE: 'SERVICE',
                  COMPLETION: '已完成季度福利券发放',
                  SERVICE_SCORE: '88'
                }
              }
            ]
          },
          {
            objectId: 'OBJ_ADMIN_NOTICE',
            rows: [
              {
                id: 'ROW_G2',
                values: {
                  NOTICE_TITLE: '会议室使用规范',
                  PUBLISH_DATE: '2026-03-20',
                  FEEDBACK: '部分部门反馈执行口径还需统一'
                }
              }
            ]
          }
        ]
      },
      {
        id: 'REP_ADMIN_20260315_E1003',
        templateId: 'TPL_ADMIN',
        templateVersion: 1,
        userId: 'E1003',
        reviewerId: 'C3001',
        status: 'APPROVED',
        weekStart: '2026-03-09',
        weekEnd: '2026-03-15',
        createdAt: '2026-03-15 13:10:00',
        submittedAt: '2026-03-15 17:30:00',
        reviewedAt: '2026-03-15 20:50:00',
        reviewerOpinion: '服务事项梳理清楚。',
        sections: [
          {
            objectId: 'OBJ_ADMIN_WORK',
            rows: [
              {
                id: 'ROW_H1',
                values: {
                  WORK_TOPIC: '新人入职接待',
                  TASK_TYPE: 'SERVICE',
                  COMPLETION: '完成 4 名新人入职安排与物料准备',
                  SERVICE_SCORE: '95'
                }
              }
            ]
          },
          {
            objectId: 'OBJ_ADMIN_NOTICE',
            rows: []
          }
        ]
      }
    ]
  };

  function ensureData() {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData));
      return deepClone(seedData);
    }
    try {
      return JSON.parse(raw);
    } catch (error) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData));
      return deepClone(seedData);
    }
  }

  function getState() {
    return deepClone(ensureData());
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function resetState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData));
    localStorage.removeItem(SESSION_KEY);
  }

  function getSession() {
    var raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  function setSession(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  window.demoStore = {
    STORAGE_KEY: STORAGE_KEY,
    SESSION_KEY: SESSION_KEY,
    seedData: deepClone(seedData),
    deepClone: deepClone,
    ensureData: ensureData,
    getState: getState,
    saveState: saveState,
    resetState: resetState,
    getSession: getSession,
    setSession: setSession,
    clearSession: clearSession
  };
})();
