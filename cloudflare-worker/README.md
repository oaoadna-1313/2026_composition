# 🚀 Cloudflare Worker 邊緣串流代理（Gemini SSE Proxy）部署指南

本專案提供高速度、零冷啟動、支援 SSE 逐字打字機串流的 Google Gemini API 邊緣代理服務。

---

## 🎯 為什麼使用 Cloudflare Worker？
1. **極速響應**：全球 CDN 節點邊緣執行，首字回傳僅需 0.5 ~ 1.5 秒（原本 GAS 需 8 ~ 15 秒）。
2. **打字機串流（SSE）**：逐字即時流式輸出，學生不用盯著轉圈等待。
3. **金鑰安全**：API Key 保存在 Cloudflare 後端 Secrets 中，前端完全不洩漏。
4. **免費額度充足**：Cloudflare 免費方案每天提供 100,000 次請求，全校班級同時使用綽綽有餘。

---

## 🛠️ 3 分鐘快速部署步驟

### 第一步：登入 Cloudflare 並建立 Worker
1. 前往 [Cloudflare 官網](https://dash.cloudflare.com/) 登入或免費註冊帳號。
2. 在左側選單點擊 **Workers & Pages**（或 **Compute (Workers)**）➔ **Create Application** ➔ **Create Worker**。
3. 為您的 Worker 取一個名字（例如：`gemini-stream-coach`），點擊 **Deploy**。

### 第二步：貼上代理程式碼
1. 建立完成後，點擊右上角的 **Edit code**（編輯代碼）。
2. 將本目錄中的 `gemini-stream-worker.js` 內容完整複製，並覆蓋替換掉編輯器中的原有程式碼。
3. 點擊右上角 **Deploy**（部署）儲存。

### 第三步：設定您的 Gemini API Key（安全環境變數）
1. 回到 Worker 的主頁面，點擊 **Settings**（設定）標籤頁。
2. 找到 **Variables and Secrets**（變數與機密）區塊，點擊 **Add**：
   - **Variable name**：`GEMINI_API_KEY`
   - **Value**：貼上您從 [Google AI Studio](https://aistudio.google.com/app/apikey) 免費取得的 API 金鑰（格式為 `AIzaSy...`）。
   - 勾選 **Encrypt**（加密為 Secret），確保安全。
3. 點擊 **Deploy** / **Save** 儲存。

---

## 🔗 取得您的專屬 Worker 網址
在 Worker 的主頁面上方，您會看到一串專屬網址，格式如下：
```text
https://gemini-stream-coach.<你的帳號前綴>.workers.dev
```

### 驗證 Worker 是否成功上線：
直接在瀏覽器開啟該網址，若看到以下 JSON 回應即代表部署成功：
```json
{
  "status": "online",
  "message": "🚀 Gemini Stream Worker 正在全力運作中！",
  "hasKeyConfigured": true
}
```

---

## 📱 在寫作教學網頁中使用
將取得的 Worker 網址貼入前端網頁中的設定，或在頁面上點擊 ⚙️ 按鈕設定 Worker 網址，即可立即享受 1 秒極速逐字打字機回饋！
