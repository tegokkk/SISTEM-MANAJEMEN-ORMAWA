import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem { label: string; href?: string }

export function PageHeader({
  title,
  description,
  breadcrumbs = [],
  actions,
}: {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}) {
  return (
    <header className="space-y-3">
      {breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-gray-500">
          {breadcrumbs.map((item, index) => (
            <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
              {index > 0 && <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 text-gray-300" />}
              {item.href ? <Link className="hover:text-brand-600" href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-950 sm:text-3xl">{title}</h1>
          {description && <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-500">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
