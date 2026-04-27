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
    <title>工程履歴</title>
    <style>
        :root {
            --bg-color: #f7f9fc;
            --surface: #ffffff;
            --text-main: #2d3748;
            --text-sub: #718096;
            --primary: #4f46e5;
            --border: #e2e8f0;
            --radius-lg: 16px;
            --radius-sm: 8px;
            --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-main);
            margin: 0; padding: 0;
            -webkit-font-smoothing: antialiased;
        }

        .app-container { max-width: 800px; margin: 0 auto; padding: 24px; }
        
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .header h1 { font-size: 24px; margin: 0; font-weight: 700; }
        
        .btn-outline {
            display: inline-flex; align-items: center; justify-content: center;
            padding: 8px 16px; font-size: 14px; font-weight: 600;
            border-radius: var(--radius-sm); border: 1px solid var(--border);
            cursor: pointer; text-decoration: none; color: var(--text-main);
        }

        .timeline {
            position: relative;
            padding-left: 24px;
        }

        .timeline::before {
            content: '';
            position: absolute;
            top: 0; bottom: 0; left: 7px;
            width: 2px;
            background: var(--border);
        }

        .history-card {
            position: relative;
            background: var(--surface);
            border-radius: var(--radius-lg);
            padding: 20px;
            border: 1px solid var(--border);
            box-shadow: var(--shadow-sm);
            margin-bottom: 20px;
        }

        .history-card::before {
            content: '';
            position: absolute;
            left: -22px;
            top: 24px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: var(--primary);
            border: 2px solid white;
        }

        .history-meta {
            font-size: 13px; color: var(--text-sub); margin-bottom: 8px; font-weight: 600;
        }

        .history-type {
            display: inline-block; padding: 4px 8px; border-radius: 4px; background: #eef2ff; color: var(--primary);
            font-size: 12px; font-weight: 600; margin-bottom: 12px;
        }

        .diff-container {
            background: #f8fafc;
            border-radius: var(--radius-sm);
            padding: 12px;
            font-family: monospace;
            font-size: 13px;
            overflow-x: auto;
            border: 1px solid var(--border);
        }

        .diff-added { color: #166534; background: #dcfce7; padding: 2px 4px; border-radius: 2px;}
        .diff-removed { color: #991b1b; background: #fee2e2; text-decoration: line-through; padding: 2px 4px; border-radius: 2px; margin-right: 4px;}
    </style>
</head>
<body>

<div class="app-container">
    <div class="header">
        <h1>変更履歴</h1>
        <a href="detail.php?id=<?= htmlspecialchars($id) ?>" class="btn-outline">← 戻る</a>
    </div>

    <div class="timeline" id="history-container">
        <div style="color:var(--text-sub);">履歴を読み込み中...</div>
    </div>
</div>

<script>
    const PROJECT_ID = '<?= htmlspecialchars($id) ?>';
    const API_URL = 'api/api.php';

    async function loadHistory() {
        try {
            const res = await fetch(`${API_URL}?action=get_history&project_id=${PROJECT_ID}`);
            const json = await res.json();
            renderHistory(json.data);
        } catch(e) {
            document.getElementById('history-container').innerHTML = '読み込みエラー';
        }
    }

    function renderHistory(histories) {
        const container = document.getElementById('history-container');
        if (!histories || histories.length === 0) {
            container.innerHTML = '<div style="color:var(--text-sub);">履歴がありません</div>';
            return;
        }

        const labels = {
            'project_create': '案件作成',
            'project_update': '案件情報の更新',
            'tasks_update': '工程の更新'
        };

        const statusLabels = {
            'planning': '調整中',
            'in_progress': '進行中',
            'delayed': '遅延',
            'completed': '完了',
            'pending': '未着手',
            'doing': '作業中',
            'done': '完了'
        };

        const html = histories.map(h => {
            const dateStr = new Date(h.timestamp).toLocaleString('ja-JP');
            const typeLabel = labels[h.type] || h.type;
            
            let diffHtml = '<div class="diff-container">';
            
            if (h.type === 'project_create') {
                diffHtml += `<div style="color:var(--primary); font-weight:700;">✨ 案件「${escapeHtml(h.after.title)}」を作成しました</div>`;
            } 
            else if (h.type === 'project_update') {
                const b = h.before || {};
                const a = h.after || {};
                const changes = [];
                if (b.title !== a.title) changes.push(`案件名を <b>「${escapeHtml(b.title)}」</b> から <b>「${escapeHtml(a.title)}」</b> に変更`);
                if (b.status !== a.status) changes.push(`ステータスを <b>「${statusLabels[b.status] || b.status}」</b> から <b>「${statusLabels[a.status] || a.status}」</b> に変更`);
                if (b.type !== a.type) changes.push(`種別を <b>「${escapeHtml(b.type)}」</b> から <b>「${escapeHtml(a.type)}」</b> に変更`);
                if (b.is_public !== a.is_public) changes.push(`公開設定を <b>「${a.is_public ? '公開' : '非公開'}」</b> に変更`);
                
                diffHtml += changes.length > 0 ? changes.join('<br>') : '内容の変更はありませんでした';
            }
            else if (h.type === 'tasks_update') {
                const bTasks = h.before || [];
                const aTasks = h.after || [];
                
                const bMap = new Map(bTasks.map(t => [t.id, t]));
                const aMap = new Map(aTasks.map(t => [t.id, t]));
                
                const changes = [];
                
                // Check for additions and updates
                aTasks.forEach(a => {
                    if (!bMap.has(a.id)) {
                        changes.push(`<span class="diff-added">＋</span> 工程 <b>「${escapeHtml(a.title)}」</b> を追加しました`);
                    } else {
                        const b = bMap.get(a.id);
                        const itemChanges = [];
                        if (b.title !== a.title) itemChanges.push(`名前を「${escapeHtml(a.title)}」に変更`);
                        if (b.start !== a.start || b.end !== a.end) itemChanges.push(`日程を <b>${escapeHtml(a.start || '未定')} 〜 ${escapeHtml(a.end || '未定')}</b> に変更`);
                        if (b.assignee !== a.assignee) itemChanges.push(`担当を <b>「${escapeHtml(a.assignee || '未設定')}」</b> に変更`);
                        if (b.status !== a.status) itemChanges.push(`ステータスを <b>「${statusLabels[a.status] || a.status}」</b> に変更`);
                        
                        if (itemChanges.length > 0) {
                            changes.push(`<span style="color:var(--primary);">●</span> 工程 <b>「${escapeHtml(b.title)}」</b>: ${itemChanges.join(' / ')}`);
                        }
                    }
                });
                
                // Check for removals
                bTasks.forEach(b => {
                    if (!aMap.has(b.id)) {
                        changes.push(`<span class="diff-removed">－</span> 工程 <b>「${escapeHtml(b.title)}」</b> を削除しました`);
                    }
                });
                
                diffHtml += changes.length > 0 ? changes.join('<br>') : '工程の順序を入れ替えました';
            }

            diffHtml += '</div>';

            return `
                <div class="history-card">
                    <div class="history-meta">${dateStr}</div>
                    <div class="history-type">${typeLabel}</div>
                    ${diffHtml}
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    function escapeHtml(unsafe) {
        return (unsafe || '').toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    loadHistory();
</script>

</body>
</html>
