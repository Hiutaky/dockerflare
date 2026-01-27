import { promises as fs } from "fs";
import path from "path";
import { MDXRemote } from "next-mdx-remote/rsc";
import { notFound } from "next/navigation";
import { mdxOptions } from "../config";

interface Props {
  params: Promise<{
    slug: string[];
  }>;
}

export default async function DocsSlugPage({ params }: Props) {
  const { slug } = await params;
  const lastSlug = slug[slug.length - 1];
  const filePath = path.join(
    "docs",
    ...slug.slice(0, -1),
    lastSlug.endsWith(".md") ? lastSlug : lastSlug + ".md",
  );
  const docsPath = path.resolve(process.cwd(), "./" + filePath);
  let content: string;
  try {
    content = await fs.readFile(docsPath, "utf-8");
  } catch (error) {
    console.error(error);
    notFound();
  }

  const components = {
    // Custom components can be added here
  };

  return (
    <div className="prose prose-lg dark:prose-invert max-w-none">
      <MDXRemote
        source={content}
        components={components}
        options={{
          mdxOptions,
        }}
      />
    </div>
  );
}
