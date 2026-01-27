import Main from "@/components/Main";
import { Sidebar } from "@/components/Sidebar";
import TerminalsManager from "@/components/terminal/TerminalsManager";
import { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="grid w-full grid-cols-[auto_1fr]">
      <Sidebar />
      <Main>{children}</Main>
    </div>
  );
}
