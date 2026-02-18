# Deploy Guide (Hostinger + Next.js)

## 1) GitHub
1. Push the repo to GitHub.
2. In hPanel: Node.js Apps -> Import Git Repository -> choose branch `main`.

## 2) Environment Variables
Set these in hPanel -> Node.js Apps -> Environment Variables:

Server:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- One of these credential options:
  - `FIREBASE_SERVICE_ACCOUNT_PATH` (recommended on Hostinger)
  - `GOOGLE_APPLICATION_CREDENTIALS` (path to same JSON file)
  - `FIREBASE_SERVICE_ACCOUNT_JSON` (full JSON as string)
  - `FIREBASE_SERVICE_ACCOUNT_JSON_BASE64` (JSON base64-encoded)
  - `FIREBASE_PRIVATE_KEY_BASE64` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PROJECT_ID`

Client (public):
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- `NEXT_PUBLIC_REVALIDATE_SECRET`
- `NEXT_DISABLE_TURBOPACK`

## 3) Service Account JSON (recommended path)
Store the JSON file **outside** `public_html` if possible:

Example:
`/home/uXXXX/domains/update3111.ultrastudypoint.in/secure/ultra-study-point-xxxx.json`

Then set:
`FIREBASE_SERVICE_ACCOUNT_PATH=/home/uXXXX/domains/update3111.ultrastudypoint.in/secure/ultra-study-point-xxxx.json`

If your hPanel only allows `public_html`, use:
`/home/uXXXX/domains/update3111.ultrastudypoint.in/public_html/secure/ultra-study-point-xxxx.json`

Notes:
- If Hostinger rejects long multiline private keys, use path-based vars above.
- Do not use typo var names. Use `FIREBASE_SERVICE_ACCOUNT_PATH` (with leading `F`).
- After env changes, always Redeploy.

## 4) Redeploy
After updating env vars or files, click **Redeploy** in Node.js Apps.

## 5) Local Dev
Create `secure/` locally and point `.env.local` to the JSON file path:
`FIREBASE_SERVICE_ACCOUNT_PATH=C:\path\to\secure\ultra-study-point-xxxx.json`

Make sure `secure/` and `.env.local` are ignored by Git.
