<?php
require_once __DIR__ . '/../admin/auth.php';
require_login();

$id = $_GET['id'] ?? '';
if (!$id) {
    header('Location: index.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>工程詳細・調整</title>
    <!-- Vue.js could be used, but keeping it Vanilla JS as requested. Sortable JS attached via CDN for drag and drop -->
    <script src="https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js"></script>
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
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-main);
            margin: 0; padding: 0;
            -webkit-font-smoothing: antialiased;
        }

        .app-container { max-width: 800px; margin: 0 auto; padding: 24px; }
        
        .header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; margin-bottom: 24px; gap: 16px;}
        .header h1 { font-size: 24px; margin: 0; font-weight: 700; width: 100%;}
        
        .nav-actions { display: flex; gap: 10px; width: 100%; overflow-x: auto; padding-bottom: 8px; }
        .nav-actions::-webkit-scrollbar { display: none; }

        .btn {
            display: inline-flex; align-items: center; justify-content: center;
            padding: 12px 24px; font-size: 15px; font-weight: 600;
            border-radius: var(--radius-md); border: none; cursor: pointer;
            transition: all 0.2s ease; text-decoration: none; white-space: nowrap;
        }
        .btn-primary { background: var(--primary); color: white; box-shadow: var(--shadow-sm); }
        .btn-outline { background: transparent; border: 1px solid var(--border); color: var(--text-main); }
        .btn-sm { padding: 8px 16px; font-size: 13px; }

        /* Detail Card */
        .info-card {
            background: var(--surface); border-radius: var(--radius-lg); padding: 20px;
            border: 1px solid var(--border); box-shadow: var(--shadow-sm); margin-bottom: 24px;
        }

        /* Task List */
        .task-list { display: flex; flex-direction: column; gap: 12px; }
        
        .task-card {
            background: var(--surface);
            border-radius: var(--radius-lg);
            border: 1px solid var(--border);
            padding: 16px 20px;
            display: flex;
            align-items: center;
            gap: 16px;
            box-shadow: var(--shadow-sm);
            cursor: grab;
            transition: transform 0.2s, box-shadow 0.2s;
            position: relative;
        }

        .task-card:active { cursor: grabbing; transform: scale(0.98); }
        .task-card.sortable-ghost { opacity: 0.4; }

        .drag-handle { color: var(--text-sub); cursor: grab; padding: 8px; font-size: 20px; }

        /* --- 並び替えボタン --- */
        .sort-toolbar {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
            flex-wrap: wrap;
        }
        .sort-toolbar span {
            font-size: 12px;
            color: var(--text-sub);
            font-weight: 600;
            margin-right: 4px;
        }
        .btn-sort {
            padding: 6px 14px;
            font-size: 12px;
            font-weight: 600;
            border-radius: 20px;
            border: 1.5px solid var(--border);
            background: var(--surface);
            color: var(--text-sub);
            cursor: pointer;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }
        .btn-sort:hover { border-color: var(--primary); color: var(--primary); background: #eef2ff; }
        .btn-sort.active { border-color: var(--primary); color: var(--primary); background: #eef2ff; font-weight: 700; }
        .btn-sort.active::after { content: ' ↓'; }
        .btn-sort.active.asc::after { content: ' ↑'; }

        /* フィルタービタン */
        .filter-toolbar {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 16px;
            flex-wrap: wrap;
        }
        .filter-toolbar span {
            font-size: 12px;
            color: var(--text-sub);
            font-weight: 600;
            margin-right: 4px;
        }
        .btn-filter {
            padding: 5px 13px;
            font-size: 12px;
            font-weight: 600;
            border-radius: 20px;
            border: 1.5px solid var(--border);
            background: var(--surface);
            color: var(--text-sub);
            cursor: pointer;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }
        .btn-filter:hover { border-color: var(--primary); color: var(--primary); }
        .btn-filter.active { color: white; border-color: transparent; }
        .btn-filter.active.f-all     { background: var(--text-main); }
        .btn-filter.active.f-pending { background: #94a3b8; }
        .btn-filter.active.f-doing   { background: var(--primary); }
        .btn-filter.active.f-done    { background: var(--success); }

        /* フィルターで隠された行のアニメーション */
        .task-card.hidden-task {
            display: none;
        }
        /* 全件隠された時のメッセージ */
        #filter-empty {
            display: none;
            text-align: center;
            padding: 32px;
            color: var(--text-sub);
            font-size: 14px;
            background: var(--surface);
            border-radius: var(--radius-lg);
            border: 1px dashed var(--border);
        }

        /* 上下移動ボタン */
        .move-btns { display: flex; flex-direction: column; gap: 2px; }
        .btn-move {
            background: none; border: 1px solid var(--border);
            border-radius: 4px; cursor: pointer; padding: 2px 6px;
            font-size: 11px; color: var(--text-sub); line-height: 1.4;
            transition: all 0.15s;
        }
        .btn-move:hover { background: var(--primary); color: white; border-color: var(--primary); }
        .btn-move:disabled { opacity: 0.25; cursor: default; background: none; color: var(--text-sub); border-color: var(--border); }
        
        .task-content { flex: 1; }
        .task-title { font-size: 16px; font-weight: 600; margin: 0 0 4px 0; }
        .task-meta { font-size: 13px; color: var(--text-sub); display: flex; gap: 12px; }

        .task-actions { display: flex; gap: 8px; align-items: center; }

        /* Status Toggles */
        .status-select {
            padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border);
            font-size: 13px; font-weight: 600; background: var(--bg-color); cursor: pointer; outline: none;
        }
        .status-select.pending { color: var(--text-main); }
        .status-select.doing { color: var(--primary); border-color: var(--primary); background: #eef2ff; }
        .status-select.done { color: var(--success); border-color: var(--success); background: #f0fdf4; }

        /* Modal classes reused from index.php */
        .modal-backdrop { position: fixed; top:0; left:0; right:0; bottom:0; background:rgba(15,23,42,0.4); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:100; opacity:0; pointer-events:none; transition:opacity 0.2s; }
        .modal-backdrop.active { opacity:1; pointer-events:auto; }
        .modal-dialog { background:var(--surface); border-radius:var(--radius-lg); width:100%; max-width:500px; padding:32px; transform:translateY(20px); opacity:0; transition:all 0.3s; }
        .modal-backdrop.active .modal-dialog { transform:translateY(0); opacity:1; }
        
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; font-weight: 600; font-size: 14px; margin-bottom: 8px; }
        .form-control { width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 15px; box-sizing: border-box; background: #f8fafc; }
        
        .modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
        .btn-icon { background: none; border: none; cursor: pointer; color: var(--text-sub); padding: 8px; }
        .btn-icon:hover { color: var(--danger); }

        #saving-indicator {
            position: fixed; bottom: 20px; right: 20px; background: var(--text-main); color: white;
            padding: 12px 24px; border-radius: var(--radius-sm); font-size: 14px; font-weight: 600;
            opacity: 0; transform: translateY(20px); transition: all 0.3s; pointer-events: none;
        }
        #saving-indicator.show { opacity: 1; transform: translateY(0); }

        /* Gantt Chart */
        .gantt-container {
            background: var(--surface);
            border-radius: var(--radius-lg);
            padding: 24px;
            border: 1px solid var(--border);
            box-shadow: var(--shadow-sm);
            margin-bottom: 24px;
            overflow-x: auto;
        }
        .gantt-grid {
            display: grid;
            gap: 8px 0;
            min-width: 600px;
        }
        .gantt-header {
            display: grid;
            font-size: 11px;
            color: var(--text-sub);
            font-weight: 600;
            text-align: center;
            border-bottom: 1px solid var(--border);
            padding-bottom: 8px;
            margin-bottom: 12px;
        }
        .gantt-header span { border-left: 1px solid #edf2f7; }
        .gantt-row {
            display: grid;
            align-items: center;
            height: 32px;
            background: #f8fafc;
            border-radius: var(--radius-sm);
        }
        .gantt-bar {
            height: 24px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            padding: 0 8px;
            font-size: 11px;
            font-weight: 600;
            color: white;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            cursor: grab;
            user-select: none;
            touch-action: none;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .gantt-bar:hover {
            transform: scaleY(1.1);
            filter: brightness(1.1);
        }
        .gantt-bar.pending { background: #94a3b8; }
        .gantt-bar.doing { background: var(--primary); }
        .gantt-bar.done { background: var(--success); }

        /* Weather Icons */
        .weather-icon { font-size: 16px; margin-top: 2px; display: block; line-height: 1; }
        .gantt-day-label { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; height: 100%; min-height: 36px; padding-top: 4px; }
        /* Location styles */
        .location-badge { font-size: 13px; color: var(--text-sub); display: flex; align-items: center; gap: 8px; background: #f1f5f9; padding: 6px 14px; border-radius: 20px; border: 1px solid var(--border); }
        .location-text-btn { cursor: pointer; display: flex; align-items: center; gap: 4px; border-right: 1px solid var(--border); padding-right: 8px; }
        .location-text-btn:hover { color: var(--primary); }
        .btn-refresh {
            background: none; border: none; padding: 2px 6px; cursor: pointer; color: var(--primary); font-size: 12px; font-weight: 600;
            display: flex; align-items: center; gap: 4px; transition: opacity 0.2s;
        }
        .btn-refresh:hover { opacity: 0.7; }
        
        .weather-prompt {
            background: #f8fafc; border: 1px dashed var(--border); border-radius: var(--radius-lg);
            padding: 24px; text-align: center; margin-bottom: 24px;
        }

        /* Modal additions (sync with index.php) */
        .input-with-action { display: flex; gap: 8px; }
        .btn-action { height: 46px; white-space: nowrap; padding: 0 16px; font-size: 13px; }
        .coords-info { font-size: 11px; color: var(--text-sub); margin-top: 4px; }


        /* Sharing Panel */
        .share-panel {
            background: #fdfdfd; border: 1px dashed var(--primary);
            border-radius: var(--radius-lg); padding: 20px; margin-bottom: 24px;
            animation: slideDown 0.3s ease-out;
        }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        
        .share-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .share-header h4 { margin: 0; font-size: 15px; color: var(--primary); display: flex; align-items: center; gap: 8px; }
        
        .share-url-container {
            display: flex; gap: 8px; background: #fff; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border); margin-bottom: 15px;
        }
        .share-url { flex: 1; border: none; font-size: 13px; color: var(--text-sub); background: none; outline: none; }
        
        .share-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .btn-share {
            padding: 8px 16px; font-size: 13px; font-weight: 600; border-radius: 8px; border: none; cursor: pointer;
            display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s;
        }
        .btn-line { background: #06C755; color: white; }
        .btn-line:hover { background: #05a346; transform: translateY(-1px); }
        .btn-email { background: #64748b; color: white; }
        .btn-email:hover { background: #475569; transform: translateY(-1px); }
        .btn-copy { background: #f1f5f9; color: var(--text-main); border: 1px solid var(--border); }
        .btn-copy:hover { background: #e2e8f0; }

        /* Toggle Switch */
        .switch { position: relative; display: inline-block; width: 44px; height: 24px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .4s; border-radius: 24px; }
        .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .slider { background-color: var(--primary); }
        input:checked + .slider:before { transform: translateX(20px); }

        /* Tooltip style injection (match admin/public style) */
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
            .task-card { flex-wrap: wrap; }
            .task-actions { width: 100%; justify-content: flex-end; }
        }
    </style>
</head>
<body>

<div class="app-container">
    <div class="header">
        <h1 id="proj-title-display">読み込み中...</h1>
        <div class="nav-actions">
            <a href="index.php" class="btn btn-outline btn-sm">← 戻る</a>
            <a href="#" id="link-history" class="btn btn-outline btn-sm">履歴</a>
            <a href="#" id="link-share" class="btn btn-outline btn-sm" target="_blank">共有プレビュー</a>
            <button class="btn btn-outline btn-sm" onclick="exportToExcel()" style="border-color:#10b981; color:#10b981;">Excel出力</button>
            <button class="btn btn-primary btn-sm" onclick="openTaskModal()">+ 工程追加</button>
        </div>
    </div>

    <div class="info-card">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
             <div style="display:flex; align-items:center; gap:12px;">
                 <strong id="proj-type-display">...</strong>
                 <!-- 案件ステータスはドロップダウンで即時変更・保存できる -->
                  <select id="proj-status-select" class="status-select pending" onchange="changeProjectStatus(this.value)">
                     <option value="planning">調整中 (Planning)</option>
                     <option value="in_progress">進行中 (In Progress)</option>
                     <option value="delayed">遅延 (Delayed)</option>
                     <option value="completed">完了 (Completed)</option>
                 </select>
                 <div id="proj-location-display" class="location-badge">
                     <div class="location-text-btn" onclick="openProjectEditModal()" title="地点を編集">
                        📍 <span id="location-text">地点未設定</span>
                     </div>
                     <button type="button" class="btn-refresh" onclick="refreshWeather(event)">
                        🔄 <span style="font-size:11px;">天気を更新</span>
                     </button>
                 </div>
             </div>
             </div>
             <button class="btn btn-outline btn-sm" onclick="deleteProject()" style="color:var(--danger); border-color:var(--danger);">案件削除</button>
        </div>
    </div>

    <!-- Gantt Chart Container -->
    <div id="gantt-container" class="gantt-container" style="display:none;"></div>

    <!-- 打ち合わせ日程調整パネル -->
    <div id="adjustment-panel" style="display:none; margin-bottom: 24px;">
        <h3 style="font-size: 16px; margin: 0 0 16px 0; color:var(--text-main); display:flex; align-items:center; gap:8px;">
            🤝 打ち合わせ日程調整
        </h3>
        <div id="adj-container" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:16px;">
            <!-- リストはJSで描画 -->
        </div>
    </div>

    <!-- 共有設定管理パネル -->
    <div class="share-panel" id="share-panel" style="display:none;">
        <div class="share-header">
            <h4>🤝 共有設定 (施主・業者様向け)</h4>
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:12px; color:var(--text-sub); font-weight:600;" id="visibility-label">非公開</span>
                <label class="switch">
                    <input type="checkbox" id="public-toggle" onchange="toggleVisibility(this.checked)">
                    <span class="slider"></span>
                </label>
            </div>
        </div>
        
        <div id="share-controls" style="opacity:0.5; pointer-events:none; transition: opacity 0.3s;">
            <div class="share-url-container">
                <input type="text" id="share-url-input" class="share-url" readonly>
                <button class="btn-share btn-copy" onclick="copyShareLink()">📋 コピー</button>
            </div>
            
            <div class="share-actions">
                <button class="btn-share btn-line" onclick="shareToLine()">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg" height="14" style="filter: brightness(0) invert(1);"> LINEで送る
                </button>
                <button class="btn-share btn-email" onclick="shareToEmail()">✉️ メールで送る</button>
                <a href="#" id="link-share-btn" class="btn-share btn-copy" target="_blank" style="text-decoration:none;">👁 プレビュー</a>
            </div>
            <p style="font-size:11px; color:#64748b; margin: 12px 0 0 0;">
                ※ 「公開」に設定すると、このリンクを知っている人は誰でも工程表を閲覧できます。
            </p>
        </div>
    </div>

    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
        <h3 style="font-size: 18px; margin: 0;">工程リスト</h3>
        <button class="btn btn-outline btn-sm" onclick="toggleSharePanel()" style="background:#fff;">🔗 共有設定を開く</button>
    </div>

    <!-- ソートツールバー：開始日・名前・ステータスで並び替え -->
    <div class="sort-toolbar" id="sort-toolbar">
        <span>並び替え:</span>
        <button class="btn-sort" id="sort-start" onclick="sortTasks('start')">📅 開始日順</button>
        <button class="btn-sort" id="sort-name" onclick="sortTasks('name')">🔤 名前順</button>
        <button class="btn-sort" id="sort-status" onclick="sortTasks('status')">🏷 ステータス順</button>
        <button class="btn-sort" id="sort-reset" onclick="sortTasks('manual')" style="margin-left:auto;">↩ 手動順に戻す</button>
    </div>

    <!-- フィルターツールバー：ステータスで表示絞り込み -->
    <div class="filter-toolbar" id="filter-toolbar">
        <span>表示:</span>
        <button class="btn-filter f-all active" id="filter-all"    onclick="setFilter('all')">　すべて</button>
        <button class="btn-filter f-pending"    id="filter-pending" onclick="setFilter('pending')">⬜ 未着手</button>
        <button class="btn-filter f-doing"      id="filter-doing"   onclick="setFilter('doing')">🔵 作業中</button>
        <button class="btn-filter f-done"       id="filter-done"    onclick="setFilter('done')">✅ 完了</button>
        <button class="btn-filter"              id="filter-hide-done" onclick="setFilter('hide-done')" style="margin-left:auto; border-color:#ef4444; color:#ef4444;">🚫 完了を隠す</button>
    </div>

    <div id="task-list" class="task-list">
        <!-- Tasks inserted here -->
    </div>
    <!-- フィルター全件非表示時のメッセージ -->
    <div id="filter-empty">該当する工程がありません</div>
</div>

<!-- Project Edit Modal -->
<div class="modal-backdrop" id="project-modal-container">
    <div class="modal-dialog">
        <h2 style="margin-top:0; margin-bottom: 24px; font-size: 20px;">案件情報の編集</h2>
        <form id="project-edit-form" onsubmit="saveProjectMetadata(event)">
            <div class="form-group">
                <label>案件タイトル</label>
                <input type="text" id="edit-proj-title" name="title" class="form-control" required>
            </div>
            <div class="form-group">
                <label>工事種別</label>
                <select id="edit-proj-type" name="type" class="form-control">
                    <option value="新築">新築</option>
                    <option value="リフォーム">リフォーム</option>
                    <option value="外構">外構</option>
                    <option value="解体">解体</option>
                    <option value="その他">その他</option>
                </select>
            </div>
            <div style="margin-top:24px; padding-top:16px; border-top: 1px solid var(--border);">
                <label style="font-size:14px; font-weight:700; color:var(--text-sub); display:block; margin-bottom:12px;">施工場所設定 (天気予報用)</label>
                <div style="margin-top:24px; padding-top:16px; border-top: 1px solid var(--border);">
                    <label style="font-size:14px; font-weight:700; color:var(--text-sub); display:block; margin-bottom:12px;">機能設定</label>
                    <div class="form-group" style="display:flex; align-items:center; gap:8px;">
                        <input type="checkbox" id="edit-feat-weather" style="width:18px; height:18px;">
                        <label for="edit-feat-weather" style="margin:0; font-weight:400;">天気予報機能を有効にする</label>
                    </div>
                    <div class="form-group" style="display:flex; align-items:center; gap:8px;">
                        <input type="checkbox" id="edit-feat-adjustment" style="width:18px; height:18px;">
                        <label for="edit-feat-adjustment" style="margin:0; font-weight:400;">打ち合わせ調整機能を有効にする</label>
                    </div>
                </div>

                <div id="edit-location-section" style="margin-top:16px; display:none;">
                    <label style="font-size:14px; font-weight:700; color:var(--text-sub); display:block; margin-bottom:12px;">施工場所設定</label>
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
                        <input type="hidden" id="edit-proj-lat" name="lat" value="">
                        <input type="hidden" id="edit-proj-lon" name="lon" value="">
                    </div>
                </div>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn btn-outline" onclick="closeProjectModal()">キャンセル</button>
                <button type="submit" class="btn btn-primary" id="btn-save-meta">決定</button>
            </div>
        </form>
    </div>
</div>

<!-- Task Modal -->
<div class="modal-backdrop" id="modal-container">
    <div class="modal-dialog">
        <h2 id="modal-title" style="margin-top:0; margin-bottom: 24px; font-size: 20px;">工程の追加/編集</h2>
        <form id="task-form" onsubmit="saveTaskForm(event)">
            <input type="hidden" id="task-id" value="">
            <div class="form-group">
                <label>工程名</label>
                <input type="text" id="task-title" class="form-control" required autocomplete="off" placeholder="例: 基礎工事">
            </div>
            <div class="form-group" style="display: flex; gap: 12px;">
                <div style="flex:1;">
                    <label>開始日</label>
                    <input type="date" id="task-start" class="form-control">
                </div>
                <div style="flex:1;">
                    <label>終了日</label>
                    <input type="date" id="task-end" class="form-control">
                </div>
            </div>
            <div class="form-group">
                <label>主担当者 / 業者名</label>
                <input type="text" id="task-assignee" class="form-control" placeholder="例: 〇〇工務店">
            </div>
            <div class="modal-actions">
                <button type="button" class="btn btn-outline" onclick="closeModal()">キャンセル</button>
                <button type="submit" class="btn btn-primary">保存</button>
            </div>
        </form>
    </div>
</div>

<div id="saving-indicator">保存しました</div>

<script>
    const PROJECT_ID = '<?= htmlspecialchars($id) ?>';
    const API_URL = 'api/api.php';
    let project = null;
    let sortableInstance = null;
    let isSaving = false;
    let weatherCache = {};

    async function loadData() {
        const res = await fetch(`${API_URL}?action=get_schedules`);
        const json = await res.json();
        project = json.data.find(p => p.id === PROJECT_ID);
        if (!project) {
            alert('案件が見つかりません');
            window.location.href = 'index.php';
            return;
        }

        document.getElementById('proj-title-display').textContent = project.title;
        document.getElementById('proj-type-display').textContent = project.type;
        
        // 地点の表示設定
        const locText = document.getElementById('location-text');
        locText.textContent = project.location_name || '地点未設定';

        // 案件ステータスセレクトを現在値に初期化
        const statusSelect = document.getElementById('proj-status-select');
        statusSelect.value = project.status || 'planning';
        updateProjectStatusStyle(statusSelect);
        
        document.getElementById('link-history').href = `history.php?id=${project.id}`;
        
        // 共有リンクの構築
        const shareToken = project.share_token;
        const shareUrl = `${window.location.protocol}//${window.location.host}/schedule/share.php?token=${shareToken}`;
        document.getElementById('share-url-input').value = shareUrl;
        document.getElementById('link-share').href = shareUrl;
        document.getElementById('link-share-btn').href = shareUrl;

        // 公開状態の反映
        const isPublic = project.is_public === true;
        const toggle = document.getElementById('public-toggle');
        if (toggle) toggle.checked = isPublic;
        updateVisibilityUI(isPublic);

        renderTasks();
        renderAdjustments();
    }

    // --- Project Metadata Editing ---
    function openProjectEditModal() {
        document.getElementById('edit-proj-title').value = project.title;
        document.getElementById('edit-proj-type').value = project.type;
        document.getElementById('proj-location').value = project.location_name || '';
        document.getElementById('edit-proj-lat').value = project.lat || '';
        document.getElementById('edit-proj-lon').value = project.lon || '';
        document.getElementById('proj-zip').value = '';
        
        const status = document.getElementById('gps-status');
        if (project.lat && project.lon) {
            status.textContent = `設定済み: (${parseFloat(project.lat).toFixed(4)}, ${parseFloat(project.lon).toFixed(4)})`;
        } else {
            status.textContent = '座標未設定';
        }

        // 機能トグルの初期化
        const feats = project.features || { weather: true, adjustment: true };
        document.getElementById('edit-feat-weather').checked = feats.weather;
        document.getElementById('edit-feat-adjustment').checked = feats.adjustment;
        
        // 天気が有効な場合のみ場所設定を出す
        const locSec = document.getElementById('edit-location-section');
        locSec.style.display = feats.weather ? 'block' : 'none';
        document.getElementById('edit-feat-weather').onchange = (e) => {
            locSec.style.display = e.target.checked ? 'block' : 'none';
        };

        document.getElementById('project-modal-container').classList.add('active');
    }

    function closeProjectModal() {
        document.getElementById('project-modal-container').classList.remove('active');
    }

    async function saveProjectMetadata(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        formData.append('action', 'save_project');
        formData.append('id', project.id);
        formData.append('status', project.status);

        const features = {
            weather: document.getElementById('edit-feat-weather').checked,
            adjustment: document.getElementById('edit-feat-adjustment').checked
        };
        formData.append('features', JSON.stringify(features));

        try {
            const res = await fetch(API_URL, { method: 'POST', body: formData });
            const result = await res.json();
            if (result.status === 'success') {
                closeProjectModal();
                showIndicator('案件情報を更新しました');
                
                // ローカルのprojectオブジェクトも更新（リロードせず反映）
                project.title = formData.get('title');
                project.type = formData.get('type');
                project.location_name = formData.get('location_name');
                project.lat = formData.get('lat');
                project.lon = formData.get('lon');
                
                document.getElementById('proj-title-display').textContent = project.title;
                document.getElementById('proj-type-display').textContent = project.type;
                document.getElementById('location-text').textContent = project.location_name || '地点未設定';
                
                // 天気予報を再取得・再描画
                weatherCache = {};
                renderGantt();
            } else {
                alert('保存エラー: ' + result.message);
            }
        } catch (err) {
            alert('通信エラー');
        }
    }

    // --- Geolocation Helpers (Sync with index.php) ---
    async function lookupZip() {
        const zip = document.getElementById('proj-zip').value.replace(/-/g, '');
        if (zip.length !== 7) { alert('郵便番号は7桁で入力してください。'); return; }
        try {
            const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zip}`);
            const data = await res.json();
            if (data.results) {
                const r = data.results[0];
                document.getElementById('proj-location').value = r.address1 + r.address2 + r.address3;
                lookupCoords();
            } else { alert('住所が見つかりませんでした。'); }
        } catch (e) { alert('検索に失敗しました。'); }
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
            } else { status.textContent = '見つかりませんでした。'; }
        } catch (e) { status.textContent = 'エラーが発生しました。'; }
    }

    function getGPS() {
        const status = document.getElementById('gps-status');
        if (!navigator.geolocation) { alert('GPS非対応です。'); return; }
        status.textContent = 'GPS信号を受信中...';
        navigator.geolocation.getCurrentPosition(
            (pos) => setCoords(pos.coords.latitude, pos.coords.longitude, '現在地(GPS)'),
            (err) => { alert('取得失敗'); status.textContent = '取得失敗'; },
            { enableHighAccuracy: true, timeout: 5000 }
        );
    }

    function setCoords(lat, lon, label) {
        document.getElementById('edit-proj-lat').value = lat;
        document.getElementById('edit-proj-lon').value = lon;
        document.getElementById('gps-status').textContent = `設定済み: ${label} (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
    }

    function refreshWeather(e) {
        if (e) e.stopPropagation();
        if (!project.lat || !project.lon) {
            openProjectEditModal();
            return;
        }
        weatherCache = {};
        renderGantt();
        showIndicator('天気を更新しました');
    }

    function renderTasks() {
        const list = document.getElementById('task-list');
        list.innerHTML = '';
        
        if (project.tasks.length === 0) {
            list.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-sub);">工程がありません。追加してください。</div>`;
            document.getElementById('filter-empty').style.display = 'none';
            return;
        }

        project.tasks.forEach((task, index) => {
            const el = document.createElement('div');
            el.className = 'task-card';
            el.dataset.id = task.id;
            el.dataset.status = task.status; // フィルター判定用
            
            const dateStr = (task.start || '未定') + ' 〜 ' + (task.end || '未定');

            el.innerHTML = `
                <div class="drag-handle" title="ドラッグして並び替え">≡</div>
                <div class="move-btns">
                    <button class="btn-move" onclick="moveTask('${task.id}', -1)" ${index === 0 ? 'disabled' : ''} title="上へ">▲</button>
                    <button class="btn-move" onclick="moveTask('${task.id}', 1)" ${index === project.tasks.length - 1 ? 'disabled' : ''} title="下へ">▼</button>
                </div>
                <div class="task-content">
                    <h4 class="task-title">${escapeHtml(task.title)}</h4>
                    <div class="task-meta">
                        <span>📅 ${escapeHtml(dateStr)}</span>
                        <span>👷 ${escapeHtml(task.assignee || '未設定')}</span>
                    </div>
                </div>
                <div class="task-actions">
                    <select class="status-select ${task.status}" onchange="changeStatus('${task.id}', this.value)">
                        <option value="pending" ${task.status==='pending' ? 'selected' : ''}>未着手</option>
                        <option value="doing" ${task.status==='doing' ? 'selected' : ''}>作業中</option>
                        <option value="done" ${task.status==='done' ? 'selected' : ''}>完了</option>
                    </select>
                    <button class="btn-icon" onclick="openTaskModal('${task.id}')">✏️</button>
                    <button class="btn-icon" onclick="deleteTask('${task.id}')">🗑️</button>
                </div>
            `;
            list.appendChild(el);
        });

        // カード追加後にフィルターを適用（再描画時も状態を維持）
        applyFilter();
        initSortable();
        renderGantt();
    }

    function getWeatherEmoji(code) {
        // WMO Weather interpretation codes (WW)
        if (code === 0) return '☀️'; // Clear sky
        if (code <= 3) return '🌤️';  // Mainly clear, partly cloudy, and overcast
        if (code <= 48) return '🌫️'; // Fog
        if (code <= 57) return '🌦️'; // Drizzle
        if (code <= 67) return '🌧️'; // Rain
        if (code <= 77) return '❄️';  // Snow fall
        if (code <= 82) return '🚿'; // Rain showers
        if (code <= 86) return '❄️';  // Snow showers
        if (code <= 99) return '⚡';  // Thunderstorm
        return '❓';
    }

    async function fetchWeatherData(lat, lon) {
        const cacheKey = `${lat},${lon}`;
        if (weatherCache[cacheKey]) return weatherCache[cacheKey];

        try {
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code&timezone=Asia%2FTokyo`);
            const data = await res.json();
            if (data && data.daily) {
                const weatherMap = {};
                data.daily.time.forEach((time, i) => {
                    weatherMap[time] = data.daily.weather_code[i];
                });
                weatherCache[cacheKey] = weatherMap;
                return weatherMap;
            }
        } catch (e) {
            console.error('Weather Fetch Error:', e);
        }
        return null;
    }

    async function renderGantt() {
        const container = document.getElementById('gantt-container');
        if (!project.tasks || project.tasks.length === 0) {
            container.style.display = 'none';
            return;
        }

        let minDate = new Date('2099-01-01');
        let maxDate = new Date('1970-01-01');
        let hasValidDates = false;

        project.tasks.forEach(task => {
            if (task.start) {
                let s = new Date(task.start);
                if (s < minDate) minDate = s;
                if (s > maxDate) maxDate = s;
                hasValidDates = true;
            }
            if (task.end) {
                let e = new Date(task.end);
                if (e < minDate) minDate = e;
                if (e > maxDate) maxDate = e;
                hasValidDates = true;
            }
        });

        if (!hasValidDates) {
            container.style.display = 'none';
            return;
        }

        minDate.setDate(minDate.getDate() - 2);
        maxDate.setDate(maxDate.getDate() + 3);

        const dayMs = 1000 * 60 * 60 * 24;
        const totalDays = Math.round((maxDate - minDate) / dayMs) + 1;
        
        container.style.display = 'block';

        // Get weather data if coords exist
        let weatherData = null;
        if (project.lat && project.lon) {
            weatherData = await fetchWeatherData(project.lat, project.lon);
        }

        // 地点未設定時のプッシュ通知的なプロンプト
        let promptHtml = '';
        if (!project.lat) {
            promptHtml = `
            <div class="weather-prompt">
                <div style="font-weight:700; color:var(--text-main); margin-bottom:8px;">🌦️ 天気予報を表示できます</div>
                <div style="font-size:13px; color:var(--text-sub); margin-bottom:16px;">現場の地点を設定すると、このガントチャートにピンポイントな天気予報が表示されます。</div>
                <button class="btn btn-primary btn-sm" onclick="openProjectEditModal()">地点を設定する</button>
            </div>`;
        }

        let headerHtml = `<div class="gantt-header" style="grid-template-columns: 140px repeat(${totalDays}, 1fr);">`;
        headerHtml += `<div>工程名</div>`;
        for (let i = 0; i < totalDays; i++) {
            let d = new Date(minDate.getTime() + i * dayMs);
            // ローカルの日付文字列 (YYYY-MM-DD) を作成
            let dateKey = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            
            let label = d.getDate();
            if (label === 1 || i === 0) label = (d.getMonth()+1) + '/' + label;
            
            let weatherEmoji = '';
            if (weatherData && weatherData[dateKey] !== undefined) {
                weatherEmoji = `<span class="weather-icon" title="WMO:${weatherData[dateKey]}">${getWeatherEmoji(weatherData[dateKey])}</span>`;
            }

            headerHtml += `<span class="gantt-day-label">${label}${weatherEmoji}</span>`;
        }
        headerHtml += `</div>`;

        let rowsHtml = '';
        project.tasks.forEach(task => {
            let s = task.start ? new Date(task.start) : null;
            let e = task.end ? new Date(task.end) : null;
            if (!s && e) s = e;
            if (!e && s) e = s;
            if (!s && !e) return;

            let startCol = Math.round((s - minDate) / dayMs) + 2;
            let duration = Math.round((e - s) / dayMs) + 1;
            let endCol = startCol + duration;

            rowsHtml += `
            <div class="gantt-row" style="grid-template-columns: 140px repeat(${totalDays}, 1fr);">
                <div style="font-size:12px; font-weight:600; padding-right:8px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(task.title)}</div>
                <div class="gantt-bar ${task.status}" data-task-id="${task.id}" style="grid-column: ${startCol} / ${endCol};">
                    ${escapeHtml(task.assignee || '')}
                </div>
            </div>`;
        });

        let today = new Date();
        today.setHours(0,0,0,0);
        let todayHtml = '';
        if (today >= minDate && today <= maxDate) {
            let todayCol = Math.round((today - minDate) / dayMs) + 2;
            todayHtml = `
            <div style="position: absolute; top:0; bottom:0; left:0; right:0; pointer-events:none; display:grid; grid-template-columns: 140px repeat(${totalDays}, 1fr);">
                <div style="grid-column: ${todayCol} / span 1; border-left: 2px solid var(--danger); opacity: 0.5;">
                    <span style="position:absolute; top:-22px; left:-12px; font-size:10px; color:var(--danger); font-weight:700; background:var(--surface); padding:2px 4px; border-radius:4px;">今日</span>
                </div>
            </div>`;
        }

        container.innerHTML = `
            ${promptHtml}
            <h3 style="margin-top:0; font-size:16px; margin-bottom:16px;">タイムライン（ガントチャート）</h3>
            <div class="gantt-grid" style="position:relative;">
                ${headerHtml}
                ${rowsHtml}
                ${todayHtml}
            </div>
        `;
    }

    function renderAdjustments() {
        const panel = document.getElementById('adjustment-panel');
        const container = document.getElementById('adj-container');
        
        const feats = project.features || { weather: true, adjustment: true };
        if (!feats.adjustment) {
            panel.style.display = 'none';
            return;
        }
        
        panel.style.display = 'block';
        if (!project.adjustments || project.adjustments.length === 0) {
            container.innerHTML = `<div style="grid-column: 1/-1; padding: 24px; text-align:center; background:#f8fafc; border-radius:12px; border:1px dashed var(--border); font-size:14px; color:var(--text-sub);">現在調整中の日程はありません。</div>`;
            return;
        }

        container.innerHTML = project.adjustments.map(adj => {
            const priorityLabels = { low: '緩め', normal: '普通', high: '緊急' };
            const priorityColors = { low: '#64748b', normal: '#4f46e5', high: '#ef4444' };
            const pLabel = priorityLabels[adj.priority || 'normal'];
            const pColor = priorityColors[adj.priority || 'normal'];

            return `
                <div style="background:white; border:1px solid var(--border); border-radius:12px; padding:16px; box-shadow:var(--shadow-sm);">
                    <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:12px;">
                        <div>
                            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                                <span style="font-weight:700; font-size:15px;">${escapeHtml(adj.name)} 様</span>
                                <span style="background:${pColor}; color:white; font-size:10px; padding:2px 8px; border-radius:10px; font-weight:700;">${pLabel}</span>
                            </div>
                            <a href="tel:${adj.contact}" style="font-size:13px; color:var(--primary); text-decoration:none;">📞 ${escapeHtml(adj.contact)}</a>
                        </div>
                        <div style="font-size:11px; color:var(--text-sub);">${adj.created_at.split(' ')[0]}</div>
                    </div>
                    
                    ${adj.message ? `
                        <div style="background:#f1f5f9; padding:10px; border-radius:8px; font-size:13px; margin-bottom:12px; border-left:4px solid ${pColor}; line-height:1.4;">
                            ${escapeHtml(adj.message).replace(/\n/g, '<br>')}
                        </div>
                    ` : ''}

                    <div style="display:flex; flex-direction:column; gap:8px;">
                        ${adj.preferences.map(p => `
                            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px; background:#f8fafc; border-radius:8px; border: 1px solid ${p.status==='confirmed' ? 'var(--success)' : (p.status==='cancelled' ? '#eee' : 'transparent')}">
                                <div style="font-size:13px; flex:1;">
                                    <span style="font-weight:700; color:var(--text-sub); font-size:11px; margin-right:4px;">第${p.rank}</span>
                                    <span style="${p.status==='cancelled' ? 'text-decoration:line-through; opacity:0.5;' : ''}">${p.date} ${p.time}</span>
                                </div>
                                <div>
                                    ${p.status === 'confirmed' ? 
                                        '<span style="color:var(--success); font-weight:700; font-size:12px;">✅ 確定</span>' : 
                                        (p.status === 'cancelled' ? 
                                            '<span style="color:var(--text-sub); font-size:11px;">(取消)</span>' : 
                                            `<button class="btn btn-primary" style="padding:4px 8px; font-size:11px;" onclick="updateAdjStatus('${adj.id}', ${p.rank}, 'confirmed')">確定する</button>`
                                        )
                                    }
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    async function updateAdjStatus(adjId, rank, status) {
        if (!confirm('この日程で確定しますか？他の候補日は自動的にキャンセルされます。')) return;
        
        const fd = new FormData();
        fd.append('action', 'update_adjustment_status');
        fd.append('project_id', PROJECT_ID);
        fd.append('adj_id', adjId);
        fd.append('rank', rank);
        fd.append('status', status);

        const res = await fetch(API_URL, { method: 'POST', body: fd });
        const result = await res.json();
        if (result.status === 'success') {
             showIndicator('日程を確定しました');
             loadData(); // リロードして反映
        }
    }

    // --- フィルター状態管理 ---
    // currentFilter: 'all' | 'pending' | 'doing' | 'done' | 'hide-done'
    // フィルターはDOMの表示切替のみ。project.tasks配列は変更しないのでソートと共存できる
    let currentFilter = 'all';

    function setFilter(key) {
        currentFilter = key;
        updateFilterButtons();
        applyFilter();
    }

    function applyFilter() {
        const cards = document.querySelectorAll('#task-list .task-card');
        let visibleCount = 0;

        cards.forEach(card => {
            const status = card.dataset.status;
            let show = false;

            if (currentFilter === 'all') {
                show = true;
            } else if (currentFilter === 'hide-done') {
                // 「完了を隠す」: done以外をすべて表示
                show = (status !== 'done');
            } else {
                // 特定ステータスのみ表示
                show = (status === currentFilter);
            }

            card.classList.toggle('hidden-task', !show);
            if (show) visibleCount++;
        });

        // 表示件数0のときメッセージを出す
        const emptyEl = document.getElementById('filter-empty');
        if (emptyEl) emptyEl.style.display = (visibleCount === 0 && cards.length > 0) ? 'block' : 'none';
    }

    function updateFilterButtons() {
        // 全ボタンのactiveを外す
        ['filter-all', 'filter-pending', 'filter-doing', 'filter-done', 'filter-hide-done'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.classList.remove('active');
        });

        // 「完了を隠す」は別デザインのため個別処理
        const hideDoneBtn = document.getElementById('filter-hide-done');
        if (currentFilter === 'hide-done') {
            if (hideDoneBtn) {
                hideDoneBtn.style.background = '#ef4444';
                hideDoneBtn.style.color = 'white';
                hideDoneBtn.style.borderColor = 'transparent';
            }
        } else {
            if (hideDoneBtn) {
                hideDoneBtn.style.background = '';
                hideDoneBtn.style.color = '#ef4444';
                hideDoneBtn.style.borderColor = '#ef4444';
            }
            const activeId = 'filter-' + (currentFilter === 'all' ? 'all' :
                              currentFilter === 'pending' ? 'pending' :
                              currentFilter === 'doing' ? 'doing' : 'done');
            const btn = document.getElementById(activeId);
            if (btn) btn.classList.add('active');
        }
    }

    // --- ソート状態管理 ---
    // currentSort: 現在のソートキー（'manual'=手動順, 'start', 'name', 'status'）
    // currentSortAsc: 昇順フラグ（同じキーを2回押すと逆順になる）
    let currentSort = 'manual';
    let currentSortAsc = true;
    const SORT_STATUS_ORDER = { pending: 0, doing: 1, done: 2 };

    function sortTasks(key) {
        if (key === 'manual') {
            // 手動順：サーバーから再取得せず、現在のmanualOrderを使う
            // マニュアル順はそのままなので単にソートを無効化
            currentSort = 'manual';
            currentSortAsc = true;
            updateSortButtons();
            renderTasks();
            return;
        }

        // 同じキーを再クリックで昇順/降順切り替え
        if (currentSort === key) {
            currentSortAsc = !currentSortAsc;
        } else {
            currentSort = key;
            currentSortAsc = true;
        }

        const dir = currentSortAsc ? 1 : -1;

        project.tasks.sort((a, b) => {
            if (key === 'start') {
                const da = a.start || '9999-12-31';
                const db = b.start || '9999-12-31';
                return da < db ? -dir : da > db ? dir : 0;
            } else if (key === 'name') {
                return a.title.localeCompare(b.title, 'ja') * dir;
            } else if (key === 'status') {
                const sa = SORT_STATUS_ORDER[a.status] ?? 9;
                const sb = SORT_STATUS_ORDER[b.status] ?? 9;
                return (sa - sb) * dir;
            }
            return 0;
        });

        updateSortButtons();
        renderTasks();
        saveTasksToServer(); // ソート後の順序をサーバーに保存
    }

    function updateSortButtons() {
        // 全ボタンのactiveクラスをリセット
        ['sort-start', 'sort-name', 'sort-status'].forEach(id => {
            const btn = document.getElementById(id);
            if (!btn) return;
            btn.classList.remove('active', 'asc');
        });

        if (currentSort === 'manual') return;

        const activeId = 'sort-' + (currentSort === 'start' ? 'start' : currentSort === 'name' ? 'name' : 'status');
        const btn = document.getElementById(activeId);
        if (btn) {
            btn.classList.add('active');
            if (currentSortAsc) btn.classList.add('asc');
        }
    }

    // ▲▼ボタンによる手動1段移動
    function moveTask(taskId, direction) {
        const idx = project.tasks.findIndex(t => t.id === taskId);
        if (idx === -1) return;
        const targetIdx = idx + direction;
        if (targetIdx < 0 || targetIdx >= project.tasks.length) return;

        // 配列内で要素を入れ替え
        [project.tasks[idx], project.tasks[targetIdx]] = [project.tasks[targetIdx], project.tasks[idx]];

        // 手動操作후はソート状態をリセット（手動順に戻す）
        currentSort = 'manual';
        currentSortAsc = true;
        updateSortButtons();

        renderTasks();
        saveTasksToServer();
    }

    function initSortable() {
        const list = document.getElementById('task-list');
        if (sortableInstance) sortableInstance.destroy();
        if (project.tasks.length === 0) return;

        sortableInstance = new Sortable(list, {
            handle: '.drag-handle',
            animation: 150,
            onEnd: function () {
                // DOMの順序からtasks配列を再構築
                const newOrderIds = Array.from(list.children)
                    .filter(el => el.dataset.id) // 空メッセージ要素を除外
                    .map(el => el.dataset.id);
                const newTasks = [];
                newOrderIds.forEach(id => {
                    const task = project.tasks.find(t => t.id === id);
                    if (task) newTasks.push(task);
                });
                project.tasks = newTasks;

                // ドラッグ後は手動順に戻す
                currentSort = 'manual';
                currentSortAsc = true;
                updateSortButtons();

                renderGantt(); // ガントチャートも即時更新
                saveTasksToServer();
            }
        });
    }

    function openTaskModal(taskId = null) {
        let task = taskId ? project.tasks.find(t => t.id === taskId) : null;
        
        document.getElementById('task-id').value = task ? task.id : '';
        document.getElementById('task-title').value = task ? task.title : '';
        document.getElementById('task-start').value = task ? task.start : '';
        document.getElementById('task-end').value = task ? task.end : '';
        document.getElementById('task-assignee').value = task ? (task.assignee || '') : '';
        
        document.getElementById('modal-title').textContent = task ? '工程の編集' : '工程の追加';
        document.getElementById('modal-container').classList.add('active');
        setTimeout(() => document.getElementById('task-title').focus(), 100);
    }

    function closeModal() {
        document.getElementById('modal-container').classList.remove('active');
    }

    function saveTaskForm(e) {
        e.preventDefault();
        const id = document.getElementById('task-id').value;
        const title = document.getElementById('task-title').value;
        const start = document.getElementById('task-start').value;
        const end = document.getElementById('task-end').value;
        const assignee = document.getElementById('task-assignee').value;

        if (id) {
            const task = project.tasks.find(t => t.id === id);
            if (task) {
                task.title = title; task.start = start; task.end = end; task.assignee = assignee;
            }
        } else {
            project.tasks.push({
                id: 'task_' + Math.random().toString(36).substr(2, 9),
                title, start, end, assignee, status: 'pending'
            });
        }
        
        closeModal();
        renderTasks();
        saveTasksToServer();
    }

    function changeStatus(taskId, status) {
        const task = project.tasks.find(t => t.id === taskId);
        if (task) {
            task.status = status;
            renderTasks();
            saveTasksToServer();
        }
    }

    function deleteTask(taskId) {
        if (!confirm('この工程を削除してよろしいですか？')) return;
        project.tasks = project.tasks.filter(t => t.id !== taskId);
        renderTasks();
        saveTasksToServer();
    }

    async function deleteProject() {
        if (!confirm('この案件とすべての工程履歴を削除します。元に戻せません。よろしいですか？')) return;
        const formData = new FormData();
        formData.append('action', 'delete_project');
        formData.append('id', project.id);
        
        await fetch(API_URL, { method: 'POST', body: formData });
        window.location.href = 'index.php';
    }

    async function saveTasksToServer() {
        if (isSaving) return; // Basic debounce could be added
        isSaving = true;
        
        const formData = new FormData();
        formData.append('action', 'save_tasks');
        formData.append('project_id', project.id);
        formData.append('tasks', JSON.stringify(project.tasks));

        try {
            const res = await fetch(API_URL, { method: 'POST', body: formData });
            const result = await res.json();
            if (result.status === 'success') {
                showIndicator();
            } else {
                alert('保存エラー: ' + result.message);
            }
        } catch(e) {
            alert('通信に失敗しました。');
        } finally {
            isSaving = false;
        }
    }

    function showIndicator(msg = '保存しました') {
        const el = document.getElementById('saving-indicator');
        el.textContent = msg;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 2000);
    }

    function escapeHtml(unsafe) {
        return (unsafe || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    // --- Gantt Chart Drag & Drop Logic ---
    let isDraggingBar = false;
    let dragStartX = 0;
    let lastX = 0;
    let currentBar = null;
    let currentTask = null;
    let dayWidth = 0;

    document.addEventListener('pointerdown', e => {
        const bar = e.target.closest('.gantt-bar');
        if (!bar) return;
        
        const headerCell = document.querySelector('.gantt-header span');
        if (!headerCell) return;
        dayWidth = headerCell.getBoundingClientRect().width;
        if (dayWidth < 1) return;

        isDraggingBar = true;
        dragStartX = e.clientX;
        lastX = e.clientX;
        currentBar = bar;
        currentTask = project.tasks.find(t => t.id === bar.dataset.taskId);
        
        currentBar.style.cursor = 'grabbing';
        currentBar.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.3)';
        currentBar.style.zIndex = '100';
        currentBar.style.transition = 'none'; // remove smooth transition to snap to finger
        e.target.setPointerCapture(e.pointerId);
    });

    document.addEventListener('pointermove', e => {
        if (!isDraggingBar || !currentBar) return;
        lastX = e.clientX;
        let deltaX = lastX - dragStartX;
        currentBar.style.transform = `translateX(${deltaX}px) scaleY(1.1)`;
    });

    document.addEventListener('pointerup', e => {
        if (!isDraggingBar || !currentBar) return;
        isDraggingBar = false;
        
        let deltaX = lastX - dragStartX;
        let shiftDays = Math.round(deltaX / dayWidth);
        
        currentBar.style.cursor = 'grab';
        currentBar.style.boxShadow = '';
        currentBar.style.zIndex = '';
        currentBar.style.transform = '';
        currentBar.style.transition = '';
        
        let shouldRender = false;
        
        if (shiftDays !== 0 && currentTask) {
            if (currentTask.start) {
                let d = new Date(currentTask.start);
                d.setDate(d.getDate() + shiftDays);
                currentTask.start = d.toISOString().split('T')[0];
            }
            if (currentTask.end) {
                let d = new Date(currentTask.end);
                d.setDate(d.getDate() + shiftDays);
                currentTask.end = d.toISOString().split('T')[0];
            }
            shouldRender = true;
        }
        
        currentBar = null;
        currentTask = null;
        
        if (shouldRender) {
            renderTasks();
            saveTasksToServer();
        }
    });

    async function exportToExcel() {
        if (!project || !project.tasks || project.tasks.length === 0) {
            alert("出力する工程がありません");
            return;
        }

        console.log('Starting Excel export for project:', project.title);
        showIndicator('Excelファイルを生成中...');

        try {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('ガントチャート', {
                views: [{ showGridLines: false }]
            });

            let minDate = new Date('2099-01-01');
            let maxDate = new Date('1970-01-01');
            let hasValidDates = false;
            
            project.tasks.forEach(task => {
                if (task.start) {
                    let s = new Date(task.start);
                    if (s < minDate) minDate = s;
                    if (s > maxDate) maxDate = s;
                    hasValidDates = true;
                }
                if (task.end) {
                    let e = new Date(task.end);
                    if (e < minDate) minDate = e;
                    if (e > maxDate) maxDate = e;
                    hasValidDates = true;
                }
            });

            if (!hasValidDates) {
                alert("出力可能な日付設定がありません。");
                return;
            }

            console.log('Date range:', minDate, 'to', maxDate);

            minDate.setDate(minDate.getDate() - 1);
            maxDate.setDate(maxDate.getDate() + 2);
            
            const dayMs = 1000 * 60 * 60 * 24;
            const totalDays = Math.round((maxDate - minDate) / dayMs) + 1;
            console.log('Total days in timeline:', totalDays);

            sheet.addRow([]);
            sheet.addRow([]);

            const headers = ['工程名', '担当者'];
            const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
            const weekendColumns = [];

            for (let i = 0; i < totalDays; i++) {
                let d = new Date(minDate.getTime() + i * dayMs);
                let dayIndex = d.getDay();
                headers.push(`${d.getMonth()+1}/${d.getDate()}\n(${dayNames[dayIndex]})`);
                if (dayIndex === 0 || dayIndex === 6) {
                    weekendColumns.push({ col: i + 3, day: dayIndex });
                }
            }
            
            const headerRow = sheet.addRow(headers);
            headerRow.height = 35;
            
            headerRow.eachCell((cell) => {
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };
                cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                cell.border = {
                    top: {style:'thin', color:{argb:'FFCBD5E1'}},
                    bottom: {style:'thin', color:{argb:'FFCBD5E1'}},
                    left: {style:'thin', color:{argb:'FFCBD5E1'}},
                    right: {style:'thin', color:{argb:'FFCBD5E1'}}
                };
            });

            weekendColumns.forEach(wk => {
                const cell = headerRow.getCell(wk.col);
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: wk.day === 0 ? { argb: 'FFE11D48' } : { argb: 'FF0284C7' } };
            });
            
            sheet.getColumn(1).width = 35;
            sheet.getColumn(2).width = 16;
            for (let i = 0; i < totalDays; i++) {
                sheet.getColumn(i + 3).width = 5.5;
            }

            sheet.mergeCells(1, 1, 1, Math.min(10, 2 + totalDays));
            const titleCell = sheet.getCell('A1');
            titleCell.value = `■ 案件: ${project.title}  (種別: ${project.type})`;
            titleCell.font = { size: 16, bold: true, color: { argb: 'FF1E293B' } };
            titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
            sheet.getRow(1).height = 30;

            const statusColors = {
                'pending': 'FFCBD5E1', 
                'doing': 'FF60A5FA',   
                'done': 'FF34D399'     
            };

            project.tasks.forEach((task, rowIdx) => {
                const rowData = [task.title, task.assignee || ''];
                for (let i = 0; i < totalDays; i++) rowData.push('');
                
                const row = sheet.addRow(rowData);
                row.height = 25;
                
                const isEven = rowIdx % 2 === 0;
                const baseFill = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

                row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    let fillArgb = baseFill;
                    if (colNumber >= 3) {
                        const checkWeekend = weekendColumns.find(w => w.col === colNumber);
                        if (checkWeekend) {
                            fillArgb = checkWeekend.day === 0 ? 'FFFFF1F2' : 'FFF0F9FF';
                        }
                    }
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillArgb } };
                    cell.border = {
                        top: {style:'hair', color:{argb:'FFCBD5E1'}},
                        bottom: {style:'hair', color:{argb:'FFCBD5E1'}},
                        left: {style:'hair', color:{argb:'FFCBD5E1'}},
                        right: {style:'hair', color:{argb:'FFCBD5E1'}}
                    };
                    cell.alignment = { vertical: 'middle', wrapText: true };
                });
                
                let s = task.start ? new Date(task.start) : null;
                let e = task.end ? new Date(task.end) : null;
                if (!s && e) s = e;
                if (!e && s) e = s;

                if (s && e) {
                    let startColIdx = Math.round((s - minDate) / dayMs) + 3;
                    let endColIdx = Math.round((e - minDate) / dayMs) + 3;
                    startColIdx = Math.max(3, startColIdx);
                    endColIdx = Math.min(2 + totalDays, endColIdx);
                    const color = statusColors[task.status] || 'FFCBD5E1';
                    for (let c = startColIdx; c <= endColIdx; c++) {
                        const cell = row.getCell(c);
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
                    }
                }
                row.getCell(1).alignment = { wrapText: true, vertical: 'middle', indent: 1 };
                row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
            });

            sheet.views = [ { state: 'frozen', xSplit: 2, ySplit: 3, showGridLines: false } ];

            console.log('Workbook ready, generating buffer...');
            const buffer = await workbook.xlsx.writeBuffer();
            console.log('Buffer generated, size:', buffer.byteLength);

            const blob = new Blob([buffer], { type: 'application/octet-stream' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            
            // 安全なファイル名を作成（不正な文字を置換）
            const safeTitle = project.title.replace(/[\\/:*?"<>|]/g, '_');
            const filename = `工程表_${safeTitle}.xlsx`;
            
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            
            console.log('Triggering download for:', filename);
            a.click();
            
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                console.log('Download process completed.');
                showIndicator('Excel・ダウンロード完了');
            }, 500);

        } catch(err) {
            console.error('Excel Export Error:', err);
            alert("Excel生成に失敗しました: " + err.message);
        }
    }

    // 案件ステータスの変更をAPIで保存する→ダッシュボードのカウントに即座に反映される
    async function changeProjectStatus(newStatus) {
        project.status = newStatus;
        updateProjectStatusStyle(document.getElementById('proj-status-select'));

        const formData = new FormData();
        formData.append('action', 'save_project');
        formData.append('id', project.id);
        formData.append('title', project.title);
        formData.append('type', project.type);
        formData.append('status', newStatus);

        try {
            const res = await fetch(API_URL, { method: 'POST', body: formData });
            const result = await res.json();
            if (result.status === 'success') {
                showIndicator('案件ステータスを更新しました');
            } else {
                alert('保存エラー: ' + result.message);
            }
        } catch(e) {
            alert('通信に失敗しました。');
        }
    }

    // ステータスに応じたセレクトボックスの色を切り替え
    function updateProjectStatusStyle(el) {
        el.className = 'status-select'; // リセット
        const colorMap = {
            planning:    '',
            in_progress: 'doing',
            delayed:     'pending',  // 警告色（オレンジ系を流用）
            completed:   'done'
        };
        const cls = colorMap[el.value];
        if (cls) el.classList.add(cls);
    }

    // --- 共有設定関連 ---
    function toggleSharePanel() {
        const panel = document.getElementById('share-panel');
        const isHidden = panel.style.display === 'none';
        panel.style.display = isHidden ? 'block' : 'none';
        
        if (isHidden) {
             panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    async function toggleVisibility(checked) {
        updateVisibilityUI(checked);
        
        // API保存
        const formData = new FormData();
        formData.append('action', 'save_project');
        formData.append('id', PROJECT_ID);
        formData.append('title', project.title);
        formData.append('type', project.type);
        formData.append('status', project.status);
        formData.append('is_public', checked ? 'true' : 'false');
        
        try {
            const res = await fetch(API_URL, { method: 'POST', body: formData });
            const json = await res.json();
            if (json.status === 'success') {
                project.is_public = checked;
                showIndicator('公開設定を更新しました');
            }
        } catch(e) {
            alert('設定の保存に失敗しました');
        }
    }

    function updateVisibilityUI(isPublic) {
        const label = document.getElementById('visibility-label');
        const controls = document.getElementById('share-controls');
        if (!label || !controls) return;
        label.textContent = isPublic ? '公開中' : '非公開';
        label.style.color = isPublic ? 'var(--primary)' : 'var(--text-sub)';
        controls.style.opacity = isPublic ? '1' : '0.4';
        controls.style.pointerEvents = isPublic ? 'auto' : 'none';
    }

    function copyShareLink() {
        const input = document.getElementById('share-url-input');
        input.select();
        document.execCommand('copy');
        showIndicator('リンクをコピーしました');
    }

    function shareToLine() {
        const url = document.getElementById('share-url-input').value;
        const text = `【工程表の共有】${project.title} の最新工程です。確認をお願いします：\n${url}`;
        window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, '_blank');
    }

    function shareToEmail() {
        const url = document.getElementById('share-url-input').value;
        const subject = `【工程表】${project.title}`;
        const body = `関係者各位\n\nお世話になっております。${project.title} の現在の工程スケジュールです。下記リンクより詳細をご確認いただけます。\n\n${url}\n\nよろしくお願いいたします。`;
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }

    loadData();
</script>
</body>
</html>
