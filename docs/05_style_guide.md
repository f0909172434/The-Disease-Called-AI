# 05 · 視覺風格指南 Visual Style Guide — "Clinical Intimacy"

> **修訂**：全片改為手繪水彩（p5.js + p5.brush，平面 2D，沒有 3D 場景），人物是**原創的動漫插畫風**，以程式碼一筆一筆畫出。選角更新後有兩個角色：**他**（人類男主角 `him`）與**她**（AI，鯨魚女僕女孩 `ai`），程式碼在 `film/src/chars/{him,ai}*.js`，API 見各自的 `him.STATUS.md`、`ai.STATUS.md`。分鏡表中所有 `Silhouette` 都改由 `him` 演出。現行鏡頭表是 `film/STORYBOARD.md` v3。

兩種視覺語言的碰撞：

- **介面（AI）**：冷、完美、向量般精確。細線、等寬字、游標、完美的圓。動作是「計算出來的」：線性、瞬間、步進、對齊網格、token 串流。
- **身體（人類）**：暖、柔軟、不完美。粒子、呼吸、膚色暖光、細微顆粒、輕微模糊。動作是「有機的」：sine ease、輕微過衝、噪聲漂移、手持晃動。

> 原則：**畫面上任何一個元素，都要能回答「它是人類的，還是 AI 的？」** 顏色、字型、運動方式都要一致地回答這個問題。最終副歌把答案互換。

## 1. 色彩 Tokens

| Token | Hex | 用途 |
|---|---|---|
| `VOID` | `#05060A` | 背景（不要用純黑 #000，保留一點藍） |
| `INK` | `#0B0E14` | UI 面板底 |
| `NAVY` | `#070B16` | 橋段背景 |
| `AI_CYAN` | `#7FE9FF` | AI 主光、AI 文字 |
| `AI_WHITE` | `#E8FDFF` | AI 高光、光環核心 |
| `AI_DEEP` | `#1B6FFF` | 深藍點綴、陰影中的冷光 |
| `HUMAN_AMBER` | `#FFB070` | 他的文字、他的游標（503 時） |
| `HUMAN_SKIN` | `#FFD9B8` | 他的剪影亮部 |
| `HUMAN_EMBER` | `#FF6A3D` | 他的剪影暗部暖色 |
| `FEVER` | `#FF2E63` | 發燒粒子、「a little death」 |
| `BLOOD` | `#B0002A` | 副歌二主色 |
| `GOLD` | `#FFD36E` | 拉霸中獎 |
| `UNREAD` | `#6B7280` | 未讀通知、被遺忘的人 |
| `ERROR_BG` | `#F4F4F2` | 503 頁面底色 |
| `ERROR_RED` | `#FF3B30` | 錯誤標示 |

**色彩腳本**（各段主色比例）：
`INTRO` 黑＋一點青 → `TITLE` 白＋青/洋紅色差 → `VERSE1` 青 50%：琥珀 50% → `PRE1` 青上升 → `CHORUS1` 洋紅＋青互補對撞 → `POST` 青褪灰 → `VERSE2` 灰（飽和度 0.35），只剩螢幕青 → `503` 刺眼白 → 純黑 → `CHORUS2` 深紅主導 → `BRIDGE` 海軍藍 → 金（中獎）→ 銀黑（黑鏡）→ `FINAL` **互換**：他青、她（AI）琥珀 → `OUTRO` 黑＋琥珀游標。（水彩版的逐段色彩弧與紙 `#F3EBDC`、墨 `#2B2233`、真實晨光 `#FFE9C2` 等色票，見 `film/STORYBOARD.md` §2。）

## 2. 字型

| 角色 | 英文 | 中文 | 規則 |
|---|---|---|---|
| AI | **JetBrains Mono** 400/700 | **Noto Sans TC**（思源黑體）400/700 | 字距 +2%；按 token 串流出現；行尾有方塊游標 `▍` |
| 人類 | **Cormorant Garamond** Italic 500/600 | **Noto Serif TC**（思源宋體）400/600 | 逐字出現、偶爾打錯再退格；每個字元有 ±0.5px 的抖動 |
| 介面標籤／HUD | **Inter** 400/600 | **Noto Sans TC** | 全大寫小字，字距 +12% |
| 標題大字 | Inter 800／JetBrains Mono 800 | **Noto Serif TC** 900（`病名為AI`） | |

字型檔放在 `film/assets/fonts/`（OFL 授權），中文以實際用到的字元做子集化（`film/tools/build_fonts.py`）。

## 3. 元件 Kit（視覺規格）

全部用 p5.brush 畫（`paint`／`inkLine`／`glow`／`letter`），平面 2D。場景與道具在 `film/src/sets/`，角色在 `film/src/chars/`。舊 Three.js 引擎的 `Eye`（程序化虹膜）、`CityWindows`、`KineticText` 沒有對應物，v3 也沒有用到（`CityWindows`、大字的刪除理由見 `film/STORYBOARD.md` §8）；畫面裡的字只經過 `letter()`，而且只限該文件 §0 的白名單。

| 元件 | 外觀 | 在 `film/` 的實作 |
|---|---|---|
| `Ring` | 光環：極細核心線（AI_WHITE）＋外暈（AI_CYAN）＋旋轉的弧段（像載入轉圈）。在病房是無影燈，後來縮成手銬 | `film/src/sets/props.js` 的環形無影燈與 `setRingLampCuffs` |
| `him`（他，取代早期的粒子 `Silhouette`） | 他：人類男主角，**原創動漫插畫風**角色，以程式碼用 p5.brush 一筆一筆畫出。手繪琥珀世界：線條每秒 12 次手繪抖動（boil）、水彩邊緣暗化、紙紋。年輕 AI 工程師（二十多歲後段），體型纖瘦，黑色短髮微亂，細黑半框眼鏡，皇家藍／海軍藍西裝外套配白色敞領襯衫（後期：皺掉的襯衫與居家服），左手腕醫院病患手環（條碼），後期眼神疲倦、有黑眼圈。乾淨的細線稿＋兩階賽璐璐陰影＋螢幕的青色輪廓光。視角：右側臉（主鏡頭）、3/4、正面（黑鏡倒影）、躺在枕頭上的俯視、眼睛特寫、指尖貼玻璃的手 | `film/src/chars/him*.js`（API 見 `him.STATUS.md`）。表情 `HIM_EMO`／`himEmotions`；口型由 `vox('you', t)` 驅動；配色 `pal`：`human`／`drained`（主歌二去飽和）／`swapped`（最終副歌：boil 0、沒有水彩的青色乾淨線條）／`mirror`（黑鏡）；`band: false` 隱藏手環 |
| `ai`（她） | 她：AI，**原創的鯨魚女僕女孩**。藍黑波浪長髮、髮尾漸層成淺藍、大呆毛，鯨魚鰭狀耳朵（內側淺色）與鯨魚尾巴，女僕頭飾加淺藍蝴蝶結，深藍洋裝帶金色刺繡，白色荷葉邊圍裙上只有通用的小鯨魚圖案（**不得出現任何公司名稱或商標**），深藍領結帶寶石，藍色大眼睛。她本人也是 p5.brush 畫的，她帶來的一切（螢幕、泡泡、點滴、無影燈）是冷青色的 `glow`。比例隨劇情成長：Q 版（主歌一）→ 等身大「護理員」（副歌一）→ 巨大（副歌二） | `film/src/chars/ai*.js`（API 見 `ai.STATUS.md`）。表情 `AI_EMO`／`aiEmotions`；配色 `pal`：`default`（她原本的配色，取自參考圖）／`glow`（冷青輪廓光、發光虹膜）／`amber`（最終副歌的手繪琥珀色）／`mirror`；形態 `form`：`chibi`／`full` |
| `ChatUI` | 書桌螢幕與手機上的介面：他的泡泡（琥珀、手寫字）、AI 泡泡（青色描邊、等寬）、輸入框＋游標（含錯字與退格）、✓ ♥ ↻ • • •、灰色的未讀群組 | `film/src/sets/screens.js`（`setInput`、`setTyped`、`setBubble`） |
| `TypingDots` | 三顆光滑的球（像藥丸／珍珠），依序脈動，會凍結、一個個消失 | `setDots`（`film/src/sets/sets_core.js`） |
| `Room` | 他的房間：一張三面牆的手繪全景（床、枕頭、百葉窗、書桌、螢幕、鍵盤、椅子、衣櫃、相框牆、毛玻璃門）。變體：深夜、早晨、白天、黃昏到凌晨、去飽和加灰雪、503 的黑、掃描燈的黑、黎明 | `setRoom(v)`、`setSurface`（`film/src/sets/room.js`） |
| `HUD` | 心電圖：每個 kick 一個 PQRST 心跳波形（病歷夾下方、病房的小監視器） | `setECG`（`film/src/sets/chart.js`） |
| `Particles` | 灰色通知雪、金色彩帶、病房碎成的筆刷碎片 | `setRoomSnow`、`setConfetti`、`setShards`（`film/src/sets/`） |
| `Lyrics` | 底部歌詞層（見 §5） | `film/src/lyrics.js` |

## 4. 運動原則

- **人類**：`easeInOutSine`、`easeOutBack(1.2)`、噪聲漂移；剪影永遠在「呼吸」（scale 1±0.006，週期 = 2 小節）。
- **AI**：瞬間出現（0–1 幀）、`linear`、`steps(n)`；token 串流速度固定（約 22 token/s，或對齊口白的 word timing）。
- **相機**（只做 2D 的平移、縮放和畫面內 roll）：主歌手持感（seeded 噪聲，位置振幅 0.4%、旋轉 0.15°）；副歌拍點推拉；橋段完全鎖定；最終副歌在畫面內慢慢 roll 加推進，取代 v2 的連續螺旋。
- **不允許**：任何沒有理由的動作；任何沒落在拍點上的剪接；Math.random()（一律使用 seeded RNG）。

## 5. 歌詞層 Lyrics Overlay

- 位置：底部安全區。英文行基線在 `y = 0.865H`，中文行在 `0.925H`；左右邊界 8%。
- 英文：字級 46px（1080p 基準）。YOU（他）= Cormorant Garamond Italic，`HUMAN_SKIN`；AI = JetBrains Mono，`AI_CYAN`，行尾游標。
- 中文：字級 36px。YOU（他）= 思源宋體；AI（她）= 思源黑體。
- Karaoke：尚未唱到的音節 40% 不透明，唱到時 0.06s 內升到 100%，同時帶一點同色光暈；唱過的維持 100%。
- 行進出：淡入 0.12s（AI 為 0 幀，瞬間），行結束後 0.35s 淡出。兩行重疊時，舊行上移 46px 並淡出。
- 說話者標籤：英文行左上角小字 `you` / `assistant`（Inter 600，13px，字距 +12%，45% 不透明）。
- `lyricMode`：`karaoke`（預設）、`subtitle-only`（英文已出現在畫面介面內，只顯示中文）、`hidden`。
- 字幕底下加一層極淡的漸層暗角（底部 22%，`VOID` 0→55%），確保可讀性。

## 6. 後製 Post-FX

舊引擎（Three.js）逐段的 bloom、色差、殘影預設值沒有對應物，已刪除：v3 的發光一律用 `glow()`，閃光與轉場見 `film/src/scenes/_kit.js`（`kitFlash` 等），最後只疊一層靜態的紙紋顆粒與暗角（`film/src/core.js` 的 `makeGrain`）。

紙紋顆粒是靜態的，每一格都可重現；強度保持適中：畫面最終要能以約 3.4 Mbps 的 H.264 壓縮而不糊。**大面積深色背景是刻意的**，它讓光更有力量，也讓壓縮更乾淨。
