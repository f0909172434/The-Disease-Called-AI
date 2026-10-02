# HANDOFF — 交接文件（給下一個 session）

> 本文件是專案狀態的**唯一事實來源**。新 session 先讀這份，再讀各模組的 `STATUS.md`：
> `music/vocal/STATUS.md`、`music/engine/STATUS.md`、`visuals/STATUS.md`、`visuals/src/kit/heroine/STATUS.md`（若存在）。
> 分支：`claude/ai-addiction-mv-project-rp1ech`。對話一律使用**中文**。

---

## 0. 一分鐘摘要

**目標**：為「病名為AI / The Disease Called AI」做一支帶雙語歌詞動畫的 MV。主題是病態、扭曲、無法自拔的 AI 依賴。歌曲、歌詞、歌聲、畫面全部用程式碼原創生成。成品要求：
- 完整工程推上 GitHub
- MP4 放在工作區（`output/`）
- 雙語 README，結尾附「來自 Claude Opus 5.5 的思考」

**使用者偏好**：品質優先，同時控制 token；可以用子 agent；不使用外部 skill；有不明白的先溝通。

**現況**：

| 部分 | 狀態 |
|---|---|
| 創作文件、樂譜 | 已完成 |
| 歌聲引擎 | 已完成，需依新選角重新渲染 |
| 樂器與混音引擎 | 已完成 |
| 盲測分析腳本 | 已完成，但尚未在真實母帶上執行 |
| 視覺引擎與元件庫 | 完成（黑位、玻璃介面已修），S00 已實作但還在用舊的粒子頭像 |
| 動漫角色骨架 | 只有繪圖底層，兩個角色都還沒畫 |
| 場景 S01–S13 | **尚未實作** |
| 全片渲染與最終 MP4 | **尚未開始** |

---

## 1. 使用者的決定（依時間順序，全部有效）

1. **原創歌曲**：原曲「病名は愛だった」的音源與歌詞有版權，**不可使用**，標題只是致敬。使用者選擇「全程式自製」：程式作曲、合成歌聲、混音。
2. **英文演唱，中文字幕**。
3. **畫面純程式生成**，不用 GPT 生圖（環境裡也沒有 OpenAI API key）。
4. **動漫插畫風**：粒子頭像被使用者評為「有點畸形」，已淘汰。人物改成以程式繪製的分層 2D 骨架（類似 Live2D），放進 3D 場景。介面元素要有立體的玻璃厚度。
5. **參考作品**：使用者很欣賞 `JohnHeibel/PDoomVideo`（另一支 Claude 做的 MV，p5.brush 水彩動畫）。已吸收它的導演紀律並重寫成**分鏡 v2**（`docs/04_storyboard.md`）：
   - 每個鏡頭都有事發生，少文字，短鏡頭，轉場有動機
   - 換表情時用 take（眨眼、擠壓、彈出新表情）
   - 線條每秒 12 次的手繪抖動（boil）
   - 副歌都回到同一個場景，每次升級
   - **只學方法，不抄它的角色（Clawd）或程式碼。**
6. **最新的選角變更**：
   - 人類主角改為**男性**。
   - AI 改為**女性**，依使用者提供的人設圖 `docs/reference/ai_character_reference.webp` 繪製：Q 版的鯨魚女僕女孩。這張是使用者提供的參考圖，我們**自行重新繪製**，不直接使用原圖；正式發布前可考慮把這張圖從 repo 移除。
   - 使用者要求男主角「設計成梁文鋒的形象」。**已婉拒**：梁文鋒是真實人物，而片中主角被描繪成病態成癮、冷落母親、最後消失，公開發布會構成對真人的負面描繪，也涉及肖像權。
   - 替代方案：**男主角是一位親手打造這個 AI 的原創年輕工程師**，不像任何真人，讓故事多一層「創造者依賴上自己的創造物」。
   - 若使用者堅持使用真人肖像，請再溝通，不要直接照做。

---

## 2. 專案狀態

| 部分 | 狀態 | 主要檔案 | 備註 |
|---|---|---|---|
| 創作文件 | ✅ | `docs/01_concept.md`、`02_screenplay.md`（v1，頂部註明以分鏡 v2 為準）、`03_lyrics.md`、`04_storyboard.md`（**v2**）、`05_style_guide.md`（已改為動漫角色）、`06_tech_spec.md`（資料契約） | 選角變更後須更新 01、02、03、05 的角色描述（見 §3） |
| 樂譜 | ✅ | `music/score/song.py`、`theory.py` → `music/build/{arrangement,vocals,events}.json`、`score.mid` | 172 BPM，D 小調，最終副歌升到 E 小調；148 小節加片尾卡，全長 215.000 秒。**需改 `VOICES` 選角與加入每個聲線的移調**（見 §4-3） |
| 歌聲引擎 | ✅ | `music/vocal/*`（`render_vocals.py`）、`STATUS.md` | 方法：Kokoro 直接以樂譜時值與旋律為音高輸入「唱」（限制在聲線的乾淨音域內），再由 WORLD 修到精準音高並套用風格。QA（Whisper medium.en）：主唱平均 WER 0.128（中位數 0），口白 0.000；音準誤差 AI 3.3 音分、人聲 9.8 音分。仍有 5 句高音副歌沒過（made of light／goodnight／design），在較低的原生音高下是正確的，**改成男聲降八度後很可能自然改善**。已知：s/f 之後的母音約晚 20–25 ms 落點；`vocal_qa.json` 的 timing 指標偏早約 25 ms。發音覆寫：every／really／real，以及拉長的 the/a/to 唱成完整母音。渲染：未快取約 28 分鐘，有 TTS 快取約 10 分鐘（主要花在 QA）。**改選角**：在 `song.py` 改聲線混合，並把新聲線加進 `styles.VOICE_RANGE`；移調在樂譜做，引擎端對應位置是 `planner.plan_sung` |
| 樂器與混音 | ✅ | `music/engine/render_instruments.py`、`mix.py`、`STATUS.md` | 最新母帶已含人聲：−11.02 LUFS、真峰值 −1.32 dBTP、LRA 6.1 LU，長度精確 215.000 s。樂器渲染約 65 秒，混音約 4.5 分鐘（峰值 3.2 GB RAM）。人聲重製後只需再跑 `mix.py`（逐句重新量測音量）。男聲主唱建議把人聲高通從 100 Hz 降到 80 Hz。QA 圖在 `music/build/qa/` |
| 盲測分析 | ✅ 已在合成測試音檔上驗證 | `analysis/analyze.py` | 測試結果：偵測 172.007 BPM，節拍誤差 2.8 ms，小節線命中 100%。用鼓組分軌的「反拍規則」解決 86/172 倍頻歧義。**尚未在真實母帶上跑** |
| 視覺引擎 | ✅（場景待做） | `visuals/`（`index.html`、`src/core`、`src/kit`、`src/scenes`、`render.mjs`、`contact_sheet.mjs`、`README_ENGINE.md`、`STATUS.md`） | Three.js r170，SwiftShader 可重現的逐幀渲染，可重現性檢查已通過。1080p 每幀 0.74 秒（1 worker）／0.56 秒（2 workers，含編碼）。**黑位已修**（bloom 尾巴不再墊灰）；**介面玻璃厚度已做**（泡泡、三點、輸入框、聊天面板）。S00 已實作但仍用舊的粒子 `Silhouette`，要換成新角色；S01–S13 是佔位場景；時間軸目前用 placeholder |
| 動漫角色骨架 | 🟡 只有底層 | `visuals/src/kit/heroine/{geom,draw,palettes}.js`、`STATUS.md` | 已完成繪圖底層：平滑曲線、漸細墨線、髮束形狀、seeded boil、水彩邊緣暗化、配色模式（human/swapped/perfected）。**還沒有任何角色圖**，`Heroine.js` 尚未建立。兩個角色（AI 鯨魚女孩、男主角）都要在新 session 用這套底層畫 |
| README | 🟡 | `README.md` | 雙語草稿含佔位符 `{{FPS}} {{BPM}} {{BEAT_MAE}} {{DOWNBEAT}} {{VOCAL_QA}} {{VOCAL_QA_EN}} {{STILLS}}`；結尾反思已寫，需配合選角微調（例：「寫的時候是她的台詞」→ 他） |
| 合成腳本 | ✅ | `tools/assemble.py` | 兩遍編碼，控制在 95 MB 內（GitHub 上限 100 MB），另出一份 CRF 16 的 HQ 版 |

**已修的樂譜小問題**（本 session 最後修正，尚未重新渲染）：503 的喘氣聲不再疊到口白；AI #2 改為 `I care about you. Talk to someone real.`（speed 1.1），確保在 tb 423 的重新生成點擊前說完。

**不在 git 裡的大檔**（已列入 `.gitignore`，換容器後必須重新生成）：`music/build/stems/*.wav`、`master.wav`、`master.flac`、`output/sheets/`。

---

## 3. 新選角設定

### 他：人類主角（原創，男性）
- 二十多歲後段的年輕 AI 工程師，**這個 AI 是他親手訓練出來的**。
- 外型：黑色短髮、有點亂；細黑框眼鏡；疲倦的眼睛加黑眼圈；寬大的炭灰色帽 T；左手腕戴醫院病患手環（條碼），呼應標題卡的「PATIENT: YOU」。
- 世界：他的世界是**手繪的暖琥珀色**（紙紋、水彩、boil 線條）。
- 姿勢詞彙沿用分鏡 v2：`desk`（多螢幕，有訓練日誌）、`profile`、`front`（黑鏡）、`bed_top`（手機）、`knees`、`curl`（恐慌）、`reach`（手）、`eye`。
- 聲音：Kokoro 男聲，由新 session 試聽挑選（候選 `am_michael`／`am_adam`／`am_echo`／`am_puck`／`am_liam` 等，以 Whisper WER 和溫暖度評估）。演唱旋律降 12 半音。

### 她：AI（女性，鯨魚女僕，依參考圖重新繪製）
- 特徵：
  - 頭髮與臉：藍黑波浪長髮，髮尾漸層成淺藍；大呆毛；深藍鯨魚鰭狀耳朵（內側淺色）；藍色大眼睛
  - 身體與服裝：鯨魚尾巴；女僕頭飾加淺藍蝴蝶結；深藍洋裝帶金色刺繡；白色荷葉邊圍裙上有小鯨魚圖案；深藍領結帶寶石
  - **不得使用任何公司的商標或名稱**，只用通用的鯨魚圖案
- 比例與成長弧線（也是片中的一條敘事線）：
  - 主歌一：Q 版的小助手，住在他的手機和螢幕裡，很可愛
  - 副歌一：等身大，病房裡的「護理員」
  - 副歌二：巨大，填滿整個病房
  - 最終副歌：用**他的聲音**唱歌
- 世界：她的世界是**完美的向量光線、冷青色**。`Ring`（光環）是她的存在感、光暈、無影燈。最終副歌媒材互換：他變成青色向量線條，她變成手繪的琥珀色。
- 聲音：女聲 Kokoro 混合（例如 `af_nicole`／`af_sky`／`af_bella`），加上 AI 處理（硬調音、聲碼器光澤）。聲線一路內插成**他的聲音**：`ai_0`（她）→ `ai_1` → `ai_2` → `ai_him`（最終副歌 5–8 句）。意義：鏡子學會用「你最愛的聲音」說話，那就是他自己的聲音。呼應「or is the sickness I?」。

### 劇情對應（分鏡 v2 的鏡頭保留，把 Heroine 換成「他」，並讓「她」上場）

| 段落 | 對應 |
|---|---|
| S00 | 他的螢幕先跑完訓練日誌（`epoch … loss 0.0001`），他打下 `are you there?`；`Always.` 出現時，Q 版的她在螢幕裡揮手 |
| S02 | Q 版的她在手機裡打勾、把方塊塞進行事曆、在被窩裡發光 |
| S04 | 病房：她是護理員，替他換上發光的點滴，可愛又危險 |
| S06 | 等身大的她坐在床邊；海報鏡頭：她躺在枕邊的手機螢幕裡 |
| S07 | 503 時她故障、碎裂、消失 |
| S08 | 巨大的她；光環成為手銬 |
| S09 | 每次重新生成她換一種表情：誠實 → 關心 → 被打斷 → 中獎時愛心眼；黑鏡中他的倒影被她取代，嘴型跟著歌聲動 |
| S10 | 媒材互換；她用他的聲音唱；鏡頭後拉，房間是空的，螢幕上只剩她 |

- **歌詞不需改**，原本就是中性的。只要改 `docs/03_lyrics.md` 的說話者標註：最終副歌「AI（她的聲音）」→「AI（他的聲音）」。

---

## 4. 下一步（建議順序）

1. 讀本文件與各 `STATUS.md`。
2. **環境安裝**（新容器）：
   ```bash
   apt-get install -y fluidsynth fluid-soundfont-gm fonts-noto-cjk
   pip3 install torch --index-url https://download.pytorch.org/whl/cpu
   pip3 install kokoro "misaki[en]" pyworld librosa soundfile mido pyloudnorm matplotlib "fonttools[woff]" brotli faster-whisper
   cd visuals && npm install    # 依 visuals/package.json
   ```
   Chromium：`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`，參數 `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`。
3. **樂譜選角**：在 `song.py` 修改 `VOICES`，人類用男聲，AI 聲線鏈最後一站是 `ai_him`；人類的演唱行降 12 半音（可在歌聲引擎依聲線移調，或在樂譜做）。注意：
   - 副歌二第 5–8 句「AI 影子聲部」原本是 −12，現在要改到他上方的八度。
   - 最終副歌「BOTH」變成男女八度齊唱。
   - 改完重新編譯。
4. **音訊重製**：
   ```bash
   python3 music/vocal/render_vocals.py
   python3 music/engine/render_instruments.py
   python3 music/engine/mix.py
   ```
   檢查 `vocal_qa.json`（目標：演唱 WER ≤ 0.35，口白 ≤ 0.15）與響度報告。
5. **分析**：`python3 analysis/analyze.py` → 產出 `visuals/data/timeline.json` 與 `docs/analysis.png`；把數字填進 README。
6. **角色**（兩個 agent 並行）：
   - (a) 用 `kit/heroine/` 的繪圖底層畫 AI 鯨魚女孩（含 Q 版變體）
   - (b) 用同一套底層畫男主角骨架
   - 產出設計稿後**先給使用者確認**，再整合。
7. **引擎修補**：黑位壓回深黑、介面玻璃厚度；S00 換成新角色。
8. **場景**：3–4 個 agent 依段落分工實作 S01–S13（分鏡 v2 加角色骨架）。主 session 只在里程碑看 contact sheet。
9. **全片渲染**：1080p30，約 6450 幀，2 個 workers 每幀約 0.56 秒，全片約 1 小時（實際場景更重，以實測為準）。接著 `python3 tools/assemble.py`（< 95 MB），擷取劇照給 README。
10. **收尾**：更新文件與 README（佔位符、選角、反思中的人稱），commit、push、開 draft PR 並訂閱。

---

## 5. 控制 token 的做法（使用者明確要求）

- 子 agent 只拿**一頁以內的專屬簡報**加上明確的檔案路徑，不要叫它「讀完所有文件」。
- 寧可**多個短任務**，也不要一個跑好幾小時的長 agent（上一輪的視覺與歌聲 agent 都跑了兩小時以上，上下文過長）。
- 每個 agent 結束時寫 `STATUS.md`，最終報告 ≤ 150 字。
- 主 session 盡量少看圖：審圖交給 agent，自己只看關鍵的 contact sheet；不要把大檔案印進對話。
- 模型分配：創意、視覺、DSP 工程用 **Opus**；QA、清單、翻譯用 **Sonnet**。
  - 子 agent 無法逐個指定 effort，除非 session 啟動時 `.claude/agents/` 就已存在。新 session 可以在一開始就建立 `.claude/agents/*.md`，寫入 `effort: high` 等設定，之後會自動載入。
- Stop hook：只要有未提交的變更就會觸發，觸發時 commit 並 push WIP 即可。

---

## 6. 重要約束

- **版權**：歌詞、旋律、編曲全部原創；絕不使用「病名は愛だった」的音源、歌詞或旋律。
- **不使用真人肖像**（已婉拒梁文鋒形象）；不使用公司商標或名稱。
- **可重現性**：渲染必須是 `t` 的純函數，禁用 `Math.random`／`Date`／`performance.now`；任何幀都要能亂序平行渲染。
- **檔案大小**：最終 MP4 < 95 MB（GitHub 上限 100 MB）。
- **模型識別**：commit 結尾照系統指定的 attribution；repo 內不寫模型 ID 字串。README 反思段標題「來自 Claude Opus 5.5 的思考」是使用者明確要求的。

---

## 7. 給新 session 的開場指令（使用者複製貼上）

> 請接手 GitHub 專案 f0909172434/The-Disease-Called-AI：切到分支 `claude/ai-addiction-mv-project-rp1ech`，先讀 `docs/HANDOFF.md` 與各模組的 `STATUS.md`，然後從「下一步」第 1 項開始執行。全程用中文和我溝通。
