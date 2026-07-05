# GitHub + Cloudflare Pages 部署

## 1. 推到 GitHub

把這個專案上傳到你自己的 GitHub repository。

不要上傳：

- `node_modules`
- `.shared-storage.json`
- `dist`

## 2. 建立 Cloudflare Pages

到 Cloudflare 後台：

1. Workers & Pages
2. Create application
3. Pages
4. Connect to Git
5. 選你的 GitHub repository

設定：

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: 留空

## 3. 建立 KV 資料庫

到 Cloudflare 後台：

1. Workers & Pages
2. KV
3. Create namespace
4. 名稱建議：`sportslottery-data`

## 4. 綁定 KV

回到你的 Pages 專案：

1. Settings
2. Functions
3. KV namespace bindings
4. Add binding

設定：

- Variable name: `SF_STORE`
- KV namespace: 選剛剛建立的 `sportslottery-data`

Production 和 Preview 都可以綁同一個 KV；如果你想測試資料跟正式資料分開，就建立兩個 KV 分別綁定。

## 5. 重新部署

KV 綁定完成後，到 Deployments 按 Redeploy。

部署完成後：

- 前台首頁：`https://你的網域/`
- 後台：`https://你的網域/admin.html`
- 投注紀錄：`https://你的網域/mybet.html`
- 賽程：`https://你的網域/schedule.html`

## 帳號

- `sk1201` / `aaa888`
- `sk1203` / `aaa888`
- `sk1205` / `aaa888`
- `sk1207` / `aaa888`
- `koko85830` / `er85830`

`koko85830` 是管理員，可以停用或開啟其他帳號。
