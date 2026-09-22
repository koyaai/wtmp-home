import { Mail, Phone, Video, Globe } from "lucide-react";

export default function ContactHeader({ contact, filled, total }) {
  const initials = (contact.full_name || "?")
    .split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
  const pct = total ? Math.round((filled / total) * 100) : 0;
  const comms = [
    { icon: Mail, label: "Email", href: contact.email ? `mailto:${contact.email}` : null },
    { icon: Phone, label: "Phone", href: contact.phone ? `tel:${contact.phone}` : null },
    { icon: Video, label: "Meeting", href: null },
    { icon: Globe, label: "Portal", href: null },
  ];
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <span className="text-blue-700 text-lg font-bold">{initials}</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{contact.full_name}</h1>
            {contact.preferred_name && <p className="text-sm text-slate-500">Preferred name {contact.preferred_name}</p>}
            {contact.client_name && <p className="text-xs text-slate-400 mt-0.5">{contact.client_name}</p>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 min-w-[180px]">
          <p className="text-xs text-slate-500 font-medium">{filled}/{total} fields in workbook</p>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        {comms.map((c, i) => {
          const Inner = (
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg">
              <c.icon className="w-3.5 h-3.5 text-blue-500" />
              <span>{c.label}</span>
            </div>
          );
          return c.href ? <a key={i} href={c.href} className="hover:opacity-80">{Inner}</a> : <div key={i}>{Inner}</div>;
        })}
      </div>
    </div>
  );
}