# Layout Regression Sample

Export this file before each release and check the PDF: every diagram readable and centred, no page that is mostly blank, the table split across pages with its header repeated, long code lines wrapped, and the broken diagram shown as a red error box.

## 1. Wide flowchart (LR)

```mermaid
flowchart LR
  A[Client request] --> B[API Gateway] --> C[Auth service] --> D[Router] --> E[Order service] --> F[Inventory service] --> G[Pricing service] --> H[Tax engine] --> I[Payment service]
```

## 2. Pie chart

```mermaid
pie title Connector usage
  "Shopify" : 42
  "Amazon" : 28
  "TikTok" : 18
  "Walmart" : 12
```

## 3. XY chart

```mermaid
xychart-beta
  title "Monthly exports"
  x-axis [jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec]
  y-axis "Count" 0 --> 1000
  bar [120, 230, 310, 400, 520, 610, 580, 700, 820, 760, 900, 950]
  line [100, 200, 300, 380, 500, 600, 560, 680, 800, 740, 880, 930]
```

## 4. Gantt

```mermaid
gantt
  title Release plan
  dateFormat YYYY-MM-DD
  section Build
  Design :a1, 2026-01-01, 10d
  Implement :a2, after a1, 20d
  section Test
  QA :b1, after a2, 7d
  UAT :b2, after b1, 5d
```

## 5. Architecture Diagrams

### 5.1 Tall flowchart (taller than a page)

```mermaid
flowchart TD
  S1[Step 1] --> S2[Step 2] --> S3[Step 3] --> S4[Step 4] --> S5[Step 5] --> S6[Step 6] --> S7[Step 7] --> S8[Step 8] --> S9[Step 9] --> S10[Step 10] --> S11[Step 11] --> S12[Step 12] --> S13[Step 13] --> S14[Step 14] --> S15[Step 15] --> S16[Step 16]
```

### 5.2 Sequence

```mermaid
sequenceDiagram
  participant U as User
  participant E as Extension
  participant C as Chrome
  U->>E: Export
  E->>C: launch
  C-->>E: ready
  E->>C: open page
  C-->>E: diagrams rendered
  E->>C: print to PDF
  C-->>E: bytes
  E-->>U: done
```

## 6. Broken diagram (should show an error box)

```mermaid
flowchart TD
  A --> B -->
  this is not valid ((
```

## 7. Long table

Text before the table so it starts mid-page.

| # | Name | Description | Status |
| --- | --- | --- | --- |
| 1 | Alpha | Lorem ipsum dolor sit amet consectetur | OK |
| 2 | Bravo | Lorem ipsum dolor sit amet consectetur | OK |
| 3 | Charlie | Lorem ipsum dolor sit amet consectetur | OK |
| 4 | Delta | Lorem ipsum dolor sit amet consectetur | OK |
| 5 | Echo | Lorem ipsum dolor sit amet consectetur | OK |
| 6 | Foxtrot | Lorem ipsum dolor sit amet consectetur | OK |
| 7 | Golf | Lorem ipsum dolor sit amet consectetur | OK |
| 8 | Hotel | Lorem ipsum dolor sit amet consectetur | OK |
| 9 | India | Lorem ipsum dolor sit amet consectetur | OK |
| 10 | Juliet | Lorem ipsum dolor sit amet consectetur | OK |
| 11 | Kilo | Lorem ipsum dolor sit amet consectetur | OK |
| 12 | Lima | Lorem ipsum dolor sit amet consectetur | OK |
| 13 | Mike | Lorem ipsum dolor sit amet consectetur | OK |
| 14 | November | Lorem ipsum dolor sit amet consectetur | OK |
| 15 | Oscar | Lorem ipsum dolor sit amet consectetur | OK |
| 16 | Papa | Lorem ipsum dolor sit amet consectetur | OK |
| 17 | Quebec | Lorem ipsum dolor sit amet consectetur | OK |
| 18 | Romeo | Lorem ipsum dolor sit amet consectetur | OK |
| 19 | Sierra | Lorem ipsum dolor sit amet consectetur | OK |
| 20 | Tango | Lorem ipsum dolor sit amet consectetur | OK |
| 21 | Uniform | Lorem ipsum dolor sit amet consectetur | OK |
| 22 | Victor | Lorem ipsum dolor sit amet consectetur | OK |

## 8. Long code line

```typescript
// a very long line that must wrap inside the page instead of being cut off at the right edge, which also used to shrink the whole document
export function exportMarkdownToPdf(markdownPath: string, outputPath: string): Promise<string> {
  return Promise.resolve(outputPath);
}
```
