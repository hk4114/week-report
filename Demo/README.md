# 周报管理系统 Demo

基于 Flask + Jinja2 + AdminLTE + Chart.js + Select2 的高保真可交互原型系统

## 技术栈

- **后端**: Flask (Python Web框架)
- **模板引擎**: Jinja2
- **前端框架**: AdminLTE (基于Bootstrap)
- **图表库**: Chart.js
- **下拉选择**: Select2
- **样式**: Tailwind CSS (与Demo-Ref保持一致)

## 项目结构

```
Demo/
├── app.py                 # Flask主应用文件
├── requirements.txt       # Python依赖包
├── README.md             # 项目说明
├── static/               # 静态文件目录
│   ├── css/             # 样式文件
│   ├── js/              # JavaScript文件
│   └── images/          # 图片资源
└── templates/           # 模板文件目录
    ├── base.html        # 基础模板
    ├── auth/            # 认证相关页面
    ├── dashboard/       # 系统首页
    ├── reports/         # 周报管理页面
    ├── templates/       # 模板管理页面
    ├── admin/           # 系统管理页面
    └── settings/        # 系统设置页面
```

## 功能模块

### 1. 用户认证
- 登录/退出功能
- 用户会话管理

### 2. 系统首页
- 统计数据展示
- 部门周报统计图表
- 系统公告
- 待办事项

### 3. 周报管理
- 待我填报
- 我填报的周报
- 待我审核
- 周报查看

### 4. 模板管理
- 周报模板列表
- 新增周报模板

### 5. 系统管理
- 用户管理
- 部门管理
- 数据字典
- 角色管理
- 菜单管理

### 6. 系统设置
- 系统公告
- 操作日志

## 安装和运行

1. 安装依赖:
```bash
pip install -r requirements.txt
```

2. 运行应用:
```bash
python app.py
```

3. 访问系统:
打开浏览器访问 http://localhost:5000

## 演示账号

- 用户名: admin
- 密码: admin

## 注意事项

- 这是一个演示原型，不包含真实的数据库操作
- 所有数据都是模拟数据，重启应用后会重置
- 界面样式严格参考 Demo-Ref 目录中的原型设计