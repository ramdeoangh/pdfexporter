# Publishing MD-PDF Exporter

How to release this extension for VS Code and Cursor users.

For the full CI/CD pipeline, see **[automated-release.md](./automated-release.md)** and **[release-pipeline.md](./release-pipeline.md)**.

---

## Recommended release flow (GitHub)

This is the process used for **v0.2.x** releases.

```text
feature-<name>  →  PR  →  develop  →  PR  →  main  →  tag v*  →  GitHub Release
```

### Step 1 — Feature work

```powershell
git checkout develop
git pull origin develop
git checkout -b feature-my-change
# commit, push
```

Open a PR into **`develop`** and merge when CI passes.

### Step 2 — Release PR to main

1. Open a PR: base **`main`**, compare **`develop`**
2. Merge when CI passes
3. Ensure `package.json` `"version"` on `main` matches the release you are shipping (e.g. `0.2.2`)

Bump the version on your **feature branch** or in the **develop → main** PR if the release includes a new version.

### Step 3 — Tag on main (triggers automated release)

**When `package.json` already has the target version** (most feature releases):

```powershell
git checkout main
git pull origin main
git tag v0.2.2
git push origin v0.2.2
```

Do **not** use **Actions → Create Release** in this case — that workflow is for bumping to a *new* version on `main` and will fail if the version is unchanged.

**When you want automation to bump the version** (e.g. patch without a feature PR):

1. GitHub → **Actions** → **Create Release**
2. Branch: **`main`**
3. Version: `0.2.3` (no `v` prefix)
4. Run workflow — it bumps `package.json`, pushes `main`, and creates tag `v0.2.3`

### Step 4 — Release workflow (automatic on tag push)

Pushing `v*` starts the **Release** workflow, which:

1. Verifies tag matches `package.json` version
2. Lints, builds, packages VSIX (~4 MB; assets bundled under `package/assets/`)
3. Creates a **GitHub Release** with `pdfexporter-<version>.vsix` attached
4. Publishes to **VS Code Marketplace** if `VSCE_PAT` is set in repo secrets
5. Opens a **sync PR** to merge `main` into `develop` (required when `develop` is branch-protected)

Merge the sync PR when it appears so `develop` stays aligned with `main`.

### Step 5 — Verify

| Check | URL |
| --- | --- |
| GitHub Release | [github.com/ramdeoangh/pdfexporter/releases](https://github.com/ramdeoangh/pdfexporter/releases) |
| Marketplace | [ramdeoangh.pdfexporter](https://marketplace.visualstudio.com/items?itemName=ramdeoangh.pdfexporter) |
| Local install | Extensions → Install from VSIX, then **Developer: Reload Window** |

---

## Option 1 — VS Code Marketplace (manual publish)

Use this to publish without waiting for CI, or when `VSCE_PAT` is not configured.

### One-time setup

1. Create publisher **`ramdeoangh`** at [marketplace.visualstudio.com/manage](https://marketplace.visualstudio.com/manage)
2. Create an Azure DevOps PAT with **Marketplace → Manage** scope
3. Log in once:

```powershell
npx vsce login ramdeoangh
```

### Publish

```powershell
npm run build
npm run package
npx vsce publish -i package/pdfexporter-0.2.2.vsix
```

Or bump and publish in one step (updates `package.json`):

```powershell
npx vsce publish patch
```

---

## Option 2 — GitHub Releases only (no Marketplace)

If the Release workflow already ran, download the VSIX from the release page.

Manual upload:

```powershell
npm run build
npm run package
```

1. [github.com/ramdeoangh/pdfexporter/releases](https://github.com/ramdeoangh/pdfexporter/releases) → **Draft a new release**
2. Tag: `v0.2.2` (must match `package.json`)
3. Attach `package/pdfexporter-0.2.2.vsix`
4. Publish

---

## Install locally for testing

```powershell
npm run build
npm run package
cursor --install-extension package/pdfexporter-0.2.2.vsix
```

Reload the window, then test with `examples/sample.md`:

- Right-click → **MD-PDF Exporter** → **MD Preview**
- Right-click → **MD-PDF Exporter** → **Export to PDF**

---

## Pre-publish checklist

| Item | Required |
| --- | --- |
| Publisher ID `ramdeoangh` in `package.json` | Yes |
| README with install instructions | Yes |
| LICENSE file | Yes |
| Repository URL in `package.json` | Yes |
| `npm run lint` and `npm run build` pass | Yes |
| Tag `vX.Y.Z` matches `"version": "X.Y.Z"` | Yes (automated releases) |
| Icon `package/assets/img/mdexport.png` | Yes |

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `ENOENT` … `node_modules/github-markdown-css` | Upgrade to **v0.2.2+** (assets ship in `package/assets/vendor/`) |
| Create Release says version already exists | Version is already on `main` — tag manually instead |
| sync-develop push rejected | Merge the automated sync PR into `develop` |
| Marketplace not updated | Set `VSCE_PAT` secret or run `npx vsce publish` manually |
| Slow VSIX install | Use v0.2.1+ VSIX (~4 MB, not full `node_modules`) |

---

## Comparison

| Method | Public URL | Cursor install | Effort |
| --- | --- | --- | --- |
| VS Code Marketplace | marketplace.visualstudio.com | Search & Install | Medium (one-time setup) |
| GitHub Release | github.com/.../releases | Install from VSIX | Low |
| Tag + Release workflow | Both of the above | Automated | Lowest after setup |
