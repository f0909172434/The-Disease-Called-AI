# Mac 02 製作狀態

| 組 | 段落 | 狀態 | 每幀秒數 | [ask] | 本機預覽 |
|---|---|---|---|---|---|
| G1 | S02+S03 | 進行中 | – | – | `film/out/preview_G1.mp4` |
| G2 | S04+S05 | 修改中（fix #1：P1 五項） | 穩定幀約 0.1，重畫層／tile 時 0.8–1 | – | `film/out/preview_G2.mp4` |
| G3 | S06+S07 | 待審（已 push） | 單 worker 約 0.1–0.5（重畫 tile 的幀到 1.3） | – | `film/out/preview_G3.mp4`（804 幀，2 workers 牆鐘 1.8 min） |
| G4 | S08 | 進行中 | – | – | `film/out/preview_G4.mp4` |
| G5 | S09 | 未開始 | – | – | – |
| G6 | S10–S13 | 未開始 | – | – | – |

## 共用檔案請求（候選，等主 session 決定）
- him IV 管下垂：已加 `ivSag` 選項（lead 改，預設不變），04C 修改時使用。
- `setShards` 水彩化：已完成（lead 改）。
- G3 回報：`aiShards` 只在人物座標落在 1920×1080 層內才正常（07B 先 translate）；建議文件化或修；`kitSmear` 線條太粗像雲（G3 自寫了 `s06Streaks`）；'sit' 姿勢沒有把手機放在地板上的方式。
