import { promises as fs } from "fs";
import path from "path";

export interface NavItem {
  title: string;
  href: string;
  items?: NavItem[];
}

/**
 * Convert filename to title (e.g., "getting-started.md" -> "Getting Started")
 */
function filenameToTitle(filename: string): string {
  return filename
    .replace(/\.md$/, "") // Remove .md extension
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Sort navigation items alphabetically with special ordering for common sections
 */
function sortNavItems(items: NavItem[]): NavItem[] {
  const order = [
    "getting-started",
    "overview",
    "prerequisites",
    "setup",
    "architecture",
    "api",
    "database",
    "tech-stack",
    "development",
    "guidelines",
    "deployment",
    "troubleshooting",
    "user-guide",
  ];

  return items.sort((a, b) => {
    const aIndex = order.findIndex((item) => a.href.includes(item));
    const bIndex = order.findIndex((item) => b.href.includes(item));

    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;

    return a.title.localeCompare(b.title);
  });
}

/**
 * Recursively build navigation structure from directory
 */
async function buildNavStructure(
  dirPath: string,
  baseHref = "/docs",
): Promise<NavItem[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const items: NavItem[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      const subItems = await buildNavStructure(
        fullPath,
        `${baseHref}/${entry.name}`,
      );

      if (subItems.length > 0) {
        items.push({
          title: filenameToTitle(entry.name),
          href: `${baseHref}/${entry.name}`,
          items: subItems,
        });
      }
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      const title = filenameToTitle(entry.name);

      items.push({
        title,
        href:
          entry.name === "index.md"
            ? baseHref
            : `${baseHref}/${entry.name.replace(".md", "")}`,
      });
    }
  }

  return sortNavItems(items);
}

/**
 * Get navigation structure for docs
 */
export async function getDocsNavigation(): Promise<NavItem[]> {
  const docsPath = path.resolve(process.cwd(), "docs");

  try {
    const items = await buildNavStructure(docsPath, "/docs");

    // Filter out index.md from the list since it's handled separately
    return items.filter((item) => item.href !== "/docs");
  } catch (error) {
    console.error("Error building docs navigation:", error);
    return [];
  }
}
