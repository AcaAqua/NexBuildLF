<?php
// Schedule API Endpoint
require_once __DIR__ . '/../../admin/auth.php';

header('Content-Type: application/json; charset=utf-8');

function jsonResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// ヘルパー: 管理者ログインチェック
function checkAdmin() {
    if (!isset($_SESSION['is_logged_in']) || $_SESSION['is_logged_in'] !== true) {
        jsonResponse(['status' => 'error', 'message' => 'Unauthorized'], 401);
    }
}

$action = $_POST['action'] ?? $_GET['action'] ?? '';

$schedulesFile = __DIR__ . '/../../data/schedules.json';
$historyFile = __DIR__ . '/../../data/history.json';
$logsFile = __DIR__ . '/../../data/logs.json';
$configFile = __DIR__ . '/../../data/schedule_config.json';

function writeJsonSafe($file, $data) {
    $fp = fopen($file, 'c+');
    if (!$fp) return false;
    if (flock($fp, LOCK_EX)) {
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        flock($fp, LOCK_UN);
        fclose($fp);
        return true;
    }
    fclose($fp);
    return false;
}

function readJson($file) {
    if (!file_exists($file)) return [];
    return json_decode(file_get_contents($file), true) ?: [];
}

// ヘルパー: メール通知送信
function sendNotification($subject, $body) {
    global $configFile;
    $config = readJson($configFile);
    if (empty($config) || !isset($config['notifications']) || $config['notifications']['enabled'] !== true) {
        return;
    }
    $to = $config['notifications']['emails'] ?? '';
    if (empty($to)) return;

    mb_language("Japanese");
    mb_internal_encoding("UTF-8");

    $headers = "From: no-reply@" . $_SERVER['HTTP_HOST'];
    
    // 実際にはサーバー設定により mb_send_mail が動作しない場合もありますが、
    // 送信を試みます。
    @mb_send_mail($to, $subject, $body, $headers);
}

try {
    switch ($action) {
        // --- Global Config ---
        case 'get_config':
            checkAdmin();
            $config = readJson($configFile);
            if (empty($config)) {
                $config = [
                    "features" => ["weather" => true, "adjustment" => true],
                    "notifications" => ["enabled" => true, "emails" => ""]
                ];
            }
            jsonResponse(['status' => 'success', 'data' => $config]);
            break;

        case 'save_config':
            checkAdmin();
            $config = json_decode($_POST['config'] ?? '{}', true);
            if (writeJsonSafe($configFile, $config)) {
                jsonResponse(['status' => 'success']);
            } else {
                jsonResponse(['status' => 'error', 'message' => '保存に失敗しました'], 500);
            }
            break;

        case 'get_schedules':
            checkAdmin();
            $data = readJson($schedulesFile);
            jsonResponse(['status' => 'success', 'data' => $data]);
            break;
            
        case 'save_project':
            checkAdmin();
            $projectId = !empty($_POST['id']) ? $_POST['id'] : 'proj_' . uniqid();
            $title = $_POST['title'] ?? '新規案件';
            $type = $_POST['type'] ?? '未分類';
            $status = $_POST['status'] ?? 'planning';
            
            // featuresのパース
            $features = isset($_POST['features']) ? json_decode($_POST['features'], true) : null;
            
            $schedules = readJson($schedulesFile);
            $found = false;
            
            foreach ($schedules as &$proj) {
                if ($proj['id'] === $projectId) {
                    $before = $proj;
                    $proj['title'] = $title;
                    $proj['type'] = $type;
                    $proj['status'] = $status;
                    $proj['location_name'] = $_POST['location_name'] ?? ($proj['location_name'] ?? '');
                    $proj['lat'] = $_POST['lat'] ?? ($proj['lat'] ?? '');
                    $proj['lon'] = $_POST['lon'] ?? ($proj['lon'] ?? '');
                    $proj['is_public'] = isset($_POST['is_public']) ? ($_POST['is_public'] === 'true') : ($proj['is_public'] ?? false);
                    if ($features) {
                        $proj['features'] = $features;
                    }
                    $proj['updated_at'] = date('Y-m-d H:i:s');
                    $found = true;
                    
                    $history = readJson($historyFile);
                    $history[] = [
                        'id' => 'hist_' . uniqid(),
                        'project_id' => $projectId,
                        'timestamp' => date('Y-m-d H:i:s'),
                        'type' => 'project_update',
                        'before' => $before,
                        'after' => $proj
                    ];
                    writeJsonSafe($historyFile, $history);
                    break;
                }
            }
            unset($proj);
            
            if (!$found) {
                $newProj = [
                    'id' => $projectId,
                    'title' => $title,
                    'type' => $type,
                    'status' => $status,
                    'location_name' => $_POST['location_name'] ?? '',
                    'lat' => $_POST['lat'] ?? '',
                    'lon' => $_POST['lon'] ?? '',
                    'is_public' => isset($_POST['is_public']) ? ($_POST['is_public'] === 'true') : false,
                    'features' => $features ?: ["weather" => true, "adjustment" => true],
                    'adjustments' => [],
                    'tasks' => [],
                    'share_token' => bin2hex(random_bytes(16)),
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s')
                ];
                $schedules[] = $newProj;
                
                $history = readJson($historyFile);
                $history[] = [
                    'id' => 'hist_' . uniqid(),
                    'project_id' => $projectId,
                    'timestamp' => date('Y-m-d H:i:s'),
                    'type' => 'project_create',
                    'before' => null,
                    'after' => $newProj
                ];
                writeJsonSafe($historyFile, $history);
            }
            
            if (writeJsonSafe($schedulesFile, $schedules)) {
                jsonResponse(['status' => 'success']);
            } else {
                jsonResponse(['status' => 'error', 'message' => '保存に失敗しました'], 500);
            }
            break;
            
        case 'save_tasks':
            checkAdmin();
            $projectId = $_POST['project_id'] ?? '';
            $tasksJson = $_POST['tasks'] ?? '[]';
            $tasks = json_decode($tasksJson, true);
            if (!$projectId) jsonResponse(['status' => 'error', 'message' => 'Project IDがありません'], 400);
            
            $schedules = readJson($schedulesFile);
            $found = false;
            foreach ($schedules as &$proj) {
                if ($proj['id'] === $projectId) {
                    $before = $proj['tasks'];
                    $proj['tasks'] = $tasks;
                    $proj['updated_at'] = date('Y-m-d H:i:s');
                    $found = true;
                    
                    $history = readJson($historyFile);
                    $history[] = [
                        'id' => 'hist_' . uniqid(),
                        'project_id' => $projectId,
                        'timestamp' => date('Y-m-d H:i:s'),
                        'type' => 'tasks_update',
                        'before' => $before,
                        'after' => $tasks
                    ];
                    writeJsonSafe($historyFile, $history);
                    break;
                }
            }
            if ($found) {
                if (writeJsonSafe($schedulesFile, $schedules)) {
                    jsonResponse(['status' => 'success']);
                } else {
                    jsonResponse(['status' => 'error', 'message' => '保存に失敗しました'], 500);
                }
            } else {
                jsonResponse(['status' => 'error', 'message' => '案件が見つかりません'], 404);
            }
            break;

        // --- Meeting Adjustments ---
        case 'submit_adjustment':
            $projectId = $_POST['project_id'] ?? '';
            $token = $_POST['token'] ?? '';
            $name = $_POST['name'] ?? '';
            $contact = $_POST['contact'] ?? '';
            $message = $_POST['message'] ?? '';
            $priority = $_POST['priority'] ?? 'normal';
            $prefsJson = $_POST['preferences'] ?? '[]';
            $prefs = json_decode($prefsJson, true);

            if (!$projectId || !$token || !$name) {
                jsonResponse(['status' => 'error', 'message' => '不足している項目があります'], 400);
            }

            $schedules = readJson($schedulesFile);
            $authenticated = false;
            foreach ($schedules as &$proj) {
                if ($proj['id'] === $projectId && ($proj['share_token'] ?? '') === $token) {
                    if (!isset($proj['adjustments'])) $proj['adjustments'] = [];
                    // 同一連絡先（電話番号等）があれば更新、なければ追加
                    $updated = false;
                    foreach ($proj['adjustments'] as &$adj) {
                        if ($adj['contact'] === $contact) {
                            $adj['name'] = $name;
                            $adj['message'] = $message;
                            $adj['priority'] = $priority;
                            $adj['preferences'] = $prefs;
                            $updated = true;
                            break;
                        }
                    }
                    if (!$updated) {
                        $proj['adjustments'][] = [
                            'id' => 'adj_' . uniqid(),
                            'name' => $name,
                            'contact' => $contact,
                            'message' => $message,
                            'priority' => $priority,
                            'preferences' => $prefs,
                            'created_at' => date('Y-m-d H:i:s')
                        ];
                    }
                    $proj['updated_at'] = date('Y-m-d H:i:s');
                    $authenticated = true;
                    break;
                }
            }
            if ($authenticated) {
                writeJsonSafe($schedulesFile, $schedules);

                // 通知の送信
                $projectTitle = $proj['title'] ?? '不明な案件';
                $priorityLabel = ['low' => '緩め', 'normal' => '普通', 'high' => '緊急'][$priority] ?? '普通';
                $subject = "【工程調整】{$projectTitle} に新しい希望が届きました";
                $body = "{$projectTitle} の打ち合わせ調整に新しい入力がありました。\n\n"
                      . "登録者: {$name} 様\n"
                      . "連絡先: {$contact}\n"
                      . "緊急度: {$priorityLabel}\n"
                      . "内容: {$message}\n\n"
                      . "詳細は管理画面からご確認ください。\n"
                      . "URL: " . (empty($_SERVER['HTTPS']) ? 'http://' : 'https://') . $_SERVER['HTTP_HOST'] . "/schedule/detail.php?id={$projectId}";
                
                sendNotification($subject, $body);

                jsonResponse(['status' => 'success']);
            } else {
                jsonResponse(['status' => 'error', 'message' => '認証に失敗しました'], 403);
            }
            break;

        case 'update_adjustment_status':
            checkAdmin();
            $projectId = $_POST['project_id'] ?? '';
            $adjustmentId = $_POST['adj_id'] ?? '';
            $rank = intval($_POST['rank'] ?? 0);
            $newStatus = $_POST['status'] ?? ''; // confirmed, pending, cancelled

            $schedules = readJson($schedulesFile);
            foreach ($schedules as &$proj) {
                if ($proj['id'] === $projectId) {
                    if (!empty($proj['adjustments'])) {
                        foreach ($proj['adjustments'] as &$adj) {
                            if ($adj['id'] === $adjustmentId) {
                                foreach ($adj['preferences'] as &$p) {
                                    if ($p['rank'] === $rank) {
                                        $p['status'] = $newStatus;
                                        // 確定(confirmed)にする場合、他のランクを自動的にキャンセル
                                        if ($newStatus === 'confirmed') {
                                            foreach ($adj['preferences'] as &$otherP) {
                                                if ($otherP['rank'] !== $rank) $otherP['status'] = 'cancelled';
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    $proj['updated_at'] = date('Y-m-d H:i:s');
                    break;
                }
            }
            writeJsonSafe($schedulesFile, $schedules);
            jsonResponse(['status' => 'success']);
            break;
            
        case 'get_history':
            checkAdmin();
            $projectId = $_GET['project_id'] ?? '';
            $history = readJson($historyFile);
            if ($projectId) {
                $history = array_filter($history, function($h) use ($projectId) { return $h['project_id'] === $projectId; });
            }
            usort($history, function($a, $b) { return strtotime($b['timestamp']) - strtotime($a['timestamp']); });
            jsonResponse(['status' => 'success', 'data' => array_values($history)]);
            break;

        case 'delete_project':
            checkAdmin();
            $projectId = $_POST['id'] ?? '';
            $schedules = readJson($schedulesFile);
            $newSchedules = array_filter($schedules, function($p) use ($projectId) { return $p['id'] !== $projectId; });
            
            if (count($schedules) !== count($newSchedules)) {
                 writeJsonSafe($schedulesFile, array_values($newSchedules));
                 jsonResponse(['status' => 'success']);
            } else {
                 jsonResponse(['status' => 'error', 'message' => '見つかりませんでした'], 404);
            }
            break;

        default:
            jsonResponse(['status' => 'error', 'message' => '無効なリクエストです'], 400);
    }
} catch (Exception $e) {
    jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
}
