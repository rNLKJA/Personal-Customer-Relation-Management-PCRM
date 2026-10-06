import { PublicShell } from "@/components/layout/public-shell";

/** Public shell for the guided tour (same header and footer as /methods). */
export default function TourLayout({ children }: LayoutProps<"/tour">) {
  return (
    <PublicShell
      navLabel="Site"
      links={[
        { href: "/tour", label: "Tour" },
        { href: "/methods", label: "Methods" },
      ]}
    >
      {children}
    </PublicShell>
  );
}
