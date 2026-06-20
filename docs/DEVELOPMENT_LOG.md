## Current Phase
**[Phase 6: Deployment Prep & Documentation]**

## Status Summary
- **Target**: UI改善フェーズの完了確認とドキュメント整備
- **Last Action**: ガントチャート修正、表示サイズ設定、打ち合わせモード、Aboutページの実装およびビルド・同期完了
- **Next Step**: iOS TestFlightに向けたビルド検証およびユーザーフィードバックの収集

## Success Log (成功リスト)
- **[2026-04-28]** UI改善フェーズ完了:
  - ガントチャートのレイアウト修正（左列固定・独立スクロール）
  - 表示サイズ設定（小・中・大）の実装
  - 打ち合わせモード（全画面表示）の追加
  - Aboutページの追加
- **[2026-04-28]** ビルドおよびモバイル同期成功（`npm run build`, `npx cap sync android`）
- **[2026-04-28]** Capacitorを用いたAndroidネイティブ化の基盤構築

## Failure / Troubleshooting Log (失敗・課題リスト)
- **[2026-04-28] [Resolved]** `npm run build` 時に `/meeting` ページで `useSearchParams` に起因するプリレンダリングエラーが発生。
  - **解決策**: コンポーネントを `<Suspense>` でラップすることで解決。

---

## Detailed Progress (詳細な進捗)

### 2026-06-20 16:13: 保存読み取りキャッシュと工程表段階描画

#### 目的
Pythonなどの外部補助案は採用せず、アプリ本体だけで軽く効率よく動く方向へ改善する。既存データ形式を変えず、将来SQLite/IndexedDB分離へ移しやすい保存入口と、大量工程時の初期描画負荷低減を先行実装する。

#### 変更内容
- `storage.getProjects()` に同一JSON文字列の再パースを避けるメモリキャッシュを追加。
- `getProjectById`、`getActiveProjects`、`getArchivedProjects` を追加し、画面側が用途別の保存入口を使えるようにした。
- ダッシュボード、予定ボード、保管室、案件詳細、打ち合わせモードの読み取りを用途別APIへ寄せた。
- 工程表は最初に最大40件を描画し、残りは「工程をさらに表示」で段階表示するようにした。
- 大量工程時でも、初回表示で全行のタイムラインDOMを一度に作らない構成へ寄せた。

#### 変更ファイル
- `src/lib/storage.ts`
- `src/components/features/GanttChart.tsx`
- `src/app/page.tsx`
- `src/app/archive/page.tsx`
- `src/app/schedule/page.tsx`
- `src/app/project/page.tsx`
- `src/app/meeting/page.tsx`
- `docs/DEVELOPMENT_LOG.md`

#### 確認結果
- `npm run typecheck` 成功。
- `npm run lint` 成功。
- `npm run build` 成功。
- `npx cap sync android` 成功。
- `android` 配下で `gradlew.bat assembleDebug` 成功。
- APK成果物: `android/app/build/outputs/apk/debug/app-debug.apk`。

#### 残課題
- 40件を超える工程での並び替えは、表示中の工程を優先して並び替え、未表示分は後ろに保持する仕様。大量工程の本格運用では仮想スクロール化が次候補。
- 保存形式自体はまだ単一JSONのため、次段階でRepository層をさらに分け、Android SQLite/Web IndexedDBへ移行しやすくする。

#### 復旧方法
Git管理下の変更のため、必要に応じて該当差分またはコミットを取り消す。

### 2026-06-18 13:16: 配送票・受領票の別ページ印刷

#### 目的
配送票と受領票は同一画面内で無理に切り替えるより、現場で開いてすぐ印刷・確認できる専用ページに分けた方が操作が明確になるため、案件ごとの帳票導線を追加する。

#### 変更内容
- 案件画面のヘッダーに、対象案件を引き継いで開く「配送票」「受領票」導線を追加。
- `/delivery-note` と `/receipt-note` を追加し、A4印刷用のプレビューと入力フォームを別ページ化。
- 印刷専用ページでは共通ナビを非表示にし、戻る・入力・印刷の操作だけに絞った。
- 静的エクスポート環境に合わせ、URLの `projectId` はクライアント側で読み取る方式にした。

#### 変更ファイル
- `src/app/project/page.tsx`
- `src/app/delivery-note/page.tsx`
- `src/app/receipt-note/page.tsx`
- `src/components/features/PrintSlipPage.tsx`
- `docs/DEVELOPMENT_LOG.md`

#### 確認結果
- `npm run typecheck` 成功。
- `npm run lint` 成功。
- `npm run build` 成功。
- `npx cap sync android` 成功。
- `android` 配下で `gradlew.bat assembleDebug` 成功。
- APK成果物: `android/app/build/outputs/apk/debug/app-debug.apk`。
- ローカル検証用の `http://127.0.0.1:3026/delivery-note?projectId=demo-1` で配送票の表示、入力反映、印刷ボタン表示を確認。
- ローカル検証用の `http://127.0.0.1:3026/receipt-note?projectId=demo-1` で受領票の表示、入力反映、共通ナビ非表示を確認。
- 390px幅で横スクロールなし、主要フォームが縦積みで操作できることを確認。

#### 残課題
- 実印刷のPDF余白・プリンタ設定は端末とブラウザ依存のため、実機プリンタでの最終確認が必要。
- 帳票の品目テンプレート、宛先履歴、署名欄の手書き入力は未実装。

#### 復旧方法
Git管理下の変更のため、必要に応じて該当差分またはコミットを取り消す。

### 2026-06-17 23:08: 工程表軽量化と保存診断の追加

#### 目的
テスト版で工程表表示が重く感じる問題に対し、DB構造変更を伴わない範囲で描画負荷と初期表示負荷を下げる。

#### 変更内容
- 工程表の行ごとの日付グリッドDOMを削除し、CSS背景で土日・今日・縦罫線を描画するように変更。
- 案件内タブで非表示の工程表・工程一覧・工程記録をDOMから外し、表示中タブだけ描画するように変更。
- 全案件の保存JSON容量、工程数、記録数、写真数を確認できる保存診断チップを案件画面に追加。
- スクロール同期対象からアンマウント済み要素を除外し、タブ切替後の不要な同期処理を抑制。

#### 変更ファイル
- `src/components/features/GanttChart.tsx`
- `src/app/project/page.tsx`
- `src/lib/storage.ts`
- `docs/DEVELOPMENT_LOG.md`

#### 確認結果
- `npm run typecheck` 成功。
- `npm run lint` 成功。

#### 残課題
- 写真をbase64で案件JSON内に保持しているため、写真が増えると保存・読込が重くなる。次段階でIndexedDB/Androidファイル保存/SQLiteへの分離を検討する。
- 大量工程データ向けには、表示範囲の仮想化とドラッグ処理のさらなる軽量化が必要。

#### 復旧方法
Git管理下の変更のため、必要に応じて該当コミットまたは作業差分を取り消す。

### 2026-06-17 23:24: 写真添付のIndexedDB分離

#### 目的
写真をbase64のまま案件JSONに保持すると、localStorageの保存・読込・共有差分確認が重くなるため、写真本体をIndexedDBへ分離する。

#### 変更内容
- 新規追加する工程写真・工程記録写真をIndexedDBへ保存し、案件JSONには `storageKey` と `byteSize` を保存する方式を追加。
- 既存のbase64写真もそのまま表示できる後方互換を維持。
- 写真表示用の `StoredImage` コンポーネントを追加し、base64/IndexedDB参照の両方を表示可能にした。
- 案件単体共有では、送信前にIndexedDBから写真を復元して、相手端末だけで取り込めるJSONにする。

#### 変更ファイル
- `src/lib/attachmentStore.ts`
- `src/components/ui/StoredImage.tsx`
- `src/components/features/TaskForm.tsx`
- `src/app/project/page.tsx`
- `src/lib/projectShare.ts`
- `src/lib/storage.ts`
- `src/lib/photoUtils.ts`
- `docs/DEVELOPMENT_LOG.md`

#### 確認結果
- `npm run typecheck` 成功。
- `npm run lint` 成功。
- `npm run build` 成功。

#### 残課題
- 既存端末に残っているbase64写真は自動移行していない。次段階で「保存データ軽量化」ボタンまたは初回起動時の任意移行を追加する。
- 設定画面の全体バックアップ/復元は、今回のIndexedDB分離と完全統合していない。案件単体共有は復元対応済み。
- Android APKでのネイティブSQLite/ファイル保存は未実装。現時点ではWeb/Capacitor WebViewのIndexedDBを利用する。

#### 復旧方法
Git管理下の変更のため、必要に応じて該当コミットまたは作業差分を取り消す。

### 2026-06-18 00:15: 既存写真の保存データ軽量化ツール

#### 目的
既存端末に残っているbase64写真を、ユーザー操作でIndexedDBへ移行できるようにし、案件JSONの肥大化を抑える。

#### 変更内容
- 設定画面のデータタブに「保存データを軽量化」カードを追加。
- 未分離写真数、写真容量、保存JSON容量を表示。
- 既存base64写真をIndexedDBへ保存し、案件JSONには `storageKey` と `byteSize` だけを残す手動軽量化処理を追加。
- 全体共有/バックアップ作成時はIndexedDB写真を復元して、相手端末だけで取り込めるJSONを生成。
- 共有データ取り込み時は写真をIndexedDBへ再分離してから端末内へ保存。

#### 変更ファイル
- `src/app/settings/page.tsx`
- `src/lib/attachmentStore.ts`
- `src/lib/storage.ts`
- `docs/DEVELOPMENT_LOG.md`

#### 確認結果
- `npm run typecheck` 成功。
- `npm run lint` 成功。
- `npm run build` 成功。
- `http://127.0.0.1:3025/settings` のデータタブで軽量化カード表示を確認。
- `http://127.0.0.1:3025/project?id=demo-1` の案件画面表示、タブ、保存容量チップ、旧グリッドDOM削減状態を確認。

#### 残課題
- Android APKでのネイティブSQLite/ファイル保存は未実装。現時点ではWebView/ブラウザのIndexedDBを利用する。
- 大量写真を含む実データでの移行時間と端末容量不足時の挙動は実機確認が必要。

#### 復旧方法
Git管理下の変更のため、必要に応じて該当コミットまたは作業差分を取り消す。

### 2026-06-18 11:11: GitHub ReleaseでのAPK直接配布

#### 目的
GitHub ActionsのArtifacts画面を毎回辿らず、固定URLからdebug APKを直接ダウンロードできるようにする。

#### 変更内容
- Android debug APK workflowにRelease公開ステップを追加。
- `debug-latest` Releaseへ `kouteikanri-debug.apk` を上書きアップロードするようにした。
- READMEにAPKの直接DLリンクとReleaseページリンクを追加。

#### 変更ファイル
- `.github/workflows/android-debug-apk.yml`
- `README.md`
- `docs/DEVELOPMENT_LOG.md`

#### 確認結果
- ローカルで `npm run build` 成功。
- ローカルで `npx cap sync android` 成功。
- ローカルで `android/gradlew.bat assembleDebug` 成功。
- APK生成場所: `android/app/build/outputs/apk/debug/app-debug.apk`

#### 残課題
- GitHub上のRelease更新は、GitHubへpush後にworkflow実行結果を確認する。

#### 復旧方法
Git管理下の変更のため、必要に応じて該当コミットまたは作業差分を取り消す。

### 2026-04-28: UI Enhancements (完了)
- [x] `GanttChart.tsx`: Z-indexおよび `position: sticky` 時のレイアウト修正。独立スクロール化。
- [x] `settings/page.tsx` & `globals.css`: UIスケール（文字・要素サイズ）の変更設定を追加。CSS変数による連動。
- [x] `meeting/page.tsx`: 打ち合わせモード（ナビ非表示・全画面）の新規作成。
- [x] `about/page.tsx`: アプリ説明ページの新規作成（テスト版ビジョンの明記）。
