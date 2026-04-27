<?php
require_once __DIR__ . '/../admin/auth.php';
require_login();
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>工程調整ボード</title>
    <style>
        :root {
            --bg-color: #f7f9fc;
            --surface: #ffffff;
            --text-main: #2d3748;
            --text-sub: #718096;
            --primary: #4f46e5;
            --primary-hover: #4338ca;
            --danger: #ef4444;
            --success: #10b981;
            --warning: #f59e0b;
            --border: #e2e8f0;
            --radius-lg: 16px;
            --radius-md: 12px;
            --radius-sm: 8px;
            --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            --shadow-float: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-main);
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
        }

        .app-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 24px;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 32px;
        }

        .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin: 0;
            letter-spacing: -0.5px;
        }

        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 12px 24px;
            font-size: 15px;
            font-weight: 600;
            border-radius: var(--radius-md);
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
        }

        .btn-primary {
            background-color: var(--primary);
            color: white;
            box-shadow: var(--shadow-sm);
        }

        .btn-primary:hover {
            background-color: var(--primary-hover);
            transform: translateY(-1px);
            box-shadow: var(--shadow-md);
        }

        .btn-outline {
            background-color: transparent;
            color: var(--text-main);
            border: 1px solid var(--border);
        }

        .btn-outline:hover {
            background-color: rgba(0,0,0,0.02);
        }

        /* Stats Row */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 32px;
        }

        .stat-card {
            background: var(--surface);
            padding: 20px;
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-sm);
            border: 1px solid var(--border);
            display: flex;
            flex-direction: column;
        }

        .stat-label {
            font-size: 13px;
            color: var(--text-sub);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }

        .stat-value {
            font-size: 32px;
            font-weight: 700;
            color: var(--text-main);
            line-height: 1;
        }

        /* Projects List */
        .projects-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
            gap: 20px;
        }

        .project-card {
            background: var(--surface);
            border-radius: var(--radius-lg);
            padding: 24px;
            border: 1px solid var(--border);
            box-shadow: var(--shadow-sm);
            transition: all 0.2s ease;
            position: relative;
            cursor: pointer;
            text-decoration: none;
            color: inherit;
            display: block;
        }

        .project-card:hover {
            transform: translateY(-4px);
            box-shadow: var(--shadow-float);
            border-color: #cbd5e1;
        }

        .project-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 16px;
        }

        .project-title {
            font-size: 18px;
            font-weight: 700;
            margin: 0;
            line-height: 1.3;
        }

        .badge {
            padding: 4px 10px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 600;
        }

        .badge.planning { background: #e0e7ff; color: #3730a3; }
        .badge.in_progress { background: #dcfce7; color: #166534; }
        .badge.delayed { background: #fee2e2; color: #991b1b; }
        .badge.completed { background: #f3f4f6; color: #4b5563; }

        .project-meta {
            font-size: 14px;
            color: var(--text-sub);
            display: flex;
            gap: 16px;
            margin-bottom: 20px;
        }

        .project-meta span {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        /* Progress bar (Visual dummy for now, calculated later) */
        .progress-track {
            height: 6px;
            background: #f1f5f9;
            border-radius: 3px;
            overflow: hidden;
            margin-bottom: 8px;
        }

        .progress-fill {
            height: 100%;
            background: var(--primary);
            border-radius: 3px;
            transition: width 0.3s ease;
        }

        .progress-text {
            font-size: 12px;
            color: var(--text-sub);
            text-align: right;
            font-weight: 600;
        }

        /* Modal */
        .modal-backdrop {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(15, 23, 42, 0.4);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s ease;
        }

        .modal-backdrop.active {
            opacity: 1;
            pointer-events: auto;
        }

        .modal-dialog {
            background: var(--surface);
            border-radius: var(--radius-lg);
            width: 100%;
            max-width: 500px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            transform: translateY(20px) scale(0.95);
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            padding: 32px;
            opacity: 0;
        }

        .modal-backdrop.active .modal-dialog {
            transform: translateY(0) scale(1);
            opacity: 1;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            font-size: 14px;
            font-weight: 600;
            color: var(--text-main);
            margin-bottom: 8px;
        }

        .form-control {
            width: 100%;
            padding: 12px 16px;
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            font-size: 15px;
            color: var(--text-main);
            box-sizing: border-box;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
            background: #f8fafc;
        }

        .form-control:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
            background: white;
        }

        .input-with-action {
            display: flex;
            gap: 8px;
        }
        .btn-action {
            height: 46px; 
            white-space: nowrap;
            padding: 0 16px;
            font-size: 13px;
        }
        .coords-info {
            font-size: 11px;
            color: var(--text-sub);
            margin-top: 4px;
        }

        .modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            margin-top: 32px;
        }

        /* Empty State */
        .empty-state {
            text-align: center;
            padding: 64px 20px;
            color: var(--text-sub);
            background: var(--surface);
            border-radius: var(--radius-lg);
            border: 1px dashed var(--border);
        }

        /* Tooltip style injection */
        .help-icon {
            display: inline-flex; align-items: center; justify-content: center;
            width: 14px; height: 14px; background: #e1e4e8; color: #586069;
            border-radius: 50%; font-size: 10px; font-weight: bold; cursor: help;
            margin-left: 4px; position: relative; transition: all 0.2s ease; vertical-align: middle;
        }
        .help-icon:hover { background: var(--primary); color: white; transform: scale(1.1); }
        [data-tooltip] { position: relative; }
        [data-tooltip]::after {
            content: attr(data-tooltip); position: absolute; bottom: 150%; left: 50%; transform: translateX(-50%) translateY(10px);
            background: rgba(28, 28, 30, 0.95); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); color: #fff;
            padding: 8px 14px; border-radius: 10px; font-size: 12px; line-height: 1.5; white-space: pre-wrap;
            width: max-content; max-width: 250px; z-index: 10000; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            opacity: 0; pointer-events: none; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: 1px solid rgba(255, 255, 255, 0.1);
        }
        [data-tooltip]:hover::after { opacity: 1; transform: translateX(-50%) translateY(0); }
        [data-tooltip]::before {
            content: ''; position: absolute; bottom: 120%; left: 50%; transform: translateX(-50%) translateY(10px);
            border: 6px solid transparent; border-top-color: rgba(28, 28, 30, 0.95); opacity: 0;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); z-index: 10000;
        }
        [data-tooltip]:hover::before { opacity: 1; transform: translateX(-50%) translateY(0); }

        @media (max-width: 768px) {
            .app-container { padding: 16px; }
            .header h1 { font-size: 24px; }
            .projects-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>

<div class="app-container">
    <div class="header">
        <h1>工程調整ボード</h1>
        <div style="display: flex; gap: 12px; align-items:center;">
            <a href="../admin/help.php?mode=spec" class="btn btn-outline" style="padding: 8px 16px;">📚 使い方・仕様書</a>
            <a href="../admin/" class="btn btn-outline" style="padding: 8px 16px;">管理画面へ</a>
            <div style="display: flex; gap: 12px; align-items: center;">
            <button class="btn btn-outline" style="padding: 12px;" onclick="openConfigModal()" title="システム設定">⚙️</button>
            <button class="btn btn-primary" onclick="openModal()">+ 新規案件追加</button>
        </div>
        </div>
    </div>

    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-label">進行中 <span class="help-icon" data-tooltip="工事が進んでいる案件数です。">?</span></div>
            <div class="stat-value" id="stat-progress">0</div>
        </div>
        <div class="stat-card">
            <div class="stat-label" style="color:var(--danger)">遅延警告 <span class="help-icon" data-tooltip="工期が迫っている、または遅れている案件です。">?</span></div>
            <div class="stat-value" id="stat-delayed">0</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">予定・調整中</div>
            <div class="stat-value" id="stat-planning">0</div>
        </div>
        <!-- 完了案件カード -->
        <div class="stat-card">
            <div class="stat-label" style="color:var(--success)">完了</div>
            <div class="stat-value" id="stat-completed" style="color:var(--success)">0</div>
        </div>
    </div>

    <div class="projects-grid" id="projects-container">
        <div class="empty-state">読み込み中...</div>
    </div>
</div>

<!-- New Project Modal -->
<div class="modal-backdrop" id="modal-container">
    <div class="modal-dialog">
        <h2 style="margin-top:0; margin-bottom: 24px; font-size: 20px;">新規案件の作成</h2>
        <form id="new-project-form" onsubmit="saveProject(event)">
            <input type="hidden" id="proj-id" name="id" value="">
            <div class="form-group">
                <label>案件タイトル</label>
                <input type="text" id="proj-title" name="title" class="form-control" placeholder="例: 〇〇様邸 新築工事" required autocomplete="off">
            </div>
            <div class="form-group">
                <label>工事種別</label>
                <select id="proj-type" name="type" class="form-control">
                    <option value="新築">新築</option>
                    <option value="リフォーム">リフォーム</option>
                    <option value="外構">外構</option>
                    <option value="解体">解体</option>
                    <option value="その他">その他</option>
                </select>
            </div>
            <div class="form-group">
                <label>ステータス</label>
                <select id="proj-status" name="status" class="form-control">
                    <option value="planning">調整中 (Planning)</option>
                    <option value="in_progress">進行中 (In Progress)</option>
                    <option value="delayed">遅延 (Delayed)</option>
                    <option value="completed">完了 (Completed)</option>
                </select>
            </div>
            <div style="margin-top:24px; padding-top:16px; border-top: 1px solid var(--border);">
                <label style="font-size:14px; font-weight:700; color:var(--text-sub); display:block; margin-bottom:12px;">施工場所設定 (天気予報用)</label>
                
                <div class="form-group">
                    <label>郵便番号</label>
                    <div class="input-with-action">
                        <input type="text" id="proj-zip" class="form-control" placeholder="例: 9970000" maxlength="7">
                        <button type="button" class="btn btn-outline btn-action" onclick="lookupZip()">住所を検索</button>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>現場住所・名称</label>
                    <div class="input-with-action">
                        <input type="text" id="proj-location" name="location_name" class="form-control" placeholder="例: 鶴岡市下名川">
                        <button type="button" class="btn btn-outline btn-action" onclick="lookupCoords()">座標を取得</button>
                    </div>
                </div>

                <div class="form-group">
                    <button type="button" class="btn btn-outline btn-action" style="width:100%;" onclick="getGPS()">📍 現在地を取得(GPS)</button>
                    <div id="gps-status" class="coords-info" style="text-align:center;">座標未設定</div>
                    <input type="hidden" id="proj-lat" name="lat" value="">
                    <input type="hidden" id="proj-lon" name="lon" value="">
                </div>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn btn-outline" onclick="closeModal()">キャンセル</button>
                <button type="submit" class="btn btn-primary" id="btn-save">作成</button>
            </div>
        </form>
    </div>
</div>

<!-- Config Modal -->
<div class="modal-backdrop" id="config-modal-container">
    <div class="modal-dialog">
        <h2 style="margin-top:0; margin-bottom: 24px; font-size: 20px;">システム設定</h2>
        <form onsubmit="saveConfig(event)">
            <div class="form-group">
                <label><input type="checkbox" id="conf-weather"> デフォルトで天気予報を有効にする</label>
            </div>
            <div class="form-group">
                <label><input type="checkbox" id="conf-adjustment"> デフォルトで工程調整を有効にする</label>
            </div>

            <hr style="border:0; border-top:1px solid var(--border); margin:20px 0;">
            <h3 style="font-size:14px; margin-bottom:12px;">メール通知設定</h3>
            
            <div class="form-group">
                <label><input type="checkbox" id="conf-notify-enabled"> 新しい希望が入ったらメール通知する</label>
            </div>
            <div class="form-group">
                <label>通知先メールアドレス (カンマ区切りで複数可)</label>
                <input type="text" id="conf-notify-emails" class="form-control" placeholder="example@mail.com, admin@web.com">
            </div>
            <div class="modal-actions">
                <button type="button" class="btn btn-outline" onclick="closeConfigModal()">キャンセル</button>
                <button type="submit" class="btn btn-primary">保存</button>
            </div>
        </form>
    </div>
</div>

<script>
    const API_URL = 'api/api.php';
    // --- System Config ---
    let globalConfig = { features: { weather: true, adjustment: true } };

    async function fetchConfig() {
        try {
            const res = await fetch('api/api.php?action=get_config');
            const result = await res.json();
            if (result.status === 'success') {
                globalConfig = result.data;
            }
        } catch (e) {
            console.error('Config load error:', e);
        }
    }

    function openConfigModal() {
        document.getElementById('conf-weather').checked = globalConfig.features.weather;
        document.getElementById('conf-adjustment').checked = globalConfig.features.adjustment;
        
        const notify = globalConfig.notifications || { enabled: false, emails: '' };
        document.getElementById('conf-notify-enabled').checked = notify.enabled;
        document.getElementById('conf-notify-emails').value = notify.emails;
        
        document.getElementById('config-modal-container').classList.add('active');
    }

    function closeConfigModal() {
        document.getElementById('config-modal-container').classList.remove('active');
    }

    async function saveConfig(e) {
        e.preventDefault();
        const features = {
            weather: document.getElementById('conf-weather').checked,
            adjustment: document.getElementById('conf-adjustment').checked
        };
        const notifications = {
            enabled: document.getElementById('conf-notify-enabled').checked,
            emails: document.getElementById('conf-notify-emails').value
        };
        const formData = new FormData();
        formData.append('action', 'save_config');
        formData.append('config', JSON.stringify({ features, notifications }));

        try {
            const res = await fetch('api/api.php', { method: 'POST', body: formData });
            const result = await res.json();
            if (result.status === 'success') {
                globalConfig.features = features;
                globalConfig.notifications = notifications;
                closeConfigModal();
                alert('システム設定を保存しました。');
            }
        } catch (e) {
            alert('設定の保存に失敗しました');
        }
    }

    // Initialize
    fetchConfig();
    let schedulesData = [];

    async function fetchData() {
        try {
            const res = await fetch(`${API_URL}?action=get_schedules`);
            const json = await res.json();
            if (json.status === 'success') {
                schedulesData = json.data;
                renderProjects();
                updateStats();
            }
        } catch (e) {
            console.error('Error fetching data:', e);
            document.getElementById('projects-container').innerHTML = `<div class="empty-state">データの読み込みに失敗しました</div>`;
        }
    }

    function calculateProgress(tasks) {
        if (!tasks || tasks.length === 0) return 0;
        const completed = tasks.filter(t => t.status === 'done').length;
        return Math.round((completed / tasks.length) * 100);
    }

    function renderProjects() {
        const container = document.getElementById('projects-container');
        if (schedulesData.length === 0) {
            container.innerHTML = `<div class="empty-state">案件がありません。<br>画面右上の「新規案件」から追加してください。</div>`;
            return;
        }

        // Sort: Delayed first, then In Progress, then Planning, then Completed
        const statusOrder = { delayed: 1, in_progress: 2, planning: 3, completed: 4 };
        schedulesData.sort((a, b) => {
            return (statusOrder[a.status] || 9) - (statusOrder[b.status] || 9);
        });

        const statusLabels = {
            planning: '調整中',
            in_progress: '進行中',
            delayed: '遅延',
            completed: '完了'
        };

        const html = schedulesData.map(proj => {
            const progress = calculateProgress(proj.tasks);
            const taskCount = proj.tasks ? proj.tasks.length : 0;
            return `
                <a href="detail.php?id=${proj.id}" class="project-card">
                    <div class="project-header">
                        <h3 class="project-title">${escapeHtml(proj.title)}</h3>
                        <span class="badge ${proj.status}">${statusLabels[proj.status]}</span>
                    </div>
                    <div class="project-meta">
                        <span>🏷️ ${escapeHtml(proj.type)}</span>
                        <span>📋 工程数: ${taskCount}</span>
                    </div>
                    <div>
                        <div class="progress-track">
                            <div class="progress-fill" style="width: ${progress}%" ${progress===100 ? 'background:var(--success)' : ''}></div>
                        </div>
                        <div class="progress-text">${progress}% 完了</div>
                    </div>
                </a>
            `;
        }).join('');

        container.innerHTML = html;
    }

    function updateStats() {
        // 案件のステータス別件数を集計してダッシュボードカードに反映
        const stats = { in_progress: 0, delayed: 0, planning: 0, completed: 0 };
        schedulesData.forEach(p => {
            if (stats[p.status] !== undefined) {
                stats[p.status]++;
            }
        });
        document.getElementById('stat-progress').textContent = stats.in_progress;
        document.getElementById('stat-delayed').textContent = stats.delayed;
        document.getElementById('stat-planning').textContent = stats.planning;
        document.getElementById('stat-completed').textContent = stats.completed;
    }

    /* Modal Handling */
    async function lookupZip() {
        const zip = document.getElementById('proj-zip').value.replace(/-/g, '');
        if (zip.length !== 7) {
            alert('郵便番号は7桁で入力してください。');
            return;
        }
        try {
            const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zip}`);
            const data = await res.json();
            if (data.results) {
                const r = data.results[0];
                const addr = r.address1 + r.address2 + r.address3;
                document.getElementById('proj-location').value = addr;
                // Once address is found, automatically try to get coords
                lookupCoords();
            } else {
                alert('住所が見つかりませんでした。');
            }
        } catch (e) {
            alert('郵便番号検索に失敗しました。');
        }
    }

    async function lookupCoords() {
        const addr = document.getElementById('proj-location').value;
        if (!addr) return;
        
        const status = document.getElementById('gps-status');
        status.textContent = '座標を取得中...';

        try {
            const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(addr)}&count=1&language=ja&format=json`);
            const data = await res.json();
            if (data.results && data.results.length > 0) {
                const r = data.results[0];
                setCoords(r.latitude, r.longitude, r.name);
            } else {
                status.textContent = '座標が見つかりませんでした。手動またはGPSを利用してください。';
            }
        } catch (e) {
            status.textContent = '座標取得に失敗しました。';
        }
    }

    function getGPS() {
        const status = document.getElementById('gps-status');
        if (!navigator.geolocation) {
            alert('お使いのブラウザはGPSに対応していません。');
            return;
        }
        status.textContent = 'GPS信号を受信中...';
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setCoords(pos.coords.latitude, pos.coords.longitude, '現在地(GPS)');
            },
            (err) => {
                alert('位置情報の取得に失敗しました。設定を確認してください。');
                status.textContent = 'GPS取得失敗';
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    }

    function setCoords(lat, lon, label) {
        document.getElementById('proj-lat').value = lat;
        document.getElementById('proj-lon').value = lon;
        document.getElementById('gps-status').textContent = `設定済み: ${label} (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
    }

    function openNewProjectModal() {
        document.getElementById('new-project-form').reset();
        document.getElementById('proj-id').value = '';
        document.getElementById('proj-lat').value = '';
        document.getElementById('proj-lon').value = '';
        document.getElementById('gps-status').textContent = '座標未設定';
        document.getElementById('btn-save').textContent = '作成';
        document.getElementById('modal-container').classList.add('active');
        setTimeout(() => document.getElementById('proj-title').focus(), 100);
    }

    function closeModal() {
        document.getElementById('modal-container').classList.remove('active');
    }

    async function saveProject(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        formData.append('action', 'save_project');
        // 新規作成時はシステムデフォルトを適用
        if (!document.getElementById('proj-id').value) {
            formData.append('features', JSON.stringify(globalConfig.features));
        }

        const btn = document.getElementById('btn-save');
        btn.disabled = true;
        btn.textContent = '保存中...';

        try {
            const res = await fetch(API_URL, { method: 'POST', body: formData });
            const result = await res.json();
            if (result.status === 'success') {
                closeModal();
                fetchData();
            } else {
                alert('保存エラー: ' + result.message);
            }
        } catch (err) {
            alert('通信エラー');
        } finally {
            btn.disabled = false;
        }
    }

    function escapeHtml(unsafe) {
        return (unsafe || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    // Init
    fetchData();
</script>

</body>
</html>
