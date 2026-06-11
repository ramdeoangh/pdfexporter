# Automated release guide

Full automation for **build → tag → GitHub Release → Marketplace → sync develop**.

---

## Automated flow

```text
feature-<name>  →  PR  →  develop  →  PR  →  main
                                              ↓
                              GitHub Actions: Create Release (manual trigger)
                                              ↓
                              bump version + tag v* on main
                                              ↓
                              Release workflow (automatic)
                                              ↓
                    Marketplace publish + GitHub Release + sync develop
```

| Workflow | Trigger | What it does |
| --- | --- | --- |
| **CI** | PR / push to `develop` or `main` | Lint, build, VSIX artifact |
| **Create Release** | Manual (Actions tab) | Bump `package.json`, push `main`, create tag |
| **Release** | Push tag `v*` | Build, publish Marketplace, GitHub Release, sync `develop` |

---

## One-time setup

### 1. GitHub secret

**Settings → Secrets and variables → Actions → New repository secret**

| Name | Value |
| --- | --- |
| `VSCE_PAT` | Azure DevOps PAT with **Marketplace → Manage** scope |

Create PAT: [dev.azure.com](https://dev.azure.com) → Profile → Personal access tokens

### 2. Marketplace publisher

Publisher ID: **`ramdeoangh`** at [marketplace.visualstudio.com/manage](https://marketplace.visualstudio.com/manage)

### 3. Branch protection

Allow GitHub Actions to push to `main` and `develop` (required for automated version bump and sync):

**Settings → Actions → General → Workflow permissions**

- Select **Read and write permissions**
- Enable **Allow GitHub Actions to create and approve pull requests** (optional)

---

## Day-to-day (automated path)

### Step 1 — Feature work

```bash
git checkout develop
git pull origin develop
git checkout -b feature-my-change
# ... commit ...
git push -u origin feature-my-change
```

Open PR → **`develop`** → merge (CI must pass).

### Step 2 — Release PR

Open PR → **`main`** (base: `main`, compare: `develop`) → merge (CI must pass).

Do **not** bump version manually — automation does it in Step 3.

### Step 3 — Create release (one click)

1. Go to **GitHub → Actions → Create Release**
2. Click **Run workflow**
3. Branch: **`main`**
4. Version: e.g. `0.1.5` (no `v` prefix)
5. Click **Run workflow**

This automatically:

1. Bumps `package.json` on `main`
2. Pushes commit `chore: release v0.1.5`
3. Creates and pushes tag `v0.1.5`

### Step 4 — Release workflow runs automatically

Triggered by the new tag. It will:

1. Lint, build, package VSIX
2. Publish to **VS Code Marketplace**
3. Create **GitHub Release** with VSIX attached
4. Merge **`main`** back into **`develop`**

---

## Manual tag path (alternative)

If you prefer to bump version yourself:

```bash
git checkout main
git pull origin main
# edit package.json version
git commit -am "chore: release v0.1.5"
git push origin main
git tag v0.1.5
git push origin v0.1.5
```

The **Release** workflow runs on tag push (steps 4 above).

---

## Verify release

- **Marketplace:** [ramdeoangh.pdfexporter](https://marketplace.visualstudio.com/items?itemName=ramdeoangh.pdfexporter)
- **GitHub Releases:** [github.com/ramdeoangh/pdfexporter/releases](https://github.com/ramdeoangh/pdfexporter/releases)
- **Cursor:** Extensions → search **MD-PDF Exporter**

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Release failed: `VSCE_PAT secret is not set` | Add secret in GitHub Actions settings |
| Tag does not match package.json | Tag `v0.1.5` must match `"version": "0.1.5"` |
| Version already exists | Use a higher version in Create Release |
| sync-develop failed | Check workflow write permissions on repo |
| Marketplace publish failed | Renew PAT; confirm publisher `ramdeoangh` |

---

## Workflow files

| File | Purpose |
| --- | --- |
| `.github/workflows/ci.yml` | CI on `develop` / `main` |
| `.github/workflows/create-release.yml` | Manual version bump + tag |
| `.github/workflows/release.yml` | Publish + GitHub Release + sync develop |
