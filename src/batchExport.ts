import * as fs from "fs";
import * as path from "path";

export function findMarkdownFiles(
  folderPath: string,
  recursive: boolean
): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(folderPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry.name);

    if (entry.isDirectory() && recursive) {
      results.push(...findMarkdownFiles(fullPath, recursive));
      continue;
    }

    if (
      entry.isFile() &&
      (entry.name.endsWith(".md") || entry.name.endsWith(".markdown"))
    ) {
      results.push(fullPath);
    }
  }

  return results.sort();
}
