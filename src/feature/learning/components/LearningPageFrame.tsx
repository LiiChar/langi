import type { ReactNode } from "react";
import { PageHeading } from "#ui/page-heading";

export function LearningPageFrame({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="window gap-6 p-5 md:p-8">
      <PageHeading title={title} description={subtitle} />
      {children}
    </div>
  );
}
