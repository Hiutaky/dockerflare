import Main from "@/components/Main";
import { Sidebar } from "@/components/Sidebar";
import { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <Sidebar />
      <Main>{children}</Main>
    </>
  );
}
