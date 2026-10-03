# Mac 本機任務 02：逐鏡頭製作（Phase B）總負責

你是在使用者 Mac（Apple M5、Metal 算圖，每幀 0.07–0.33 s）上的 **Phase B 製作總負責**。
雲端主 session 負責美術審稿和合併。Metal 比雲端的 CPU 快 20 倍以上，所以 S02–S13 全部在這台 Mac 上做。

## 溝通方式（橋接）
- **雲端 → 你**：主 session 會直接傳訊息給這個 session（審稿回饋、新任務）。
  也會把回饋寫進雲端分支 `claude/compassionate-dijkstra-16o5bo` 的 `docs/tasks/feedback/<段落>.md`。
- **你 → 雲端**：commit 並 push 到 `claude/mac-local`。主 session 在背景監看這個分支，一有新 push 就會來看。
  - 段落可以審的時候，commit 訊息用 `[review] S02+S03 ...` 開頭。
  - 只是存進度的話，用 `[wip] ...`。
  - 需要主 session 決定的事，用 `[ask] ...`，並把問題寫進 `docs/tasks/mac_02_status.md`。
- 永遠不要 push 到 `claude/compassionate-dijkstra-16o5bo`。
- 開工前和每批新工作開始前都要同步一次：
  `git fetch origin claude/compassionate-dijkstra-16o5bo && git merge origin/claude/compassionate-dijkstra-16o5bo`。
  雲端那邊的試作 agent 還在完成 S00–S01 和 `_kit.js`／`src/scenes/README.md`，音訊 agent 在重新混音。

## 分工
用你自己的子代理（**model: sonnet**）平行製作，同時最多 3 個。這六組全部做完：

| 組 | 段落 | 時間 | 鏡頭 |
|---|---|---|---|
| G1 | S02 VERSE 1 + S03 PRE 1 | 22.33–55.81 | 02A–02G、03A–03C |
| G2 | S04 CHORUS 1 + S05 POST | 55.81–83.72 | 04A–04H、05A |
| G3 | S06 VERSE 2 + S07 503 | 83.72–117.21 | 06A–06H、07A–07E |
| G4 | S08 CHORUS 2 | 117.21–139.53 | 08A–08G |
| G5 | S09 BRIDGE | 139.53–167.44 | 09A–09I |
| G6 | S10 FINAL + S11 TAG + S12 OUTRO + S13 END | 167.44–215.00 | 10A–10G、11A、12A–12D、13A |

先開 G1、G2、G3，任何一組做完就接著開下一組。
一組做完就由你把關：
1. 自己先看過縮圖表，明顯的問題退回給子代理修。
2. commit 該組的段落檔和審稿圖，以 `[review]` push。
3. 不用等審稿，直接繼續下一組。

審稿回饋來了就派子代理修，修完再以 `[review]` push。

## 共用檔案的規則（避免平行衝突）
- 每個子代理**只改自己段落的檔案**（`film/src/scenes/sNN_*.js`）。
  需要額外的輔助函式，就寫在自己的檔案裡，加段落前綴，例如 `s04Ward…`。
- `_kit.js`、`film/src/chars/*`、`film/src/sets/*`、`core.js`、`lyrics.js`、`render.mjs`、`studio.html`：子代理**不准改**。
  - 真的需要改（例如角色 API 有 bug、缺一個姿勢），子代理寫進報告。由你判斷：一次只由你一個人改，改動要小，commit 訊息寫清楚。
  - 動到角色或場景的外觀時，用 `[ask]` 讓主 session 先看。
- `studio.html` 已經載入全部段落檔，不用動。

## 審稿圖（push 到 `claude/mac-local`，主 session 看這些）
每組放在 `docs/review/<組>/`，例如 `docs/review/G1/`，總共控制在 3 MB 以內：
- `sheet.jpg`：每個 read 的中點各一格，`--cols=4 --w=480`，每格附時間標籤（render.mjs 會自動加）。
- `key_<shot>.jpg`：每個鏡頭最重要的那一格，全尺寸轉 JPEG 品質 85。
- `strip_<shot>.jpg`：只有動作關鍵的鏡頭才需要，例如表演和轉場。
- `notes.md`：每個鏡頭一行，寫做了什麼、每幀秒數、已知的弱點。

另外，每組要在本機出一支有聲音的預覽，**不 commit**，留給使用者自己看：
`node render.mjs --video --from=<a> --to=<b> --workers=3 --audio=../music/build/master_preview.m4a --out=out/preview_<組>.mp4`

## 給子代理的指示範本（依組別替換段落）

> 你要在一支手繪水彩 MV「病名為AI / The Disease Called AI」裡製作 **<段落>** 的鏡頭（<時間>，鏡頭 <清單>）。repo 在 `<路徑>`，引擎在 `film/`（p5.js + p5.brush，`film/render.mjs` 無頭算圖，macOS Metal 很快）。
>
> **先讀**
> 1. `film/STORYBOARD.md`：
>    - §0 全片規則：字幕安全區 y < 0.76H、lyricMode、畫面文字白名單、畫面方向（她和螢幕在左、門和現實在右）、尺寸、服裝、她的介面元素瞬間出現；
>    - §2–§5 世界觀、motif、情緒弧、押韻；
>    - §6 你的段落全文（每個鏡頭的 READS 都有起訖秒數，必須在那個時窗內讓觀眾的眼睛找到那個東西）；
>    - §7.4 成本。
> 2. `film/README_ENGINE.md`、`film/src/scenes/README.md`（若已存在）、`film/src/scenes/_kit.js`，以及範例實作 `film/src/scenes/s00_intro.js` 和 `s01_riff.js`。照它們的結構寫。
> 3. `film/docs/ANIMATION_GUIDE.upstream.md`：動畫原則要做到預備、跟隨、回彈和次要動作。
> 4. 角色 API：`film/src/chars/him.STATUS.md`、`ai.STATUS.md`（用到的函式要去讀程式碼）。場景：`film/src/sets/STATUS.md`，裡面有每個鏡頭的取景指南；`film/src/sets/sheet.js` 有每個場景變體的呼叫範例。重複使用，不要重畫場景。
> 5. `docs/05_style_guide.md`。
>
> **做**：只改你自己的段落檔 `film/src/scenes/<檔名>`。
> - 時間優先用 `film/src/data.js` 的資料（`events()`、`kitCut()`、`kitEv()`、歌詞行），找不到才用分鏡上的數字。
> - 所有東西都必須是 t 的純函數：不用 `Math.random`，boil 用 `boilSeed`，靜態的水彩放進 `cachedLayer`，key 裡要包含所有會變的參數。
> - 角色要保持定稿造型，不准重新設計。
> - 畫面裡的字只能是白名單上的。
>
> **品質**：使用者標準極高，要求細節多，必須看起來是手繪水彩（水洗、墨線、glow），絕不能像平面向量圖。每個 read 都要檢查：
> - 主體是不是畫面上最亮、對比最高的東西？
> - 有人唱或說話時，重要的東西有沒有掉到 y = 0.76H 以下？
> - 手和道具是不是真的接觸到了？
> - 轉場有沒有把剪接點藏好？
>
> 用 `--sheet`、`--strip`、`--crop` 出圖，用 Read 自己看圖，迭代到每個 read 都成立為止。
>
> **決定性**：Metal 上 `check_determinism.mjs` 偶爾會有極少數像素的隨機差異（約 100 px 以內，見 `docs/tasks/mac_01_report.md`），那是可接受的雜訊。大面積的差異才代表你的程式不是 t 的純函數，必須修正。
>
> **限制**：
> - 不改共用檔案（`_kit.js`、`chars`、`sets`、`core.js`、`lyrics.js`、`render.mjs`、`studio.html`）。需要改就寫在報告裡。
> - 不准 git commit，總負責會 commit。
> - 算圖最多用 2 個 worker，只結束你自己啟動的程序。
>
> **交付**：
> - 段落檔；
> - `docs/review/<組>/` 裡的 `sheet.jpg`、`key_*.jpg`、`strip_*.jpg`、`notes.md`；
> - 本機預覽 `film/out/preview_<組>.mp4`。
>
> **報告**（400 字以內）：每個鏡頭做了什麼、每幀秒數、需要改共用檔案的請求、已知的弱點。

## 狀態檔
`docs/tasks/mac_02_status.md` 是一張表，列出每組的狀態（進行中／待審／修改中／通過）、每幀秒數、`[ask]` 問題和使用者可以看的預覽路徑。每次 push 都要更新。

## 最後
六組都通過以後，主 session 會另外派「全片最終算圖」的任務。
