import Link from "next/link";
import type { ElementType, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function StatCard({ label, value, icon: Icon, href, iconClass = "bg-brand-100 text-brand-700" }: {
  label: string; value: ReactNode; icon: ElementType; href?: string; iconClass?: string;
}) {
  const card = <Card className="h-full"><div className="flex items-start gap-4"><span className={`rounded-xl p-3 ${iconClass}`}><Icon aria-hidden="true" className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="text-sm font-medium text-gray-500">{label}</p><p className="mt-1 font-heading text-3xl font-bold text-gray-950">{value}</p></div>{href && <ArrowRight aria-hidden="true" className="h-4 w-4 text-gray-400" />}</div></Card>;
  return href ? <Link href={href} className="rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600" aria-label={`${label}: ${value}. Buka detail`}>{card}</Link> : card;
}

export function Timeline({ items }: { items: { id: string; title: ReactNode; meta?: ReactNode; body?: ReactNode }[] }) {
  return <ol className="space-y-0">{items.map((item, index) => <li key={item.id} className="relative flex gap-4 pb-6 last:pb-0"><span aria-hidden="true" className="relative z-10 mt-1 h-3 w-3 shrink-0 rounded-full bg-brand-600 ring-4 ring-brand-50" />{index < items.length - 1 && <span aria-hidden="true" className="absolute left-[5px] top-4 h-full w-px bg-gray-200" />}<div className="min-w-0"><div className="flex flex-wrap items-center gap-2">{item.title}{item.meta}</div>{item.body && <div className="mt-2 text-sm text-gray-700">{item.body}</div>}</div></li>)}</ol>;
}

export function ActivityList({ items }: { items: { id: string; title: string; description?: string; time?: string }[] }) {
  return <ul className="divide-y divide-gray-100">{items.map((item) => <li key={item.id} className="py-3 first:pt-0 last:pb-0"><p className="text-sm font-semibold text-gray-900">{item.title}</p>{item.description && <p className="mt-1 text-sm text-gray-600">{item.description}</p>}{item.time && <time className="mt-1 block text-xs text-gray-500">{item.time}</time>}</li>)}</ul>;
}

export function DetailList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return <dl className="space-y-3 text-sm">{items.map((item) => <div key={item.label}><dt className="text-gray-500">{item.label}</dt><dd className="font-semibold text-gray-900">{item.value ?? "—"}</dd></div>)}</dl>;
}
