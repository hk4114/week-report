#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
周报管理系统 Demo - Flask应用主文件
技术栈: Flask + Jinja2 + AdminLTE + Chart.js + Select2
"""

from flask import Flask, render_template, request, jsonify, redirect, url_for, session, flash
import os
import json
from datetime import datetime, timedelta

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'

# 配置静态文件路径
app.static_folder = 'static'
app.template_folder = 'templates'

# 模拟数据
DEMO_DATA = {
    'users': [
        {'id': 1, 'username': 'admin', 'password': 'admin', 'name': '张三', 'role': '项目经理', 'department': '技术部'},
        {'id': 2, 'username': 'user1', 'password': '123456', 'name': '李四', 'role': '开发工程师', 'department': '技术部'},
        {'id': 3, 'username': 'user2', 'password': '123456', 'name': '王五', 'role': '产品经理', 'department': '产品部'},
    ],
    'reports': [
        {
            'id': 1,
            'name': '项目进度周报 - 前端团队',
            'start_date': '2023-06-11',
            'end_date': '2023-06-17',
            'deadline': '2023-06-18',
            'status': '未填报',
            'submitter': '张三',
            'department': '技术部'
        },
        {
            'id': 2,
            'name': '个人周报 - 项目经理',
            'start_date': '2023-06-11',
            'end_date': '2023-06-17',
            'deadline': '2023-06-18',
            'status': '未填报',
            'submitter': '张三',
            'department': '技术部'
        },
        {
            'id': 3,
            'name': '团队建设周报 - 行政部',
            'start_date': '2023-06-11',
            'end_date': '2023-06-17',
            'deadline': '2023-06-19',
            'status': '未填报',
            'submitter': '张三',
            'department': '技术部'
        }
    ],
    'submitted_reports': [
        {
            'id': 1,
            'name': '项目进度周报 - 前端团队',
            'start_date': '2023-06-04',
            'end_date': '2023-06-10',
            'submit_date': '2023-06-11',
            'status': '已审核',
            'submitter': '张三',
            'department': '技术部',
            'reviewer': '王经理',
            'review_comment': '本周工作完成质量较好，进度符合预期。建议下周加强与后端团队的协调配合。'
        },
        {
            'id': 2,
            'name': '个人周报 - 项目经理',
            'start_date': '2023-06-04',
            'end_date': '2023-06-10',
            'submit_date': '2023-06-11',
            'status': '已审核',
            'submitter': '张三',
            'department': '技术部',
            'reviewer': '王经理',
            'review_comment': '工作安排合理，团队管理有效。需要关注项目风险控制。'
        }
    ]
}

@app.route('/')
def index():
    """首页重定向到登录页"""
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    """登录页面"""
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        # 验证用户
        for user in DEMO_DATA['users']:
            if user['username'] == username and user['password'] == password:
                session['user_id'] = user['id']
                session['username'] = user['username']
                session['name'] = user['name']
                session['role'] = user['role']
                session['department'] = user['department']
                return redirect(url_for('dashboard'))
        
        flash('用户名或密码错误', 'error')
    
    return render_template('auth/login.html')

@app.route('/logout')
def logout():
    """退出登录"""
    session.clear()
    return redirect(url_for('login'))

@app.route('/dashboard')
def dashboard():
    """系统首页"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    # 统计数据
    stats = {
        'pending_reports': 5,
        'completed_reports': 12,
        'total_reports': 17,
        'completion_rate': 70
    }
    
    # 部门统计数据
    department_stats = {
        'departments': ['技术部', '产品部', '市场部', '销售部', '行政部', '财务部', '人力资源部'],
        'should_fill': [28, 15, 22, 35, 10, 8, 12],
        'filled': [22, 10, 18, 28, 7, 5, 9]
    }
    
    return render_template('dashboard/index.html', stats=stats, department_stats=department_stats)

@app.route('/reports/pending')
def pending_reports():
    """待我填报"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    return render_template('reports/pending.html', reports=DEMO_DATA['reports'])

@app.route('/reports/my-reports')
def my_reports():
    """我填报的周报"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    return render_template('reports/my_reports.html', reports=DEMO_DATA['submitted_reports'])

@app.route('/reports/pending-review')
def pending_review():
    """待我审核"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    return render_template('reports/pending_review.html', reports=DEMO_DATA['submitted_reports'])

@app.route('/reports/view')
def view_reports():
    """周报查看"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    return render_template('reports/view.html', reports=DEMO_DATA['submitted_reports'])

@app.route('/templates')
def templates_list():
    """周报模板列表"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    return render_template('templates/list.html')

@app.route('/templates/create')
def create_template():
    """新增周报模板"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    return render_template('templates/create.html')

@app.route('/system/users')
def system_users():
    """用户管理"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    return render_template('system/users.html')

@app.route('/system/departments')
def system_departments():
    """部门管理"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    return render_template('system/departments.html')

@app.route('/system/dictionary')
def system_dictionary():
    """数据字典"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    return render_template('system/dictionary.html')

@app.route('/system/roles')
def system_roles():
    """角色管理"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    return render_template('system/roles.html')

@app.route('/system/menus')
def system_menus():
    """菜单管理"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    return render_template('system/menus.html')

@app.route('/settings/announcements')
def settings_announcements():
    """系统公告"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    return render_template('settings/announcements.html')

@app.route('/settings/logs')
def settings_logs():
    """操作日志"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    return render_template('settings/logs.html')

# API接口
@app.route('/api/stats')
def api_stats():
    """统计数据API"""
    return jsonify({
        'pending_reports': 5,
        'completed_reports': 12,
        'total_reports': 17,
        'completion_rate': 70
    })

@app.route('/api/department-stats')
def api_department_stats():
    """部门统计数据API"""
    return jsonify({
        'departments': ['技术部', '产品部', '市场部', '销售部', '行政部', '财务部', '人力资源部'],
        'should_fill': [28, 15, 22, 35, 10, 8, 12],
        'filled': [22, 10, 18, 28, 7, 5, 9]
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)