import rehypeHighlight from "rehype-highlight";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import { MDXRemoteProps } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";

export const mdxOptions: NonNullable<MDXRemoteProps["options"]>["mdxOptions"] =
  {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeHighlight, rehypeAutolinkHeadings, rehypeSlug],
  };
