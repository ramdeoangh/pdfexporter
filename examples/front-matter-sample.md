---
title: Front Matter Sample
author: MD-PDF Exporter Team
date: 2026-06-15
pdf:
  showLogo: true
  showPageNumbers: true
  header: "DRAFT — Internal Use"
  footer: "Acme Corp"
---

# Front Matter Sample

This document demonstrates YAML front matter options.

## Mermaid

```mermaid
flowchart LR
    A[Front matter] --> B[PDF export]
    B --> C[Header / footer / page numbers]
```

## Front matter reference

```yaml
---
title: Document title
author: Author name
date: 2026-06-15
pdf:
  showLogo: true
  logo: ./path/to/logo.png
  showPageNumbers: true
  header: Custom header text
  footer: Custom footer text
  outputDirectory: ./output
  pageFormat: A4
---
```
