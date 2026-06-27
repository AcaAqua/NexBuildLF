# NexBuildLF (Lightweight Field / Ledger Format)

NexBuildLFは、建設現場の「工程管理」を再定義する、モダンで高機能なフィールドオペレーション・プラットフォームです。
単なる工程管理ツールに留まらず、将来的なSDK配布によるエコシステム形成を目指しています。

## 🌟 Vision
「現場を、スマートに、美しく。」
複雑な建設工程を、Apple/Linearのような洗練されたUIで直感的に管理。CSV連携による柔軟なデータポータビリティと、モバイルファーストな操作性を提供します。

## 🚀 Key Features
- **Unified UI/UX**: 共通化されたフィルタリング、アイコンボタン、モダンなカラーパレット。
- **Flexible Data**: 任意メモ機能、多期工事対応のガントチャート。
- **CSV Portability**: 全データ・選択データのインポート/エクスポートを標準サポート。
- **SDK Ready**: 外部アプリや既存システムに組み込み可能なアーキテクチャ設計。

## 🛠 Tech Stack
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Vanilla CSS (CSS Modules/Global Variables)
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Storage**: Local Storage (IndexedDB/API Integration ready)

## Project Structure

- `web/` - React based construction schedule management app (Next.js)
- `sdk/` - Future SDK package for external data handling
- `docs/` - Documentation and specifications
- `legacy-php/` - Archived PHP prototype files

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Open Source Governance

- License: [MIT](LICENSE)
- Security policy: [SECURITY.md](SECURITY.md)
- Contributing guide: [CONTRIBUTING.md](CONTRIBUTING.md)
- Notices: [NOTICE](NOTICE)
- Changelog: [CHANGELOG.md](CHANGELOG.md)

## Android APK Download

テスト用APKはGitHub Releaseから直接ダウンロードできます。

- 最新debug APK: [kouteikanri-debug.apk](https://github.com/AcaAqua/NexBuildLF/releases/download/debug-latest/kouteikanri-debug.apk)
- Releaseページ: [debug-latest](https://github.com/AcaAqua/NexBuildLF/releases/tag/debug-latest)

`main` へ反映されるたびに GitHub Actions がAPKを再ビルドし、同じURLのファイルを更新します。

## Deployment

NexBuildLF is deployed on Netlify as a root-level Next.js application.

### Netlify Build Settings

- Base directory: empty
- Package directory: empty
- Build command: `npm run build`
- Publish directory: `.next`
- Functions directory: empty
- Runtime: Next.js Runtime

### Important Notes

This project was simplified from an npm workspace / monorepo structure into a root-level Next.js app for stable Netlify deployment.

The previous structure caused dependency installation and publish directory resolution issues on Netlify.

Current deployment assumptions:

- `package.json` is located at the repository root.
- Next.js source files are located at the repository root.
- `.next` is generated at the repository root after `npm run build`.
- `sdk/` may remain in the repository, but it is not part of the production build for now.
- `web/` may remain as legacy/reference material only, unless fully removed later.

### PWA

PWA support is enabled.
After deployment, open the Netlify URL on a smartphone browser and use:

- Chrome / Android: Add to Home screen
- Safari / iOS: Share → Add to Home Screen

---
© 2026 NexBuildLF Project. Built for Professionals.
