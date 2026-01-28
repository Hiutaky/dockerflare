import { promises as fs } from "fs";
import path from "path";
import { MDXRemote } from "next-mdx-remote/rsc";
import { mdxOptions } from "./config";

export default async function DocsPage() {
  const docsPath = path.resolve(process.cwd(), "./docs/index.md");
  const content = await fs.readFile(docsPath, "utf-8");
  const components = {
    // Custom components can be added here
  };
  return (
    <MDXRemote
      source={content}
      components={components}
      options={{
        mdxOptions,
      }}
    />
  );
}
