# Sample Export

This document demonstrates Markdown PDF Exporter with diagrams and images.

## Flowchart

```mermaid
flowchart TD
    A[Open Markdown in Cursor] --> B[Run Export to PDF]
    B --> C{Mermaid blocks?}
    C -->|Yes| D[Render diagrams as SVG]
    C -->|No| E[Convert Markdown to HTML]
    D --> E
    E --> F[Generate PDF]
```

## Sequence diagram

```mermaid
sequenceDiagram
    participant User
    participant Cursor
    participant Exporter
    User->>Cursor: Edit .md file with diagrams
    User->>Exporter: Markdown PDF Exporter: Export to PDF
    Exporter->>Exporter: Render Mermaid locally
    Exporter-->>User: document.pdf
```

## Code block

```typescript
export async function exportMarkdownToPdf(path: string): Promise<string> {
  return path.replace(/\.md$/, ".pdf");
}
```

## Table

| Feature | Supported |
| --- | --- |
| Mermaid flowcharts | Yes |
| Local images | Yes |
| Syntax highlighting | Yes |
