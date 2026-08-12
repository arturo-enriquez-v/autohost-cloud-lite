import type { ReactNode } from "react";

// Full-height layout specifically for the topology canvas —
// removes the padding and overflow scroll of the parent <main> element.
export default function NetworkingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-full -m-4 sm:-m-6 overflow-hidden">
      {children}
    </div>
  );
}
