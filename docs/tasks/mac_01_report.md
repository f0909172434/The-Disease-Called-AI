# Mac 本機任務 01 報告：Metal 算圖速度、平行數、決定性

環境：Apple M5（10 核 CPU／10 核 GPU）、24 GB、macOS（Darwin 27.0.0）、Node 24.19.0、Chrome 154.0.8037.97、ffmpeg 在 `~/.local/bin`。
`--probe-gl` 結果：`ANGLE (Apple, ANGLE Metal Renderer: Apple M5)`，WebGL 2.0 正常。起點 commit `bf7f72b`（分支 `claude/mac-local`，與 `claude/compassionate-dijkstra-16o5bo` 同一點）。
**沒有改任何程式碼**（`film/src/**`、`render.mjs`、`tools/*` 都原樣），所以沒有 diff。

## 1. 單一 worker 每幀秒數（`--bench=48`，兩次，記第二次）

| 項目 | 內容 | 第 2 次 s/幀（48 幀平均） | 中位數 | 備註 |
|---|---|---|---|---|
| `--from=1` | 00A 螢幕 | 0.07 | 0.03 | cachedLayer 畫 6 次（各約 0.3 s），重用 43 次 |
| `--from=3` | 00B 他在書桌 | 0.07 | 0.05 | 同上 |
| `--from=6.5` | 00C 她揮手 | 0.11 | 0.08 | 同上 |
| `--from=12` | 01A 手腕特寫 | 0.11 | 0.09 | 畫 4 次，重用 45 次 |
| `--from=16` | 01B 病歷 | 0.11 | 0.10 | 同上 |
| `--loop=him_poses --from=0.5` | 他的 model sheet | 0.33 | 0.38 | 每幀穩定約 0.17 s 或 0.37 s（交替） |
| `--loop=ai_poses --from=4.5` | 她的 model sheet 第 5 頁（碎片＋拉霸） | 0.24 | 0.26 | 中位數 0.26，最慢幀 0.28 s |

第 1 次與第 2 次幾乎一樣（差 0.00–0.01 s），冷快取對平均值幾乎沒有影響，只有第一幀多 0.4–0.7 s。
重的角色畫面（him_poses）約 0.33 s/幀，是目前場景鏡頭（0.07–0.11 s）的 3–5 倍。

## 2. 平行數（`--video --from=0 --to=10 --no-audio --redo`，240 幀）

| workers | 牆鐘時間（整個指令） | render.mjs 回報的算圖時間 | 每幀平均（牆鐘） | 記憶體峰值（Chrome+node+ffmpeg 的 RSS 總和，會重複計算共用頁） | swap |
|---|---|---|---|---|---|
| 1 | 44–46 s | 24 s | 0.10 s | 4.7 GB | 沒增加 |
| 2 | 19 s | 18 s | 0.07 s | 6.1 GB | 沒增加 |
| 3 | 16 s（兩次都 16） | 14–15 s | 0.06 s | 7.2 GB | 沒增加 |
| 4 | 14–15 s | 13–15 s | 0.05–0.06 s | 8.1 GB | 沒增加 |
| 6 | 16 s | 15 s | 0.06 s | 10.1 GB | 沒增加 |

- 整個過程 swap 一直是 1018 MB（測試前就是這個數字，沒有因為算圖而成長）；`vm_stat` 的 free 頁最低 128–210 MB，但 macOS 會用壓縮記憶體，沒有出現 swap 成長。
- 10 秒、240 幀的測試太短（只有 10 個 1 秒 chunk），啟動成本佔比大，所以 3、4、6 差距在誤差內；超過 4 個沒有好處，6 個反而略慢（chunk 數不均、GPU 共用）。
- 1 worker 的牆鐘（44–46 s）比 render.mjs 自己印的 24 s 多出約 20 s，兩次一致，原因我沒有追究（2 個以上 worker 沒有這個落差）。不影響結論。
- **建議 `--workers=4`**（最快或並列最快，記憶體峰值約 8 GB RSS，24 GB 機器沒有壓力）。要在最終算圖時同時做別的事，可以用 3。

## 3. 全片估計（215 s × 24 fps = 5160 幀）

目前只有 S00–S01 是正式鏡頭，其餘是佔位畫面，所以只能給範圍：
- 下限：照 4 workers 現在量到的 0.05–0.06 s/幀（輕的場景鏡頭）→ 5160 × 0.055 ≈ **4.7 分鐘**。
- 保守上限：全片都像 him_poses／ai_poses（0.24–0.33 s/幀單 worker），4 workers 平行效率以 2.5–3 倍計 → 約 0.1 s/幀 → 5160 × 0.1 ≈ **9 分鐘**。
- 實務上預期 **5–15 分鐘**（含 chunk 編碼與最後 concat；音訊 mux 另計，幾秒）。之後場景變複雜時請用實際 `--bench` 重估。

## 4. 決定性

`node tools/check_determinism.mjs --range=0:22:0.5`（45 幀）：**不通過，42/45 相同，3 幀不同。**
- 不同的時間：**t=14、t=16、t=21.5**（A forward 的 hash 對 B shuffled 的 hash）：
  - t=14：`f703a7ebc5341f62` vs `143ae7810ed7b8d1`
  - t=16：`32a280a557413aa9` vs `c18c8f2961eed88c`
  - t=21.5：`0b74807b9169251e` vs `6eda1b6b043c161c`

`node tools/check_determinism.mjs --loop=ai_poses --times=0.5,4.5`：**不通過，1/2。** t=0.5 相同；**t=4.5 不同**（`15b0a1b1abb49822` vs `6edd9b2373990edb`）。

額外觀察（沒有改程式）：
- 是**隨機出現**的：只檢查 `--times=14,16,21.5,3,6.8` 時連跑兩次都全部一致；用 `--nocache` 檢查 14,16,21.5 時 t=21.5 又不同（t=14、16 這次相同），所以不是某幾個時間固定會錯，也不一定跟快取有關。
- 我把 45 幀的 forward／shuffled 順序各存成 PNG 比對：t=14 有差的像素落在 9×15 px 的一小塊（x=1031–1039、y=528–542），最大差 46／255，PSNR 77.5 dB；t=16 落在 2×3 px（x=1318–1319、y=533–535），最大差 75／255，PSNR 71.0 dB；這次 t=21.5 兩張完全相同。
- 也就是說差異是 **極少數像素（最多約 135 px，不到全幅的 0.01%）** 的不一致，肉眼幾乎看不出，但 bit 層級不 deterministic，所以 `--redo` 單獨重算某一秒時，那一秒的邊緣像素可能和原本不同。我猜是 Metal 上浮點／混合順序（或 p5.brush 筆刷）在不同 process 的微小差異，沒有證據指到特定函式，請雲端 session 判斷要不要處理。
- 因為是 chunk 內重複用同一個 process 渲染的，成片本身的畫面沒有可見問題；只有「某些 chunk 重算後 hash 不同」的風險。

## 5. 畫質檢查

`out/mac_check.jpg`（1、3.5、6.8、12.3、16.5、20 s，640 px 寬，3 欄）已放到 `docs/tasks/mac_check.jpg`（245 KB）；`--stills=6.8` 的全尺寸 PNG（1920×1080）轉成 JPEG 放到 `docs/tasks/mac_still_6.8.jpg`（139 KB，ffmpeg `-q:v 3`，約等於品質 92）。

打開看過：
- 水彩紋理：背景有紙張顆粒與暈染邊，沒有缺筆刷紋理；手、袖子、桌面都有顆粒。
- 墨線：他、手、AI 角色的描線連續、有手抖感，沒有斷線或鋸齒。
- glow：螢幕藍光、00A 波形光暈、對話框背後的光暈都正常，沒有色帶。
- 顏色：藍色調一致，膚色、橘色邊框、青色泡泡沒有偏色。
- 黑塊：沒有。
- 字幕：1–20 s 這幾個畫面本身沒有歌詞字幕（S00–S01 是畫面內文字）；我另外用 `--lyrics=karaoke` 在 t=5.2、30.2 各出一張（`film/out/mac_lyric_extra.jpg`，沒有 commit）：EN（Cormorant Garamond Italic）＋中文字型都正確載入，karaoke 暗／亮、`you` 標籤、游標都正常。
- 沒有發現任何 Metal 特有的異常。

## 6. 其他

- 輸出的測試檔在 `film/out/`（bench_w*.mp4、log、sampler 記錄），沒有 commit（`film/out` 不進 git）。
- 沒有送出 SendMessage 給 `the-disease-called-ai-df`（這個 session 沒有可用的對象），請使用者轉達。
