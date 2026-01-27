import { DocsSidebar } from "@/components/docs/DocsSidebar";
import { getDocsNavigation } from "@/lib/docs-navigation";

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navItems = await getDocsNavigation();

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <DocsSidebar navItems={navItems} />
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
