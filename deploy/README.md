# deploy/ — 毎日自動投稿（launchd）

毎日 **19:00** に `scripts/daily-run.sh`（Docker→VOICEVOX 起動確認→`npm run generate`）を実行し、
Drive 保存と YouTube 公開アップロードまで自動化する launchd 設定。

> 株版 `termcast-app` は 19:30（`com.termcast.daily`）。木材版は 19:00（`com.termcast-wood.daily`）。

## 登録

```bash
cp deploy/com.termcast-wood.daily.plist ~/Library/LaunchAgents/
launchctl unload ~/Library/LaunchAgents/com.termcast-wood.daily.plist 2>/dev/null
launchctl load -w ~/Library/LaunchAgents/com.termcast-wood.daily.plist
launchctl list | grep termcast-wood   # 登録確認
```

## 解除 / 一時停止

```bash
launchctl unload -w ~/Library/LaunchAgents/com.termcast-wood.daily.plist
```

## ログ

- launchd: `~/Library/Logs/termcast-wood/launchd.{out,err}.log`
- 実行ログ: `~/Library/Logs/termcast-wood/generate-YYYY-MM-DD_HHMMSS.log`

## 手動テスト（その場で1本投稿される点に注意）

```bash
zsh scripts/daily-run.sh
```

## メモ
- Mac がスリープ/電源オフだと 19:00 に走らず、次回起動時に実行される（launchd 仕様）。
- 毎回 `pickNext` で「未使用・難易度昇順・カテゴリ分散」で1語選ぶ。素材・台本が揃った用語を
  先に増やしておくほど、自動投稿の品質が安定する（README §3.5.1）。
