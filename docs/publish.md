# Publishing MD-PDF Exporter

How to make this extension publicly available for VS Code and Cursor users.

For **automated GitHub → Marketplace releases**, see **[release-pipeline.md](./release-pipeline.md)**.

---

## Option 1 — VS Code Marketplace (recommended)

Cursor installs extensions from the VS Code Marketplace. This is the standard way to publish publicly.

### 1. Create a publisher account

1. Go to [https://marketplace.visualstudio.com/manage](https://marketplace.visualstudio.com/manage)
2. Sign in with your Microsoft account (you can link GitHub)
3. Click **Create publisher**
4. Set publisher ID to: `ramdeoangh` (must match `package.json`)

### 2. Create a Personal Access Token (PAT)

1. Open [https://dev.azure.com](https://dev.azure.com) and sign in
2. Click your profile (top right) → **Personal access tokens**
3. Click **+ New Token**
4. Name: `vsce-publish`
5. Organization: **All accessible organizations**
6. Expiration: choose a duration (e.g. 90 days)
7. Scopes: **Custom defined** → check **Marketplace → Manage**
8. Click **Create** and copy the token (shown only once)

### 3. Log in with vsce (one time)

```powershell
cd C:\Connectors\application\studio\tools\pdfexporter
npx vsce login ramdeoangh
```

Paste your PAT when prompted.

### 4. Publish

```powershell
npm run build
npx vsce publish
```

Or bump version and publish in one step:

```powershell
npx vsce publish patch
```

(`patch` bumps `0.1.0` → `0.1.1`)

### 5. Public install URL

After a few minutes, the extension is live at:

`https://marketplace.visualstudio.com/items?itemName=ramdeoangh.pdfexporter`

Users install in Cursor or VS Code:

1. Open Extensions (`Ctrl+Shift+X`)
2. Search **Markdown PDF Exporter**
3. Click **Install**

---

## Option 2 — GitHub Releases (manual VSIX download)

Use this if you want a public download without Marketplace setup.

### 1. Build the VSIX

```powershell
cd C:\Connectors\application\studio\tools\pdfexporter
npm install
npm run build
npm run package
```

Output file:

`pdfexporter-0.1.0.vsix`

### 2. Create a GitHub Release

1. Go to [https://github.com/ramdeoangh/pdfexporter/releases](https://github.com/ramdeoangh/pdfexporter/releases)
2. Click **Draft a new release**
3. Tag: `v0.1.0`
4. Title: `v0.1.0`
5. Upload `pdfexporter-0.1.0.vsix`
6. Click **Publish release**

### 3. Users install from the release

1. Download `pdfexporter-0.1.0.vsix` from the release page
2. In Cursor: Extensions → `...` → **Install from VSIX...**
3. Select the downloaded file

---

## Install locally for testing (before publishing)

```powershell
cd C:\Connectors\application\studio\tools\pdfexporter
npm run package
```

In Cursor:

1. Extensions (`Ctrl+Shift+X`)
2. `...` → **Install from VSIX...**
3. Select `pdfexporter-0.1.0.vsix`
4. Reload Cursor if prompted

Test with `docs/test-export.md` → run **Markdown PDF Exporter: Export to PDF**.

---

## Pre-publish checklist

| Item | Required |
| --- | --- |
| Publisher ID `ramdeoangh` in `package.json` | Yes |
| README with usage instructions | Yes |
| LICENSE file | Yes |
| Repository URL in `package.json` | Yes |
| Icon `icon.png` (128×128) | Recommended |

---

## Updating after first publish

```powershell
npm run build
npx vsce publish patch
```

Use `minor` or `major` instead of `patch` for larger version bumps.

---

## Comparison

| Method | Public URL | Cursor install | Effort |
| --- | --- | --- | --- |
| VS Code Marketplace | marketplace.visualstudio.com | Search & Install | Medium (one-time setup) |
| GitHub Release | github.com/.../releases | Manual VSIX | Low |
