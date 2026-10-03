# Mac 本機任務 03 報告：全片最終算圖與交付

機器：Apple M5（10 核 CPU／10 核 GPU，24 GB），macOS 27.0.1，Chrome 154 + ANGLE Metal。程式碼基準：`479dbcc`（合併了雲端的 FLAC 母帶與最新文件；所有鏡頭 G1–G6 與 S00/S01 都已通過審稿）。

## 1. 正式算圖
`node render.mjs --video --from=0 --to=215 --workers=4 --clean --crf=12 --no-audio --out=../output/video.mp4`

| 項目 | 數值 |
|---|---|
| **牆鐘時間（一次跑完、不中斷）** | **453 s = 7.5 分鐘** |
| 平均 | 0.09 s/幀（牆鐘，4 workers）；每個 worker 0.35 s/幀 |
| 幀數 | 5160（215 個 1 秒 chunk） |
| ffprobe | h264、yuv420p、1920×1080、24/1 fps、nb_read_frames 5160、duration 215.000000 s |
| 檔案大小 | 669.7 MB（CRF 12，不 commit） |

註：第一次執行在第 1524/5160 幀時因為上一個 Claude session 結束、Chrome 連線被關閉（`TargetCloseError: Target closed`）而中斷；這不是畫面程式的錯。改用 `nohup` 從頭（`--clean`）重跑，上表是第二次、完整不中斷的數字。

抽查：`docs/review/final_sheet.jpg`（16 格：5.5、16、33、50、62、80.5、95、112、124、135、146、160、172、183、198、210），和各組通過的審稿圖逐格對過，沒有東西跑掉、沒有黑塊或缺紋理。

## 2. 交付檔（`python3 tools/assemble.py --video output/video.mp4 --audio music/build/master.flac`，3 分 50 秒）

| 檔案 | 大小 | 視訊 | 音訊 | 時長 | commit |
|---|---|---|---|---|---|
| `output/病名為AI_The_Disease_Called_AI.mp4` | **93.65 MB**（93,652,741 bytes，< 95 MB） | h264 1920×1080 24 fps，5160 幀，3.28 Mb/s（兩階段） | AAC 48 kHz 立體聲 201 kb/s | 215.000 s | ✅ |
| `output/病名為AI_The_Disease_Called_AI_HQ.mp4` | 381.5 MB | h264 CRF 16，13.9 Mb/s | AAC 48 kHz 立體聲 331 kb/s | 215.000 s | ✗（留在 Mac） |

**HQ 保存版在 Mac 上的路徑**：`/Users/wangzhikai/.gemini/antigravity/scratch/The-Disease-Called-AI/output/病名為AI_The_Disease_Called_AI_HQ.mp4`
（原始畫面 `output/video.mp4` 也留著。兩者都已加入 `.gitignore`。）

## 3. 響度（`ffmpeg -af ebur128`）

| 來源 | Integrated | LRA |
|---|---|---|
| `music/build/master.flac` | −11.0 LUFS | 5.7 LU |
| 最終 MP4（AAC） | **−11.1 LUFS** | 5.7 LU |

AAC 編碼後只差 0.1 LU，符合預期（約 −11 LUFS）。

## 4. 音畫同步抽查（3 點）

音訊：在每個時間點前後各取 0.6 s，把最終 MP4 的音軌和 `master.flac` 做互相關，±20 ms 範圍內找最佳延遲。
畫面：從最終 MP4 取出該時間點的幀和前後各一幀，和 `render.mjs --stills` 直接算出的同一時間點比 PSNR，確認幀序沒有偏移；並目視確認事件落在對的那一幀。

| 點 | 時間 | 音訊延遲（最終 vs 母帶） | 畫面：同幀 PSNR／前一幀／後一幀 | 目視 |
|---|---|---|---|---|
| 00C Enter | 5.41 | **0.0 ms** | 44.1 dB ／ 27.0 ／ 30.0 | 5.375 文字還在輸入框裡；5.417（第一個 ≥5.41 的幀）文字已經送出跳到框外 ✅ |
| 04A 副歌第一拍 | 55.81 | **0.0 ms** | 37.3 dB ／ 10.0 ／ 17.3 | 55.833 燈的光環與病房已在；55.792 是轉場前一幀 ✅ |
| 07C 503 蓋章 | 111.98 | **0.0 ms** | 42.8 dB ／ 27.7 ／ 27.6 | 111.958 只有墨點；112.0（第一個 ≥111.98 的幀）`503` 已蓋上 ✅ |

三點的音訊都和母帶逐樣本對齊，畫面的同一幀都是明顯的最佳匹配（相鄰幀低 7–27 dB），所以沒有音畫偏移，也沒有掉幀或重複幀。

## 5. README 劇照
`docs/stills/{6.8,59.9,98.3,119.3,151.74,177.0,188.0,202.9}.jpg`：`--stills` 全尺寸算出後縮成寬 1280、JPEG 約品質 85，共 768 KB。

## 6. 沒有改程式
這個任務沒有改任何繪圖或工具程式；只有 `.gitignore` 加了 `output/video.mp4` 和 `output/*_HQ.mp4`。
