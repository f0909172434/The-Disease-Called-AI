# Mac 本機任務 01：Metal 算圖的速度、平行數與決定性

給在使用者 Mac（Apple M5，10 核 CPU／10 核 GPU，24 GB）上執行的 Claude Code session。
雲端主 session（`the-disease-called-ai-df`）負責統籌；這台 Mac 之後要負責**全片最終算圖**，可能也會負責一兩段鏡頭製作。
這個任務先量清楚 Metal 算圖的實際表現。

## 規則
- 先 `git pull origin claude/compassionate-dijkstra-16o5bo`。
- **不要 push 到 `claude/compassionate-dijkstra-16o5bo`**（雲端那邊有好幾個 agent 正在改它）。
  你的產出一律 commit 到你自己的分支 `claude/mac-local`，從目前的 HEAD 開出來，然後 push。
- 不改 `film/src/**`。只有在 Mac 上跑不起來時，才可以對 `film/render.mjs`、`film/tools/*` 做最小的修正，並在報告裡附上 diff。
- 算圖都在 `film/` 目錄下執行（`cd film`）。用法看 `film/render.mjs` 開頭的註解和 `film/README_ENGINE.md`。
  macOS 上預設就是 `--use-angle=metal`（`tools/harness.mjs`），不用加 GL 旗標。
- `music/build/master.wav` 不在 git 裡，所以 `--video` 一律加 `--no-audio`。
- 這些都是機械性的工作。建議這個 session 用 Sonnet（`/model sonnet`）以節省費用。

## 要量的東西
目前片子裡只有 S00–S01（0–22.33 s）有正式鏡頭，而且還在修改中；其餘時間是佔位畫面。重的角色畫面用 model sheet 的 loop 來量。

1. **單一 worker 的每幀秒數**（`--bench=48`）。每項跑兩次，第一次是冷快取，記第二次：
   - `--from=1`（00A 螢幕）、`--from=3`（00B 他在書桌）、`--from=6.5`（00C 她揮手）、`--from=12`（01A 手腕特寫）、`--from=16`（01B 病歷）
   - 角色：`--loop=him_poses --from=0.5`、`--loop=ai_poses --from=4.5`（第 5 頁：碎片＋拉霸，最重）
2. **平行數**：用 `--video --from=0 --to=10 --no-audio --redo` 測 `--workers=2,3,4,6`，分別記牆鐘時間、每幀平均秒數、記憶體峰值（Activity Monitor 或 `vm_stat`）。
   找出整體最快、而且不會讓機器開始 swap 的 worker 數。
3. **決定性**：`node tools/check_determinism.mjs --range=0:22:0.5`，再用 `--loop=ai_poses --times=0.5,4.5`。
   必須在不同 process 之間完全一致。不一致的話，記下哪些時間、差多少，不要自己改繪圖程式。
4. **畫質檢查**：`node render.mjs --sheet=1,3.5,6.8,12.3,16.5,20 --cols=3 --w=640 --out=out/mac_check.jpg`。
   自己打開來看：水彩紋理、墨線、glow、字幕都正常嗎？有沒有黑塊、缺筆刷紋理或顏色異常？
   另外對 `--stills=6.8` 出一張全尺寸 PNG（`out/mac_stills/`）。

## 交付
在 `claude/mac-local` 分支加入以下檔案，然後 push：
- `docs/tasks/mac_01_report.md`：表格列出每項的數字、建議的 worker 數、全片 215 s × 24 fps = 5160 幀的估計時間、決定性結果和畫質觀察。如果改了程式，附上 diff。
- `docs/tasks/mac_check.jpg`：上面那張檢查表，壓到 2 MB 以下。
- `docs/tasks/mac_still_6.8.jpg`：那張全尺寸畫面，轉成 JPEG 品質 92。

如果你的 session 可以傳訊息給雲端 session `the-disease-called-ai-df`（SendMessage），完成後傳一句「mac_01 done」和報告摘要給它。
傳不了也沒關係，告訴使用者「好了」，使用者會轉達。
