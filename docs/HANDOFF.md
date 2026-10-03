# HANDOFF：交接文件（給下一個 session）

> 本文件是專案狀態的**唯一事實來源**。新 session 先讀這份，再讀各模組的 STATUS：
> - `film/STATUS.md`
> - `film/src/chars/{him,ai}.STATUS.md`
> - `film/src/sets/STATUS.md`
> - `film/src/scenes/README.md`
> - `music/vocal/STATUS.md`
> - `music/diffsinger/README.md`
>
> 工作分支：`claude/compassionate-dijkstra-16o5bo`。Mac 本機分支：`claude/mac-local`。對話一律使用**中文**。

---

## 0. 一分鐘摘要

**目標**：為「病名為AI / The Disease Called AI」做一支帶雙語歌詞動畫的 MV。主題是病態、無法自拔的 AI 依賴。歌、歌聲、畫面全部原創，以程式碼生成。交付要求：
- 完整工程推上 GitHub；
- MP4 放在 `output/`，小於 95 MB；
- 雙語 README，結尾是「來自 Claude Opus 5.5 的思考」。

**現況**（2026-10-03）：

| 部分 | 狀態 |
|---|---|
| 樂譜、歌聲（DiffSinger）、混音、母帶 | ✅ 定稿：−11.01 LUFS／−1.32 dBTP，WER 主唱 0.062，0 句不合格 |
| 盲測分析 | ✅ 172.007 BPM、節拍誤差 2.5 ms、小節線命中 100 % |
| 手繪水彩引擎、角色、場景 | ✅ |
| 67 個鏡頭（S00–S13） | ✅ 全部通過審稿 |
| 全片算圖與交付 MP4 | ✅ 在 M5 上 8.4 分鐘算完（v2，含最後潤飾）；`output/病名為AI_The_Disease_Called_AI.mp4` 93.65 MB，−11.1 LUFS，音畫逐樣本對齊（`docs/tasks/mac_03_report.md`）；HQ 版留在委託者的 Mac |
| README | ✅ 完成（含劇照） |

---

## 1. 使用者的決定（全部有效）

1. **原創歌曲**：標題只是致敬 Neru《病名は愛だった》，不使用原曲任何素材。英文演唱，中文字幕。
2. **全片手繪水彩**：用 p5.js + p5.brush，方法改寫自 ClaudeAnimationBase（MIT）。**禁止用 SVG 或平面向量圖的畫法**；細節要多。
3. **選角**：
   - **他**：原創的年輕 AI 工程師，親手訓練了這個 AI。體型纖瘦，原創的動漫臉，不像任何真人。
   - **她**：AI，鯨魚女僕女孩，**嚴格依照**委託者提供的參考圖（`docs/reference/ai_character_reference.webp`、`ai_character_reference_full.png`，委託者用 GPT 生成，無版權疑慮，允許量測）。參考圖只拿來量測和取色，不畫進畫面。
   - 委託者曾要求以真實人物的形象設計男主角，**已婉拒**；改用通用特徵，委託者同意。**不使用真人肖像，不使用任何公司的商標或名稱。**
4. **歌聲**：DiffSinger。他用 **TIGER v106**，她用 **Hoshino Hanami ~AI❤dol~**（Nectar 模式）。口白用 Kokoro。全曲移調 −2 半音。**非營利**發布；聲庫只標示來源，**不重新散布**。
5. **分鏡**：`film/STORYBOARD.md` v3 已定案。
   - 保留「枕邊的她其實是手機」的揭露（07B 是他的投影）；
   - 結尾保留兩種讀法；
   - 病歷夾寫 `A.I.`，最後掉下 `A.`。
6. **審美**：委託者把美術判斷交給主 session（「我更想知道你的審美，所以你來決定」），但選角、結尾這類重大岔路仍先問委託者。
7. **成本**：子代理**預設用 Sonnet**；機械性的工作用 Haiku；只有關鍵美術判斷、而且 Sonnet 反覆失敗時才用 Opus（例如 06F 海報鏡頭）。同時最多 2–3 個代理。
8. **Colab**：CLI 登入被環境的安全檢查擋下，委託者已暫停。保留 `tools/colab_render.ipynb` 當備案：委託者自己在 Colab 跑，再上傳到私有 repo `voicebank-cache` 的 release。
9. **委託者的 Mac**（Apple M5、Metal）：是正式的製作和算圖機器。算圖比雲端的 SwiftShader 快 20 倍以上。

---

## 2. 架構與檔案

| 部分 | 位置 | 備註 |
|---|---|---|
| 樂譜 | `music/score/song.py` → `music/build/{arrangement,events,vocals}.json`、`score.mid` | 172 BPM，C 小調；最終副歌升到 D 小調；拉霸中獎兩小節是 C 大調。全長 215.000 s |
| 歌聲 | `music/vocal/`、`music/diffsinger/` | `ourender` 是無頭 OpenUtau.Core（CPU）。種子化的擴散雜訊讓結果可重現（`openutau-seeded-noise.patch`）。`takes.json` 記錄選中的 take，`diction.json` 是咬字微調 |
| 混音 | `music/engine/mix.py` | 人聲高通 80 Hz。`music/build/master.flac`（16-bit）已進 git，用來和畫面合成 |
| 分析 | `analysis/analyze.py` | 產出 `film/data/timeline.json`、`docs/analysis.png`、`analysis/report.json` |
| 引擎 | `film/core.js`、`timeline.js`、`data.js`、`lyrics.js`、`render.mjs` | 一切都是 t 的純函數。`cachedLayer` 快取靜態水彩層。歌詞會依背景明暗自動換墨色，必要時加暗底 |
| 角色 | `film/src/chars/` | 他：`him*.js`。她：`ai*.js`。API 寫在各自的 STATUS |
| 場景 | `film/src/sets/` | 房間、病房、螢幕、病歷、告解室、虛空、片尾卡 |
| 鏡頭 | `film/src/scenes/` | `_kit.js` 是共用工具；每個段落一個檔案 |
| 審稿紀錄 | `docs/tasks/feedback/G1–G6.md`、`docs/review/` | 每組的回饋與審稿圖 |
| 交付 | `tools/assemble.py` | 兩遍編碼控制在 95 MB 以內，另出一份 CRF 16 的 HQ 版（不進 git） |

**不在 git 裡的東西**：`music/diffsinger/voicebanks/`（用 `fetch_voicebanks.sh` 重裝；官方來源被擋時，私有 repo `f0909172434/voicebank-cache` 的 release 有備份）、`music/build/master.wav`、`stems/`、`cache/`、`output/sheets/`、`output/preview/`。

---

## 3. 雲端 ↔ Mac 的工作方式

- **雲端主 session → Mac**：用 claude-code-remote 的 `send_message` 傳到 Mac session（標題「新建本机对话」；ID 用 `list_sessions` 查）。任務寫在 `docs/tasks/mac_0X_*.md`。
- **Mac → 雲端**：commit 並 push 到 `claude/mac-local`，訊息以 `[review]`／`[ask]`／`[wip]` 開頭。雲端用背景迴圈 `git ls-remote` 監看，遇到 `[review]`／`[ask]` 才醒來。
- **審稿**：抽出 `docs/review/<組>/` 的縮圖表和關鍵畫面，對照 STORYBOARD 的 read 來審，回饋寫進 `docs/tasks/feedback/<組>.md`。
- **共用檔案**：只有 Mac 的總負責可以改（`_kit.js`、chars、sets、`lyrics.js`、`core.js`）。動到外觀時先用 `[ask]`。

---

## 4. 下一步

成品已經交付，最後一輪潤飾（02G 被子、09B 嘴型、09H 掌心、巨大的手）也已完成，並重算為 v2。
- 已發布（2026-10-04）：YouTube https://youtu.be/ha-ANfqri6g（公開）、bilibili https://www.bilibili.com/video/BV1VxHi6mELF。標題和簡介在 `docs/release/`，上傳紀錄在 `docs/tasks/mac_04_report.md`。B站的標題是委託者刻意定為「病名为AI」（簡體），YouTube 的是「病名為愛」。
- 改了任何鏡頭，都在 Mac 上重算全片（約 8.4 分鐘），再跑 `tools/assemble.py`。整部片必須在同一台機器上算。

---

## 5. 重要約束

- **版權**：歌詞、旋律、編曲、畫面全部原創。聲庫不進 repo、不重新散布。
- **不使用真人肖像，不使用公司商標。**
- **可重現性**：算圖必須是 `t` 的純函數，禁用 `Math.random`／`Date`／`performance.now`。整部片要在同一台機器、同一個 GL 後端上算，畫面才會一致。
- **檔案大小**：最終 MP4 < 95 MB。
- **模型識別**：commit 結尾照系統指定的 attribution；repo 內不寫模型 ID 字串。README 反思段的標題「來自 Claude Opus 5.5 的思考」是委託者明確要求的。
- **Stop hook**：只要有未提交的變更就會觸發，觸發時 commit 並 push WIP 即可。

---

## 6. 給新 session 的開場指令（委託者複製貼上）

> 請接手 GitHub 專案 f0909172434/The-Disease-Called-AI：切到分支 `claude/compassionate-dijkstra-16o5bo`，先讀 `docs/HANDOFF.md`，然後從「下一步」繼續。全程用中文和我溝通。
