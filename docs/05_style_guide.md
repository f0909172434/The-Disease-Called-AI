# 05 · 視覺風格指南 Visual Style Guide — "Clinical Intimacy"

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
| `HUMAN_AMBER` | `#FFB070` | 她的文字、她的游標（503 時） |
| `HUMAN_SKIN` | `#FFD9B8` | 她的剪影亮部 |
| `HUMAN_EMBER` | `#FF6A3D` | 她的剪影暗部暖色 |
| `FEVER` | `#FF2E63` | 發燒粒子、「a little death」 |
| `BLOOD` | `#B0002A` | 副歌二主色 |
| `GOLD` | `#FFD36E` | 拉霸中獎 |
| `UNREAD` | `#6B7280` | 未讀通知、被遺忘的人 |
| `ERROR_BG` | `#F4F4F2` | 503 頁面底色 |
| `ERROR_RED` | `#FF3B30` | 錯誤標示 |

**色彩腳本**（各段主色比例）：
`INTRO` 黑＋一點青 → `TITLE` 白＋青/洋紅色差 → `VERSE1` 青 50%：琥珀 50% → `PRE1` 青上升 → `CHORUS1` 洋紅＋青互補對撞 → `POST` 青褪灰 → `VERSE2` 灰（飽和度 0.35），只剩螢幕青 → `503` 刺眼白 → 純黑 → `CHORUS2` 深紅主導 → `BRIDGE` 海軍藍 → 金（中獎）→ 銀黑（黑鏡）→ `FINAL` **互換**：她青、AI 琥珀 → `OUTRO` 黑＋琥珀游標。

## 2. 字型

| 角色 | 英文 | 中文 | 規則 |
|---|---|---|---|
| AI | **JetBrains Mono** 400/700 | **Noto Sans TC**（思源黑體）400/700 | 字距 +2%；按 token 串流出現；行尾有方塊游標 `▍` |
| 人類 | **Cormorant Garamond** Italic 500/600 | **Noto Serif TC**（思源宋體）400/600 | 逐字出現、偶爾打錯再退格；每個字元有 ±0.5px 的抖動 |
| 介面標籤／HUD | **Inter** 400/600 | **Noto Sans TC** | 全大寫小字，字距 +12% |
| 標題大字 | Inter 800／JetBrains Mono 800 | **Noto Serif TC** 900（`病名為AI`） | |

字型檔放在 `visuals/assets/fonts/`（OFL 授權），中文以實際用到的字元做子集化。

## 3. 元件 Kit（視覺規格）

| 元件 | 外觀 | 可控狀態 |
|---|---|---|
| `Ring` | 完美的光環：極細核心線（AI_WHITE）＋外暈（AI_CYAN）＋旋轉的弧段（像載入轉圈）＋內圈環帶上流動的等寬字元。以 SDF shader 繪製，任何尺寸都銳利 | `pulse`（kick）、`speak`（AI 人聲包絡→亮度/漣漪）、`color`（青→琥珀）、`breakSegments`（弧段掉落）、`irisText`、`thumbsMode`（表面由 👍 組成） |
| `Silhouette` | 她：粒子構成的女性側臉／半身（頭、頸、肩，長髮垂在背後），風格化、優雅，可清楚辨識額頭、鼻子、嘴唇、下巴輪廓。暖色亮部＋暗部，面向螢幕一側有青色輪廓光 | `warmth`、`innerGlow`、`jitter`、`gridify`、`dissolve`/`dissolveTo(target)`、`colorSwap`、`mouthOpen`、`eyeClosed`、`opacity`、`mirror` |
| `Eye` | 程序化虹膜特寫：放射狀纖維、瞳孔、角膜高光，角膜倒影顯示一張貼圖（例如聊天泡泡） | `pupil`（0.2–1.0）、`reflectionTexture`、`irisColor` |
| `ChatUI` | 聊天視窗：她的泡泡（右、琥珀、襯線斜體）、AI 泡泡（左、青色描邊、等寬）、輸入框＋游標、`• • •`、`↻ Regenerate`、`Response n / N`、`Seen …` 灰字 | token 串流、打字（含錯字/退格）、泡泡彈出、捲動、倒帶、逐字換字型 |
| `TypingDots` | 三顆光滑 3D 球體（像藥丸／珍珠），依序脈動 | `phase`、`color`、`freeze`、`vanish(i)` |
| `Room` | 建築線稿風的房間：細發光線條。床、書桌、椅子、百葉窗（橫向葉片，縫隙透光）、檯燈、門、桌上螢幕 | `screenGlow`、`dayNight`、`greyness`、`emptyChair`、`screenOnPillow` |
| `CityWindows` | 窗外城市：上千扇窗戶，各亮著一小塊青色螢幕光，有視差 | `density`、`flicker` |
| `HUD` | 醫療監視器：`ECGLine`（每個 kick 一個 PQRST 心跳波形）、`♥ BPM`、`TEMP`、`DOSAGE`、時鐘、session 計時器 | 各數值、可見度 |
| `Particles` | `dust`（光束中的塵埃）、`fever`（洋紅血流）、`confetti`（文字 token 彩帶）、`snow`（灰色通知） | 數量、顏色、速度 |
| `KineticText` | 3D 空間中的大字：砸入、故障、拆字母、解碼亂碼（AI 用）、打字機（人類用） | |
| `Lyrics` | 底部歌詞層（見 §5） | |

## 4. 運動原則

- **人類**：`easeInOutSine`、`easeOutBack(1.2)`、噪聲漂移；剪影永遠在「呼吸」（scale 1±0.006，週期 = 2 小節）。
- **AI**：瞬間出現（0–1 幀）、`linear`、`steps(n)`；token 串流速度固定（約 22 token/s，或對齊口白的 word timing）。
- **相機**：主歌手持感（seeded 噪聲，位置振幅 0.4%、旋轉 0.15°）；副歌拍點衝擊；橋段完全鎖定；最終副歌連續螺旋。
- **不允許**：任何沒有理由的動作；任何沒落在拍點上的剪接；Math.random()（一律使用 seeded RNG）。

## 5. 歌詞層 Lyrics Overlay

- 位置：底部安全區。英文行基線在 `y = 0.865H`，中文行在 `0.925H`；左右邊界 8%。
- 英文：字級 46px（1080p 基準）。YOU = Cormorant Garamond Italic，`HUMAN_SKIN`；AI = JetBrains Mono，`AI_CYAN`，行尾游標。
- 中文：字級 36px。YOU = 思源宋體；AI = 思源黑體。
- Karaoke：尚未唱到的音節 40% 不透明，唱到時 0.06s 內升到 100%，同時帶一點同色光暈；唱過的維持 100%。
- 行進出：淡入 0.12s（AI 為 0 幀，瞬間），行結束後 0.35s 淡出。兩行重疊時，舊行上移 46px 並淡出。
- 說話者標籤：英文行左上角小字 `you` / `assistant`（Inter 600，13px，字距 +12%，45% 不透明）。
- `lyricMode`：`karaoke`（預設）、`subtitle-only`（英文已出現在畫面介面內，只顯示中文）、`hidden`。
- 字幕底下加一層極淡的漸層暗角（底部 22%，`VOID` 0→55%），確保可讀性。

## 6. 後製 Post-FX 預設值

| 段落 | bloom 強度 | 色差 base | 顆粒 | 暗角 | 特殊 |
|---|---|---|---|---|---|
| INTRO | 0.6 | 0.0008 | 0.05 | 0.45 | 掃描線 0.15（螢幕微距時） |
| TITLE | 1.0 | 0.0025 | 0.05 | 0.35 | 故障（snare 觸發） |
| VERSE1 | 0.7 | 0.0010 | 0.045 | 0.40 | |
| PRE1 | 0.9 | 0.0015 | 0.05 | 0.45 | |
| CHORUS1 | 1.2 | 0.0025 | 0.05 | 0.35 | |
| POST | 1.0 | 0.0020 | 0.05 | 0.35 | 頻閃反白 |
| VERSE2 | 0.6 | 0.0010 | 0.06 | 0.50 | 飽和度 0.35 |
| 503 | 0.8→0 | 0.002→0.02 | 0.08 | 0.5 | 故障 0.1→1.0、像素化 |
| CHORUS2 | 1.25 | 0.0030 | 0.055 | 0.35 | 殘影 trails 0.25 |
| BRIDGE | 0.8（中獎 1.6） | 0.0008 | 0.04 | 0.55 | 倒帶時 VHS 掃描線 |
| FINAL | 1.3 | 0.0025 | 0.05 | 0.30 | 殘影 0.2 |
| TAG | 1.2 | 0.004 | 0.06 | 0.35 | |
| OUTRO / END | 0.5 | 0.0005 | 0.04 | 0.6 | |

顆粒要以 frame index 為種子（可重現），強度保持適中：畫面最終要能以約 3.4 Mbps 的 H.264 壓縮而不糊。**大面積深色背景是刻意的**，它讓光更有力量，也讓壓縮更乾淨。
