<?php
// share.php - 共有用閲覧専用画面 (No auth requires to view, controlled by token)
$token = $_GET['token'] ?? '';
if (!$token) {
    die('Invalid Link');
}

$schedulesFile = __DIR__ . '/../data/schedules.json';
if (!file_exists($schedulesFile)) {
    die('System Error: Data not found');
}

$schedules = json_decode(file_get_contents($schedulesFile), true) ?: [];
$project = null;
foreach ($schedules as $p) {
    if (($p['share_token'] ?? '') === $token) {
        $project = $p;
        break;
    }
}

if (!$project || ($project['is_public'] === false)) {
    // もし管理者としてログインしていれば閲覧を許可する（プレビュー用）
    if (!isset($_SESSION['is_logged_in']) || $_SESSION['is_logged_in'] !== true) {
        die('
        <!DOCTYPE html>
        <html lang="ja">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>非公開 - 工程共有</title>
            <style>
                body { font-family: sans-serif; background: #f7f9fc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                .card { background: white; padding: 40px; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); text-align: center; max-width: 400px; }
                h2 { color: #2d3748; margin-top: 0; }
                p { color: #718096; line-height: 1.6; }
            </style>
        </head>
        <body>
            <div class="card">
                <h2>🔒 現在非公開です</h2>
                <p>この工程表は現在管理者によって非公開に設定されています。最新の情報については担当者までお問い合わせください。</p>
            </div>
        </body>
        </html>
        ');
    }
}

// Security: filter internal metadata basically not needed for sharing
$title = $project['title'];
$type = $project['type'];
$tasks = $project['tasks'] ?? [];

// Sort tasks based on state conceptually or keep array order
$statusLabels = [
    'pending' => '未着手',
    'doing' => '作業中',
    'done' => '完了'
];

?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>工程共有 - <?= htmlspecialchars($title) ?></title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js"></script>
    <style>
        :root {
            --bg-color: #f7f9fc;
            --surface: #ffffff;
            --text-main: #2d3748;
            --text-sub: #718096;
            --primary: #4f46e5;
            --border: #e2e8f0;
            --radius-lg: 16px;
            --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-main);
            margin: 0; padding: 0;
            -webkit-font-smoothing: antialiased;
        }

        .container { max-width: 800px; margin: 0 auto; padding: 24px; }
        
        .header { text-align: center; margin-bottom: 32px; }
        .header h1 { font-size: 22px; margin: 0 0 8px 0; }
        .header p { color: var(--text-sub); margin: 0; font-size: 14px; }

        .task-card {
            background: var(--surface);
            border-radius: var(--radius-lg);
            padding: 16px 20px;
            margin-bottom: 12px;
            border: 1px solid var(--border);
            box-shadow: var(--shadow-sm);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .task-title { font-size: 16px; font-weight: 600; margin: 0 0 4px 0; }
        .task-meta { font-size: 13px; color: var(--text-sub); display: flex; gap: 12px; }

        .badge {
            padding: 6px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600;
        }
        .badge.pending { background: #f3f4f6; color: #4b5563; }
        .badge.doing { background: #e0e7ff; color: #3730a3; }
        .badge.done { background: #dcfce7; color: #166534; }

        .print-btn {
            display: block; width: 100%; text-align: center; background: white; border: 1px solid var(--border);
            padding: 12px; border-radius: 8px; margin-top: 32px; cursor: pointer; font-weight: 600;
        }

        @media print {
            .print-btn { display: none; }
            body { background: white; }
            .task-card { box-shadow: none; border-color: #ddd; }
            .gantt-container { box-shadow: none; border: none; overflow: visible; }
        }

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
        .gantt-grid { display: grid; gap: 8px 0; min-width: 600px; }
        .gantt-header {
            display: grid; font-size: 11px; color: var(--text-sub); font-weight: 600;
            text-align: center; border-bottom: 1px solid var(--border);
            padding-bottom: 8px; margin-bottom: 12px;
        }
        .gantt-header span { border-left: 1px solid #edf2f7; }
        .gantt-row {
            display: grid; align-items: center; height: 32px;
            background: #f8fafc; border-radius: var(--radius-sm);
        }
        .gantt-bar {
            height: 24px; border-radius: 4px; display: flex; align-items: center;
            padding: 0 8px; font-size: 11px; font-weight: 600; color: white;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .gantt-bar.pending { background: #94a3b8; }
        .gantt-bar.doing { background: var(--primary); }
        .gantt-bar.done { background: var(--success); }

        /* Weather Icons */
        .weather-icon { font-size: 16px; margin-top: 2px; display: block; line-height: 1; }
        .gantt-day-label { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; height: 100%; min-height: 36px; padding-top: 4px; }

        /* Adjustment Form */
        .adj-section { background: var(--surface); border-radius: var(--radius-lg); padding: 24px; border: 1px solid var(--border); box-shadow: var(--shadow-sm); margin: 24px 0; }
        .form-row { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
        .form-col { flex: 1; min-width: 140px; }
        .form-col label { display: block; font-size: 11px; color: var(--text-sub); margin-bottom: 4px; font-weight: 700; }
        .input-text { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px; box-sizing: border-box; }
        .btn-submit { background: var(--primary); color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; width: 100%; transition: opacity 0.2s; }
        .btn-submit:hover { opacity: 0.9; }
        .btn-submit:disabled { opacity: 0.5; cursor: default; }

        /* History Card */
        .history-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: var(--radius-lg); padding: 20px; margin-bottom: 24px; }
        .history-status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-bottom: 8px; }
        .status-confirmed { background: var(--success); color: white; }
        .status-pending { background: #94a3b8; color: white; }
    </style>
</head>
<body>

<div class="container">
    <div class="header">
        <h1><?= htmlspecialchars($title) ?></h1>
        <p>工事種別: <?= htmlspecialchars($type) ?> / 最終更新: <?= htmlspecialchars(date('Y/m/d H:i', strtotime($project['updated_at']))) ?></p>
    </div>

    <!-- Gantt Chart -->
    <div id="gantt-container" class="gantt-container" style="display:none;"></div>

    <!-- 申請履歴表示エリア -->
    <div id="adj-history-container" style="display:none;">
        <div class="history-card">
            <h3 style="margin-top:0; font-size:16px; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
                📝 あなたの申請状況
            </h3>
            <div id="adj-history-content"></div>
            <p style="font-size:11px; color:#166534; margin-top:12px; border-top:1px solid #bbf7d0; pt:12px;">
                ※ 内容を変更したい場合は、下のフォームから再度送信してください。
            </p>
        </div>
    </div>

    <!-- 打ち合わせ日程調整セクション -->
    <div id="adj-section" class="adj-section" style="display:none;">
        <h3 style="margin-top:0; font-size:18px; margin-bottom:16px;">📅 打ち合わせ希望日の調整</h3>
        <p style="font-size:13px; color:var(--text-sub); margin-bottom:20px;">
            打ち合わせの候補日（第1〜第3希望）をご登録ください。管理者が確認後、どの日程で確定するかを決定します。
        </p>
        <form id="adj-form" onsubmit="submitAdjustment(event)">
            <div class="form-row">
                <div class="form-col" style="flex: 2;">
                    <label>お名前 / 会社名</label>
                    <input type="text" id="adj-name" class="input-text" required placeholder="例: 吉野様 / 〇〇建設 田中">
                </div>
                <div class="form-col" style="flex: 1;">
                    <label>連絡先 (電話番号)</label>
                    <input type="tel" id="adj-contact" class="input-text" required placeholder="例: 090-0000-0000">
                </div>
            </div>

            <div class="form-row" style="margin-top: 12px;">
                <div class="form-col" style="flex: 2;">
                    <label>打ち合わせしたい内容 (簡潔に)</label>
                    <textarea id="adj-message" class="input-text" rows="2" placeholder="例: クロスの色の最終確認、追加コンセントの配置について等"></textarea>
                </div>
                <div class="form-col" style="flex: 1;">
                    <label>緊急度</label>
                    <select id="adj-priority" class="input-text">
                        <option value="low">いつでも可 (緩め)</option>
                        <option value="normal" selected>普通</option>
                        <option value="high">緊急 (至急)</option>
                    </select>
                </div>
            </div>
            
            <div id="adj-prefs-container" style="margin-top:16px; display:flex; flex-direction:column; gap:8px;">
                <?php for ($rank = 1; $rank <= 3; $rank++): ?>
                <div style="background:#f8fafc; padding:12px; border-radius:12px; border:1px solid #edf2f7;">
                    <div style="font-size:12px; font-weight:700; color:var(--text-sub); margin-bottom:8px;">第<?= $rank ?>希望</div>
                    <div style="display:flex; gap:8px;">
                        <input type="date" id="adj-date-<?= $rank ?>" class="input-text" style="flex:2;" <?= $rank===1?'required':'' ?>>
                        <input type="time" id="adj-time-<?= $rank ?>" class="input-text" style="flex:1;" <?= $rank===1?'required':'' ?>>
                    </div>
                </div>
                <?php endfor; ?>
            </div>

            <div style="margin-top:24px;">
                <button type="submit" id="btn-adj-submit" class="btn-submit">この日程で登録する</button>
            </div>
        </form>
    </div>

    <div>
        <h3 style="font-size: 18px; margin-bottom: 16px;">工程リスト</h3>
        <?php if (empty($tasks)): ?>
            <div style="text-align:center; color: var(--text-sub); padding: 40px;">現在登録されている工程はありません。</div>
        <?php else: ?>
            <?php foreach ($tasks as $task): ?>
            <div class="task-card">
                <div>
                    <h4 class="task-title"><?= htmlspecialchars($task['title']) ?></h4>
                    <div class="task-meta">
                        <span>📅 <?= htmlspecialchars($task['start'] ?: '未定') ?> 〜 <?= htmlspecialchars($task['end'] ?: '未定') ?></span>
                        <span>👷 <?= htmlspecialchars($task['assignee'] ?: '担当未定') ?></span>
                    </div>
                </div>
                <div>
                    <span class="badge <?= htmlspecialchars($task['status']) ?>"><?= $statusLabels[$task['status']] ?? '未着手' ?></span>
                </div>
            </div>
            <?php endforeach; ?>
        <?php endif; ?>
    </div>

    <button class="print-btn" onclick="window.print()">工程表を印刷 / PDF保存</button>
    <button class="print-btn" onclick="exportToExcel()" style="margin-top: 12px; border-color:#10b981; color:#10b981;">工程表をExcelでダウンロード(.xlsx)</button>
</div>

<script>
    const project = <?= json_encode($project, JSON_UNESCAPED_UNICODE) ?>;
    const shareToken = '<?= htmlspecialchars($token) ?>';
    let weatherCache = {};
    
    function escapeHtml(unsafe) {
        return (unsafe || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function getWeatherEmoji(code) {
        if (code === 0) return '☀️';
        if (code <= 3) return '🌤️';
        if (code <= 48) return '🌫️';
        if (code <= 57) return '🌦️';
        if (code <= 67) return '🌧️';
        if (code <= 77) return '❄️';
        if (code <= 82) return '🚿';
        if (code <= 86) return '❄️';
        if (code <= 99) return '⚡';
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
                data.daily.time.forEach((time, i) => { weatherMap[time] = data.daily.weather_code[i]; });
                weatherCache[cacheKey] = weatherMap;
                return weatherMap;
            }
        } catch (e) { console.error(e); }
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

        const feats = project.features || { weather: true, adjustment: true };
        let weatherData = null;
        if (feats.weather && project.lat && project.lon) {
            weatherData = await fetchWeatherData(project.lat, project.lon);
        }

        let headerHtml = `<div class="gantt-header" style="grid-template-columns: 140px repeat(${totalDays}, 1fr);">`;
        headerHtml += `<div>工程名</div>`;
        for (let i = 0; i < totalDays; i++) {
            let d = new Date(minDate.getTime() + i * dayMs);
            let dateKey = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            
            let label = d.getDate();
            if (label === 1 || i === 0) label = (d.getMonth()+1) + '/' + label;
            
            let weatherEmoji = '';
            if (weatherData && weatherData[dateKey] !== undefined) {
                weatherEmoji = `<span class="weather-icon">${getWeatherEmoji(weatherData[dateKey])}</span>`;
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
                <div class="gantt-bar ${task.status}" style="grid-column: ${startCol} / ${endCol};">
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
            <h3 style="margin-top:0; font-size:16px; margin-bottom:16px;">タイムライン（ガントチャート）</h3>
            <div class="gantt-grid" style="position:relative;">
                ${headerHtml}
                ${rowsHtml}
                ${todayHtml}
            </div>
        `;
    }

    async function exportToExcel() {
        if (!project || !project.tasks || project.tasks.length === 0) {
            alert("出力する工程がありません");
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('ガントチャート');

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

        minDate.setDate(minDate.getDate() - 1);
        maxDate.setDate(maxDate.getDate() + 2);
        
        const dayMs = 1000 * 60 * 60 * 24;
        const totalDays = Math.round((maxDate - minDate) / dayMs) + 1;

        const headers = ['工程名', '担当者'];
        for (let i = 0; i < totalDays; i++) {
            let d = new Date(minDate.getTime() + i * dayMs);
            let dayNames = ['日', '月', '火', '水', '木', '金', '土'];
            headers.push(`${d.getMonth()+1}/${d.getDate()}(${dayNames[d.getDay()]})`);
        }
        
        const headerRow = sheet.addRow(headers);
        headerRow.font = { bold: true };
        headerRow.alignment = { horizontal: 'center' };
        
        sheet.getColumn(1).width = 30;
        sheet.getColumn(2).width = 15;
        for (let i = 0; i < totalDays; i++) {
            sheet.getColumn(i + 3).width = 5;
            sheet.getColumn(i + 3).alignment = { horizontal: 'center' };
        }

        const statusColors = {
            'pending': 'FF94A3B8', // Gray
            'doing': 'FF4F46E5',   // Blue component
            'done': 'FF10B981'     // Green
        };

        project.tasks.forEach(task => {
            const rowData = [task.title, task.assignee || ''];
            for (let i = 0; i < totalDays; i++) rowData.push('');
            
            const row = sheet.addRow(rowData);
            row.height = 20;
            
            let s = task.start ? new Date(task.start) : null;
            let e = task.end ? new Date(task.end) : null;
            if (!s && e) s = e;
            if (!e && s) e = s;

            if (s && e) {
                let startColIdx = Math.round((s - minDate) / dayMs) + 3;
                let endColIdx = Math.round((e - minDate) / dayMs) + 3;
                
                const color = statusColors[task.status] || 'FF94A3B8';
                
                for (let c = startColIdx; c <= endColIdx; c++) {
                    const cell = row.getCell(c);
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: color }
                    };
                }
            }
            
            row.getCell(1).alignment = { wrapText: true, vertical: 'middle' };
            row.getCell(2).alignment = { vertical: 'middle' };
        });

        // Add freeze pane
        sheet.views = [ { state: 'frozen', xSplit: 2, ySplit: 1 } ];

        try {
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `工程表_${project.title}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch(err) {
            console.error(err);
            alert("Excel生成に失敗しました。");
        }
    }

    async function submitAdjustment(e) {
        e.preventDefault();
        const btn = document.getElementById('btn-adj-submit');
        btn.disabled = true;
        btn.textContent = '登録中...';

        const prefs = [];
        for (let i = 1; i <= 3; i++) {
            const date = document.getElementById(`adj-date-${i}`).value;
            const time = document.getElementById(`adj-time-${i}`).value;
            if (date) {
                prefs.push({ rank: i, date, time, status: 'pending' });
            }
        }

        const fd = new FormData();
        fd.append('action', 'submit_adjustment');
        fd.append('project_id', project.id);
        fd.append('token', shareToken);
        fd.append('name', document.getElementById('adj-name').value);
        fd.append('contact', document.getElementById('adj-contact').value);
        fd.append('message', document.getElementById('adj-message').value);
        fd.append('priority', document.getElementById('adj-priority').value);
        fd.append('preferences', JSON.stringify(prefs));

        try {
            const res = await fetch('api/api.php', { method: 'POST', body: fd });
            const result = await res.json();
            if (result.status === 'success') {
                // 電話番号をブラウザに記憶
                localStorage.setItem(`adj_contact_${project.id}`, contact);
                alert('希望日を登録しました。管理者に通知が届きます。');
                location.reload();
            } else {
                alert('登録に失敗しました: ' + result.message);
                btn.disabled = false;
                btn.textContent = 'この日程で登録する';
            }
        } catch (e) {
            alert('通信エラーが発生しました');
            btn.disabled = false;
        }
    }

    function initUI() {
        const feats = project.features || { weather: true, adjustment: true };
        if (feats.adjustment) {
            document.getElementById('adj-section').style.display = 'block';
            checkAdjustmentHistory();
        }
        renderGantt();
    }

    function checkAdjustmentHistory() {
        const savedContact = localStorage.getItem(`adj_contact_${project.id}`);
        if (!savedContact || !project.adjustments) return;

        const myAdj = project.adjustments.find(a => a.contact === savedContact);
        if (!myAdj) return;

        // フォームを事前入力
        document.getElementById('adj-name').value = myAdj.name || '';
        document.getElementById('adj-contact').value = myAdj.contact || '';
        document.getElementById('adj-message').value = myAdj.message || '';
        document.getElementById('adj-priority').value = myAdj.priority || 'normal';
        
        if (myAdj.preferences) {
            myAdj.preferences.forEach(p => {
                if (document.getElementById(`adj-date-${p.rank}`)) {
                    document.getElementById(`adj-date-${p.rank}`).value = p.date;
                    document.getElementById(`adj-time-${p.rank}`).value = p.time;
                }
            });
        }

        // 履歴表示の構築
        const historyContainer = document.getElementById('adj-history-container');
        const content = document.getElementById('adj-history-content');
        
        let statusHtml = '';
        const confirmedPref = myAdj.preferences.find(p => p.status === 'confirmed');
        if (confirmedPref) {
            statusHtml = `<div class="history-status status-confirmed">✅ 第${confirmedPref.rank}希望で確定しました (${confirmedPref.date} ${confirmedPref.time})</div>`;
        } else {
            statusHtml = `<div class="history-status status-pending">⏳ 確認中</div>`;
        }

        content.innerHTML = `
            ${statusHtml}
            <div style="font-size:14px; font-weight:700;">${escapeHtml(myAdj.name)} 様</div>
            <div style="font-size:13px; color:#166534; margin-top:4px;">
                内容: ${escapeHtml(myAdj.message || '(未記入)')}
            </div>
        `;
        historyContainer.style.display = 'block';
    }

    initUI();
</script>
</body>
</html>
