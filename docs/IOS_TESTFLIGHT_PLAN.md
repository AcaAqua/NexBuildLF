# NexBuildLF iOS版 (TestFlight) リリースに向けた展望と計画

現在のフェーズでは Android APK の直接配布によるテストを優先していますが、将来的には iPhone ユーザー（社内・協力業者）向けに iOS アプリとしての配布が必須となります。

iOS アプリは Android のように野良アプリ（IPAファイル）を直接配布してインストールさせることがセキュリティ上非常に困難であるため、Apple 公式のベータテストツールである **TestFlight** を利用する必要があります。

## 必要な準備（前提条件）

1. **Mac コンピュータ**
   - iOS アプリのビルドには macOS と Xcode が必須です。
   - 現在の Windows 環境では直接ビルドできないため、Mac の準備、またはクラウドビルド環境（Appflow, GitHub Actions + macOS runner など）の構築が必要です。
2. **Apple Developer Program への登録**
   - 年額 99 USD の開発者アカウント登録が必要です。
   - 法人として登録する場合は DUNS ナンバーの取得が事前に必要になります。
3. **Xcode のインストール**
   - Mac 上で App Store から最新の Xcode をインストールします。

## 今後の実装・公開ステップ

### 1. Capacitor iOS プラットフォームの追加
Mac 環境上で以下のコマンドを実行し、プロジェクトに iOS の設定を追加します。

```bash
npm install @capacitor/ios
npx cap add ios
npx cap sync ios
```

### 2. Xcode での設定とプロビジョニング
```bash
npx cap open ios
```
Xcode が開いたら、以下の設定を行います。
- **Signing & Capabilities**: Apple Developer アカウントでログインし、Bundle Identifier（例: `com.luckyfields.nexbuildlf`）を登録して Provisioning Profile を自動生成します。
- **Info.plist**: カメラや写真ライブラリへのアクセス権限（Privacy - Camera Usage Description 等）など、アプリ内で使用するネイティブ機能のパーミッション記述を追加します。

### 3. Archive と App Store Connect へのアップロード
- Xcode のメニューから `Product > Archive` を実行し、ビルドパッケージを作成します。
- アーカイブ完了後、Organizer ウィンドウから `Distribute App` を選択し、App Store Connect にアップロードします。

### 4. TestFlight での配信
- App Store Connect の Web ダッシュボードにログインします。
- 「TestFlight」タブを開き、テストグループ（内部テストまたは外部テスト）を作成します。
- テスターのメールアドレスを登録し、招待メールを送信します。
- テスターは iPhone に「TestFlight」アプリをインストールし、メールのリンクから NexBuildLF をダウンロード・テストできるようになります。

## 課題と留意点
- **PWA との競合**: すでに Web 版（Netlify）で PWA としてホーム画面に追加可能になっているため、iOS テストまでは「Safari からホーム画面に追加」を代替手段として案内することも有効です。
- **SQLite 移行への影響**: Android 版で IndexedDB や Capacitor Storage でデータを保存している場合、iOS でも同様に動くか確認が必要です。本格リリース時には SQLite Adapter への統一を検討します。
