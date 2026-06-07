# Android実機導入前チェック

この文書は配布物を作るための手順ではなく、Android端末へ入れる前に確認する項目をまとめたものです。

## 前提

- アプリID: `com.luckyfields.nexbuildlf`
- Android表示名: `工程管理 Pro`
- Web/PWA表示名: `工程管理 Pro`
- 静的出力先: `out`
- Capacitor Webディレクトリ: `out`

## 事前確認コマンド

以下が通ることを確認してから、必要な担当者がAndroid実機導入作業へ進みます。

```powershell
npm run typecheck
npm run lint
npm run build
npx cap sync android
```

Androidビルドを確認する場合:

```powershell
cd android
.\gradlew.bat assembleDebug
```

## 実機導入前の確認項目

- Androidのアプリ名が `工程管理 Pro` と表示される。
- 初回起動でダッシュボードが表示され、白画面にならない。
- 工程表がスマホ縦向き・タブレット横向きで見切れない。
- 工程バーの1回タップで工程記録、2回タップで工程編集が開く。
- 工程編集・工程記録で写真を撮影または選択できる。
- 写真添付時に端末のカメラ権限要求が不自然に失敗しない。
- オフラインまたは通信が弱い状態でも、既存データの閲覧と端末内保存ができる。
- アプリを終了して再起動しても、localStorageの現場・工程・写真・設定が残る。
- 設定画面でバックアップ作成と復元プレビューが動作する。

## 注意

- このチェックは配布そのものを含まない。
- APK/AABのファイル名、サイズ、SHA256は生成した時点で別途確認する。
- 本番公開やストア公開はこの文書の対象外。
