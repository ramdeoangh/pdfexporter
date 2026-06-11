# Branching guide

## Branches

| Branch | Role |
| --- | --- |
| `develop` | **Default.** All features merge here first. |
| `main` | Release branch. Merge from `develop` via PR only. |
| `feature-<name>` | Short-lived work branches. |

## Naming

Use lowercase with hyphens:

```text
feature-right-click-menu
feature-pdf-logo
feature-mermaid-export
```

Do **not** commit directly to `main`. Do **not** open feature PRs targeting `main`.

## Flow

```text
feature-<name>  →  PR  →  develop  →  PR  →  main  →  tag v*  →  Marketplace
```

See [release-pipeline.md](./release-pipeline.md) for CI/CD and release steps.
