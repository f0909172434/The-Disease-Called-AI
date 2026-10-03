# Mac 本機任務 03：全片最終算圖與交付

前提：G6 fix #1 已經由主 session 審核通過（主 session 會傳訊通知你開始）。

## 1. 同步
```
git fetch origin claude/compassionate-dijkstra-16o5bo && git merge origin/claude/compassionate-dijkstra-16o5bo
```
`music/build/master.flac` 是 16-bit 的無損母帶，用來和畫面合成。

## 2. 正式算圖（全片 5160 幀，在 Mac 上一次算完，畫面才會一致）
```
cd film
node render.mjs --video --from=0 --to=215 --workers=4 --clean --crf=12 --no-audio --out=../output/video.mp4
```
- 算完用 ffprobe 確認：時長 215.000 s、24 fps、5160 幀、1920×1080。
- 抽查（自己看圖）：`node render.mjs --sheet=<每個段落的中點，約 16 個時間> --cols=4 --w=480 --out=../docs/review/final_sheet.jpg`。把它和各組的審稿圖對一下，確認沒有東西跑掉。

## 3. 合成交付檔（在 repo 根目錄）
```
python3 tools/assemble.py --video output/video.mp4 --audio music/build/master.flac
```
- 會產出 `output/病名為AI_The_Disease_Called_AI.mp4`：兩階段編碼，必須小於 95 MB，**要 commit**。
- 同時會產出 `output/病名為AI_The_Disease_Called_AI_HQ.mp4`：CRF 16 的保存版，**不要 commit**，留在 Mac 上給使用者。
- 確認：ffprobe 的時長、音軌是 AAC 48 kHz，檔案大小小於 95 MB。用 `ffmpeg -i ... -af ebur128 -f null -` 量響度，應該約 −11 LUFS（AAC 會差一點點）。
- 用 `--audio=../music/build/master.flac` 和最終檔各抽 3 個時間點，比對畫面和聲音的對齊：00C 的 Enter 5.41、04A 的副歌第一拍 55.81、07C 的 503 蓋章 111.98。

## 4. README 用的劇照
用 `node render.mjs --stills=6.8,59.9,98.3,119.3,151.74,177.0,188.0,202.9 --out=out/stills` 出圖，轉成寬 1280、JPEG 品質 85，存成 `docs/stills/<秒數>.jpg`。

## 5. 交付
- 在 `claude/mac-local` 上 commit 這幾樣：
  - 最終的 MP4；
  - `docs/stills/*.jpg`；
  - `docs/review/final_sheet.jpg`；
  - `docs/tasks/mac_03_report.md`（數字、檢查結果、HQ 檔在 Mac 上的路徑）。
- 用 `[review] final render` push。
- `output/video.mp4` 和 HQ 檔不要 commit；如果 `.gitignore` 沒有擋到，就加進去。
