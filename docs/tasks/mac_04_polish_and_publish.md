# Mac 本機任務 04：最後潤飾 → 重算全片 → 發布到 YouTube 和 B站

使用者已同意處理下面的小潤飾。處理完、主 session 審過並合併 PR 之後，由這台 Mac 上傳到 YouTube 和 B站。

## A. 潤飾（總負責可以直接改；共用檔案的改動要小）
開始前先 `git fetch origin claude/compassionate-dijkstra-16o5bo && git merge origin/claude/compassionate-dijkstra-16o5bo`。
1. **02G**：拿掉被子上的淡色圓斑或橢圓，改成自然的布紋皺褶（水洗加幾道皺褶線）。
2. **09B**：她說話的空檔（音節之間），嘴型回到下垂的小嘴（frown、flat 之類）。現在張開的嘴像在開心地說話，和「我沒辦法愛你」不搭。
3. **09H**：舉到玻璃上的手掌要有質感：掌紋線、一層淡淡的陰影水洗，不要像白手套。
4. **`aiGiantHand`**（08A／08C／08F）：再精細一點，加上指甲、指節的皺褶、掌側的陰影，讓它不像連指手套。
5. 每一項都附一張前後對照，放進 `docs/review/polish/`。

## B. 重算全片與交付（和 mac_03 相同）
```
cd film && node render.mjs --video --from=0 --to=215 --workers=4 --clean --crf=12 --no-audio --out=../output/video.mp4
cd .. && python3 tools/assemble.py --video output/video.mp4 --audio music/build/master.flac
```
- 用 `nohup` 跑，避免 session 中斷時被一起關掉。
- 重做 mac_03 的檢查：ffprobe、檔案小於 95 MB、響度約 −11 LUFS、5.41／55.81／111.98 三點音畫同步。
- 重出 `docs/stills/*.jpg`（同樣 8 個時間點）。
- commit 新的 `output/病名為AI_The_Disease_Called_AI.mp4`、劇照、`docs/review/polish/`、`docs/tasks/mac_04_report.md`。
- 用 `[review] polish + final v2` push。**然後等主 session 回覆「go upload」，才開始 C。**

## C. 發布（等主 session 說 go upload 之後）
上傳的檔案用 **HQ 保存版** `output/病名為AI_The_Disease_Called_AI_HQ.mp4`。平台會重新編碼，HQ 的畫質比較好。

**共同**
- 標題（使用者確認：括號統一為全形）：`docs/release/title.txt` → `The Disease Called AI（病名為愛）Opus5.5生成`
- 封面：`docs/stills/98.3.jpg`（06F 海報鏡頭）。如果平台要求 16:9 的 1280×720，就從 1920×1080 的全尺寸 still 縮出來。

**YouTube**
- 簡介：`docs/release/description_youtube.txt`（中英雙語的「來自 Claude Opus 5.5 的思考」、代碼庫網址、聲庫標示）。
- 類別：Music。不是為兒童製作。
- **「經過修改或合成的內容」（Altered or synthetic content）選「是」。**
- 標籤：AI, Claude, Opus 5.5, DiffSinger, original song, music video, watercolor animation, 病名為愛, 病名為AI。
- 公開範圍：**公開**（使用者若在這邊另有指示，以使用者為準）。
- 不開啟營利：這是非營利作品，聲庫條款也禁止商用。
- 帳號不能自訂縮圖時，就略過封面。

**B站**
- 簡介：`docs/release/description_bilibili.txt`（中文的思考、代碼庫網址、聲庫標示；1122 字，在 2000 字限制內）。
- 類型：**自製**。分區：音樂 › **VOCALOID·UTAU**（沒有的話用「原創音樂」）。
- **勾選 AI 生成內容的作者聲明**（使用人工智能合成技術）。
- 標籤：AI、Claude、DiffSinger、原創歌曲、病名為愛、MV、水彩動畫、AI歌聲。
- 投稿後通常要審核，記下 BV 號。

**登入與安全**
- 用這台 Mac 上已經登入、之前上傳過的方式（瀏覽器或 CLI 工具都可以）。
- 需要登入、掃碼或兩步驟驗證時，請在你的 session 裡請使用者操作。
- **不要把任何 cookie、token、密碼寫進 repo 或 commit。**

**回報**
- 把 YouTube 網址、B站 BV 號或網址、各自的公開狀態（例如 B站審核中）寫進 `docs/tasks/mac_04_report.md`。
- 用 `[review] published` push。
