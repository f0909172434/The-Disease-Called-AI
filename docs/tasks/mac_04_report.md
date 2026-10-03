# Mac 本機任務 04 報告：潤飾 → 重算全片 → 發布

## A. 潤飾（前後對照在 `docs/review/polish/`，左＝之前、右＝之後）

| 項目 | 做法 | 對照圖 |
|---|---|---|
| 02G 被子 | 拿掉淡色橢圓高光，改成沿隆起的一層淡水洗＋兩側各一道皺褶線。`him_pose.js` 的 `himCovers` 新增 `coverRidges: false` 選項（預設不變，只有 02G 用） | `02G_duvet.jpg` |
| 09B 嘴型 | 每個音節只有前半段張嘴（小的 `U`／`wobble`），後半段和音節之間回到下垂的 `frown`；整句結束後也維持 `frown`。不再出現張大的 `O` | `09B_mouth.jpg`（143.3 s） |
| 09H 掌心 | 新增 `s09Palm`：拇指根、掌根、指根三塊淡灰陰影水洗，三條掌紋，四道指根細紋；畫在接觸點白色 flare 之後（之前被 flare 洗掉）。手的輪廓仍是引擎的手形 | `09H_palm.jpg`（164.0 s） |
| `aiGiantHand`（08A／08C） | cup 手勢在巨大尺寸下：掌側下緣陰影、亮面、兩道掌紋；手指束加三道貫穿全長的分隔線、每個關節的橫向皺褶、陰影側水洗。上一輪已加的 open/two 手勢細節（08F）維持 | `giant_hand.jpg`（上 124.9、下 119.3） |

決定性：42.0、43.0、143.3、143.8、163.8、164.3、119.3、124.9 八格跨 process 完全一致。

## B. 重算全片與交付 v2

| 項目 | 數值 |
|---|---|
| 全片算圖牆鐘 | **504 s = 8.4 分鐘**（4 workers，0.10 s/幀；v1 是 7.5 分鐘，多出的時間來自巨手與掌心的細節） |
| 原始畫面 | 5160 幀、215.000 s、24 fps、1920×1080 |
| 交付檔 `output/病名為AI_The_Disease_Called_AI.mp4` | **93.65 MB**（93,651,098 bytes，< 95 MB）；h264 5160 幀＋AAC 48 kHz 立體聲；215.000 s |
| HQ 保存版（上傳用） | 382.3 MB，`/Users/wangzhikai/.gemini/antigravity/scratch/The-Disease-Called-AI/output/病名為AI_The_Disease_Called_AI_HQ.mp4`（不 commit） |
| 響度 | **−11.1 LUFS**（母帶 −11.0） |
| assemble | 3 分 27 秒 |

音畫同步（方法同 mac_03）：

| 點 | 音訊延遲（最終 vs 母帶） | 同幀 PSNR ／前一幀／後一幀 |
|---|---|---|
| 00C Enter 5.41 | 0.0 ms | 46.6 ／ 26.9 ／ 30.0 dB |
| 04A 副歌第一拍 55.81 | 0.0 ms | 37.3 ／ 10.0 ／ 17.3 dB |
| 07C 503 蓋章 111.98 | 0.0 ms | 42.8 ／ 27.7 ／ 27.6 dB |

抽查表 `docs/review/final_sheet.jpg`（16 格，含 42.0、143.3、164.0 三個潤飾鏡頭）和審稿圖一致。README 劇照 `docs/stills/*.jpg` 已用 v2 重出。

## C. 發布（2026-10-04；使用者在本機 session 直接確認後進行，用使用者 Chrome 裡已登入的帳號）

上傳檔案：v2 HQ 保存版 `output/病名為AI_The_Disease_Called_AI_HQ.mp4`（382.3 MB）。瀏覽器工具只能傳 10 MB 以下的檔案，所以影片檔由使用者拖進上傳框，其餘欄位由 Claude 填寫。

| 平台 | 網址 | 狀態 |
|---|---|---|
| **YouTube** | **https://youtu.be/ha-ANfqri6g** | **公開**，已發布；版權與社群規範檢查「未發現任何問題」 |
| **Bilibili** | **https://www.bilibili.com/video/BV1VxHi6mELF**（BV1VxHi6mELF） | **开放浏览**（投稿後立即開放；最後的「立即投稿」由使用者按下） |

**YouTube 設定**
- 標題：`The Disease Called AI（病名為愛）Opus5.5生成`（全形括號）
- 說明：`docs/release/description_youtube.txt` 全文（3786 字）
- 縮圖：`docs/stills/98.3.jpg`（06F 同枕海報鏡頭）
- 不是兒童專屬；付費宣傳：否；**AI 使用（經過修改或合成的內容）：是**
- 標記：AI, Claude, Opus 5.5, DiffSinger, original song, music video, watercolor animation, 病名為愛, 病名為AI
- 類別：音樂；瀏覽權限：公開
- 營利：這個頻道沒有營利選項，所以沒有開啟

**Bilibili 設定**（使用者要求 B站用簡體）
- 標題：Claude 填的是 `The Disease Called AI（病名为爱）Opus5.5生成`；**線上的實際標題是 `The Disease Called AI（病名为AI）Opus5.5生成`**（委託者刻意改的，已確認）
- 简介：`docs/release/description_bilibili_zhs.txt`（description_bilibili.txt 的簡體版，1117 字）
- 封面：06F 海報鏡頭，4:3 與 16:9 兩種比例
- 创作声明：**含AI生成内容**，加上「内容为自制：未经作者允许，禁止转载」
- 分区：音乐（新版投稿頁只有大分區，沒有 VOCALOID·UTAU 子分區可選）
- 标签：病名为爱、MV、DiffSinger、AI、原创歌曲、水彩动画、AI歌声（「Claude」是 B站的話題專用標籤，不能自訂，所以沒加；自動帶入的「X Studio」「虚拟歌姬」已移除）

沒有任何 cookie、token 或密碼寫進 repo。
