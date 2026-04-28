# Concept & Vision - NexBuildLF

## 1. 存在意義 (Purpose)
建設業界におけるデジタル化は進んでいるものの、多くのツールは「多機能ゆえの複雑さ」や「旧来のUI」に縛られています。
NexBuildLFは、**「思考を妨げない直感性」**と**「プロフェッショナルな情報密度」**を両立させ、現場監督や職人が「使いたくなる」ツールを提供します。

## 2. 設計思想 (Design Philosophy)
- **Less is More**: 必要な情報に1タップでアクセス。モバイルではテキストを排除し、アイコンのみで表示。
- **Fluid Experience**: Framer Motionによる滑らかな遷移。UIの反応が「心地よい」ことがミスを減らします。
- **Data Centric**: データはユーザーのもの。CSVによる入出力は、囲い込みを行わないオープンな姿勢の象徴です。

## 3. SDK配布への構想 (SDK Strategy)
NexBuildLFは、単体のアプリとしてだけでなく、以下の形態での配布を目指しています：


### A. UI Component Library (NexBuild-UI)
- 建設現場に最適化されたUI部品（工程カード、フィルタバー、ガントチャート）をnpmパッケージとして提供。
- 他社の施工管理アプリや自社システムに、NexBuildLFの美学を即座に導入可能にします。


### B. Business Logic SDK
- 工程の並び替えロジック、CSVパース、日付計算などのコアロジックを分離し、ヘッドレスな管理機能を提供。


### C. Ledger Format (LF) の標準化
- CSV/JSONの標準フォーマット「NexBuild Ledger Format」を提唱。異なるアプリ間での工程データ交換を容易にします。

## 4. ロードマップ (Roadmap)
1.  **Phase 1 (Current)**: 共通UIの統合とデータポータビリティ（CSV）の確立。
2.  **Phase 2**: 認証基盤とAPI連携（AWS/Firebase連携）の実装。
3.  **Phase 3**: UIコンポーネントのSDK化とドキュメント整備。
4.  **Phase 4**: 外部プラットフォーム（LINE/Slack等）との通知・連携SDK。
