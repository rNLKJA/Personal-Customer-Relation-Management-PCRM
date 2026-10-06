import { PublicShell } from "@/components/layout/public-shell";

/** Public documentation shell for /methods, the decision records and the model card. */
export default function MethodsLayout({ children }: LayoutProps<"/methods">) {
  return (
    <PublicShell
      navLabel="Documentation"
      links={[
        { href: "/methods", label: "Methods" },
        { href: "/methods#decisions", label: "Decisions", from: "md" },
        { href: "/methods/model-card", label: "Model card", from: "md" },
        { href: "/tour", label: "Tour", from: "md" },
      ]}
    >
      {children}
    </PublicShell>
  );
}
