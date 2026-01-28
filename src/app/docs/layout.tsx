import { DocsSidebar } from "@/components/docs/DocsSidebar";
import { getDocsNavigation } from "@/lib/docs-navigation";

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navItems = await getDocsNavigation();

  return (
    <div className="grid lg:grid-cols-[auto_1fr] min-h-[calc(100vh-3.5rem)]">
      <DocsSidebar navItems={navItems} />
      <main className="flex-1 p-4 lg:p-6 max-h-[calc(100vh-3.5rem)] overflow-auto max-w-full">
        <div className="prose prose-sm lg:prose-lg dark:prose-invert max-w-none">
          {children}
        </div>
      </main>
    </div>
  );
}
