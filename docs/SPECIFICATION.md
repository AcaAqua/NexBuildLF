# Technical Specification - NexBuildLF

## 1. データ構造 (Data Model)

### Project
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | ユニークID (`proj-` prefix) |
| `title` | `string` | 現場名・工事名 |
| `type` | `string` | 工事種別 (新築, 改修, 土木, その他) |
| `status` | `enum` | `planning`, `in_progress`, `delayed`, `completed` |
| `location` | `string` | 現場住所（天気予報連動用） |
| `memo` | `string?` | 現場全体の特記事項 |
| `isArchived`| `boolean` | アーカイブフラグ |
| `tasks` | `Task[]` | 工程の配列 |

### Task
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | ユニークID (`task-` prefix) |
| `title` | `string` | 工程名 |
| `periods` | `Period[]` | 複数の期間設定 |
| `assignee` | `string` | 担当・協力業者 |
| `status` | `enum` | `pending`, `doing`, `done` |
| `memo` | `string?` | 工程ごとの詳細メモ |

## 2. UI/UX 規格 (UI Standards)

### カラーパレット (Base HSL)
- **Primary**: `var(--primary)` - #0071e3 (Apple Blue)
- **Surface**: `var(--surface)` - #ffffff (Pure White)
- **Background**: `var(--background)` - #fbfbfd (Off White)
- **Text**: `var(--text-main)` - #1d1d1f (Anthracite)

### レスポンシブ挙動
- **Desktop (> 1024px)**: 2カラムグリッド表示。
- **Tablet (600px - 1024px)**: 1カラムまたはグリッド表示。
- **Mobile (< 600px)**:
    - リスト形式。
    - `IconButton` のラベル非表示化。
    - ボトムナビゲーションによる片手操作の最適化。

## 3. CSVフォーマット (CSV Format)
ヘッダー行は以下の英名を使用し、インポート時はこれを基準にマッピングします：
`id, title, type, status, location, progress, updatedAt, memo`

## 4. 共通コンポーネント
- **`IconButton`**: `btn-text` クラスを持つスパンでテキストを囲むことで、レスポンシブなラベル制御が可能。
- **`FilterBar`**: 状態、業者、種別の複合フィルタを提供。
- **`ExportMenu`**: データポータビリティの起点となる共通UI。
