# NexBuildLF Resume Guide (引き継ぎガイド)

## 現在の状態 (Current State)
- **UI改善フェーズ完了**: ガントチャートの視認性向上、UIスケール設定、打ち合わせモード、Aboutページの実装が完了しました。
- **ビルド・同期完了**: `npm run build` および `npx cap sync android` が通り、Androidネイティブ環境への反映が可能な状態です。
- **ドキュメント更新**: `DEVELOPMENT_LOG.md` および `PROGRESS.md` に今回の変更内容を記録済みです。

## 次にやるべきこと (Next Steps)
1.  **iOS TestFlight 準備**: `docs/IOS_TESTFLIGHT_PLAN.md` に基づき、Xcode環境でのビルドと配布テストを実施してください。
2.  **実機テスト**: Android/iOS実機での「打ち合わせモード」の操作感（特にピンチイン・アウトやスクロールの感触）を検証してください。
3.  **ストレージ移行検討**: 現在は `LocalStorage` を使用していますが、データ量増加に備え SQLite への移行（Issue #5）のタイミングを検討してください。

## 注意事項 (Notes)
- **ビルド時の注意**: `useSearchParams` を使用しているページは、必ず `Suspense` でラップされていることを確認してください（プリレンダリングエラー防止のため）。
- **SQLite禁止継続**: 現フェーズではSQLiteの改修は禁止されています。UI/UXに集中してください。
