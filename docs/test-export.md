# PDF Export Test

Use this file to test the Markdown PDF Exporter extension in Cursor.

## Flowchart

```mermaid
flowchart LR
    A[Open this file in Cursor] --> B[Run Export to PDF]
    B --> C[Check docs/test-export.pdf]
```

## Checklist

- [ ] Mermaid diagram appears as a graphic in the PDF
- [ ] Headings and tables render correctly
- [ ] Code blocks are syntax-highlighted

| Item | Expected |
| --- | --- |
| Output file | `docs/test-export.pdf` |
| Diagram | Rendered, not raw code |
