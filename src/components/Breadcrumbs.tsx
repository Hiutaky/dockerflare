"use client";

import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDocker } from "@/providers/docker.provider";

interface BreadcrumbItem {
  label: string;
  href?: string;
  isActive?: boolean;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const { getContainer, hosts } = useDocker();

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname.split("/").filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: "Dashboard", href: "/", isActive: pathname === "/" },
    ];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const pathUpToSegment = "/" + segments.slice(0, i + 1).join("/");
      let label = "";
      const href = pathUpToSegment;

      switch (segment) {
        case "containers":
          label = "Containers";
          if (segments[i + 1]) {
            // Container detail page
            const containerId = segments[i + 1];
            const container = getContainer(containerId);
            if (container) {
              const containerName =
                container.names?.[0]?.replace(/^\//, "") ||
                container.id.substring(0, 12);
              breadcrumbs.push({ label: "Containers", href: "/containers" });
              breadcrumbs.push({
                label: containerName,
                isActive: true,
              });
            } else {
              breadcrumbs.push({ label: "Container Details", isActive: true });
            }
            return breadcrumbs;
          }
          break;
        case "hosts":
          label = "Hosts";
          if (segments[i + 1]) {
            // Host detail page
            const hostId = segments[i + 1];
            const host = hosts.find((h) => h.id === hostId);
            if (host) {
              breadcrumbs.push({ label: "Hosts", href: "/hosts" });
              breadcrumbs.push({
                label: host.name,
                isActive: true,
              });
            } else {
              breadcrumbs.push({ label: "Host Details", isActive: true });
            }
            return breadcrumbs;
          }
          break;
        case "deploy":
          label = "Deploy Container";
          break;
        case "images":
          label = "Images";
          break;
        default:
          label = segment.charAt(0).toUpperCase() + segment.slice(1);
      }

      const isActive = pathUpToSegment === pathname;
      breadcrumbs.push({
        label: isActive ? label : label,
        href: isActive ? undefined : href,
        isActive,
      });

      if (isActive) break;
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // Don't show breadcrumbs on the dashboard
  if (pathname === "/") {
    return null;
  }

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-6">
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;

        return (
          <div key={crumb.href || crumb.label} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground/50 mx-1" />
            )}

            {crumb.href ? (
              <Link
                href={crumb.href}
                className="hover:text-foreground transition-colors flex items-center gap-1"
              >
                {index === 0 && <Home className="h-4 w-4" />}
                {crumb.label}
              </Link>
            ) : (
              <span
                className={`flex items-center gap-1 ${
                  isLast ? "text-foreground font-medium" : ""
                }`}
              >
                {index === 0 && <Home className="h-4 w-4" />}
                {crumb.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
