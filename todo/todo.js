// ── 主题切换 ──
(function() {
    const toggle = document.querySelector('.theme-toggle');
    const icon = toggle.querySelector('span');
    const root = document.documentElement;
    const themeColor = document.querySelector('meta[name="theme-color"]');

    function sync() {
        const isLight = root.dataset.theme === 'light';
        icon.textContent = isLight ? '☀️' : '🌙';
        toggle.setAttribute('aria-label', isLight ? '切换为深色主题' : '切换为浅色主题');
        themeColor.setAttribute('content', isLight ? '#f6f7fb' : '#101521');
    }

    toggle.addEventListener('click', () => {
        root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
        try { localStorage.setItem('theme', root.dataset.theme); } catch {}
        sync();
    });

    sync();
})();

// ── 待办核心逻辑 ──
(function() {
    'use strict';

    const STORAGE_KEY = 'zm-todo:v1';
    const PRIORITY_LABEL = { 0: '', 1: '低', 2: '中', 3: '高' };

    // DOM refs
    const form = document.getElementById('todoForm');
    const input = document.getElementById('todoInput');
    const prioritySelect = document.getElementById('prioritySelect');
    const list = document.getElementById('todoList');
    const emptyState = document.getElementById('emptyState');
    const remainCount = document.getElementById('remainCount');
    const clearDoneBtn = document.getElementById('clearDoneBtn');
    const tabs = document.querySelectorAll('.tab');

    let items = load();
    let filter = 'all';

    // ── 数据持久化 ──
    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch (e) {
            console.warn('保存失败（localStorage 不可用）:', e);
        }
    }

    // ── 渲染 ──
    function visibleItems() {
        const sorted = [...items].sort((a, b) => {
            if (a.done !== b.done) return a.done ? 1 : -1;
            if (b.priority !== a.priority) return b.priority - a.priority;
            return a.createdAt - b.createdAt;
        });
        if (filter === 'all') return sorted;
        const done = filter === 'done';
        return sorted.filter((it) => it.done === done);
    }

    function render() {
        const visible = visibleItems();
        list.textContent = '';

        visible.forEach((it) => {
            const li = document.createElement('li');
            li.className = 'todo-item' + (it.done ? ' is-done' : '');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'todo-check';
            checkbox.checked = it.done;
            checkbox.setAttribute('aria-label', it.done ? '标记为未完成' : '标记为已完成');
            checkbox.addEventListener('change', () => {
                it.done = checkbox.checked;
                save();
                render();
            });

            const text = document.createElement('span');
            text.className = 'todo-text';
            text.textContent = it.text;
            text.title = '双击编辑';
            text.addEventListener('dblclick', () => startEdit(li, it));

            const priority = document.createElement('span');
            if (it.priority > 0) {
                priority.className = 'priority-tag p' + it.priority;
                priority.textContent = PRIORITY_LABEL[it.priority];
            }

            const del = document.createElement('button');
            del.type = 'button';
            del.className = 'todo-delete';
            del.setAttribute('aria-label', '删除：' + it.text);
            del.textContent = '✕';
            del.addEventListener('click', () => {
                items = items.filter((x) => x.id !== it.id);
                save();
                render();
            });

            li.append(checkbox, text, priority, del);
            list.appendChild(li);
        });

        renderEmptyState(visible.length);
        renderFooter();
        renderTabs();
    }

    function renderEmptyState(count) {
        if (count > 0) {
            emptyState.classList.add('is-hidden');
            return;
        }
        emptyState.classList.remove('is-hidden');
        emptyState.textContent =
            filter === 'all' ? '暂无待办，先添加一件吧 ✨'
            : filter === 'active' ? '没有进行中的待办 🎉'
            : '还没有已完成的待办';
    }

    function renderFooter() {
        const remaining = items.filter((it) => !it.done).length;
        const doneCount = items.length - remaining;
        remainCount.textContent = `${remaining} 项待办 · 已完成 ${doneCount} 项`;
        clearDoneBtn.disabled = doneCount === 0;
    }

    function renderTabs() {
        tabs.forEach((tab) => {
            const active = tab.dataset.filter === filter;
            tab.classList.toggle('is-active', active);
            tab.setAttribute('aria-selected', active ? 'true' : 'false');
        });
    }

    // ── 添加 ──
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        items.push({
            id: Date.now(),
            text,
            done: false,
            priority: parseInt(prioritySelect.value, 10) || 0,
            createdAt: Date.now(),
        });
        input.value = '';
        prioritySelect.value = '2';
        save();
        render();
        input.focus();
    });

    // ── 筛选 ──
    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            filter = tab.dataset.filter;
            render();
        });
    });

    // ── 清除已完成 ──
    clearDoneBtn.addEventListener('click', () => {
        items = items.filter((it) => !it.done);
        save();
        render();
    });

    // ── 行内编辑 ──
    function startEdit(li, item) {
        const textEl = li.querySelector('.todo-text');
        if (!textEl || li.querySelector('.todo-edit')) return;

        const editor = document.createElement('input');
        editor.type = 'text';
        editor.className = 'todo-edit';
        editor.value = item.text;
        editor.maxLength = 200;

        textEl.replaceWith(editor);
        editor.focus();
        editor.setSelectionRange(editor.value.length, editor.value.length);

        let done = false;
        const commit = () => {
            if (done) return;
            done = true;
            const value = editor.value.trim();
            if (value) {
                item.text = value;
                save();
            }
            render();
        };

        editor.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') commit();
            else if (e.key === 'Escape') { done = true; render(); }
        });
        editor.addEventListener('blur', commit);
    }

    // ── 初始渲染 ──
    render();
})();
