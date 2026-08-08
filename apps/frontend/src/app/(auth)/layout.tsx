import { Layers, ShieldCheck, Zap, LineChart } from 'lucide-react';

const HIGHLIGHTS = [
  { icon: Zap, title: 'Everything in one place', text: 'CRM, projects, billing, HR and analytics together.' },
  { icon: ShieldCheck, title: 'Secure by default', text: 'JWT auth, RBAC, and tenant isolation built in.' },
  { icon: LineChart, title: 'Insightful dashboards', text: 'KPIs and reports that update in real time.' },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="brand-gradient relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, white 0, transparent 40%), radial-gradient(circle at 80% 60%, white 0, transparent 35%)',
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <Layers className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">CRM + ERP</span>
        </div>
        <div className="relative max-w-sm">
          <h1 className="text-3xl font-bold leading-tight">Run your whole business from one workspace.</h1>
          <p className="mt-3 text-white/80">
            Clients, projects, invoices, teams and AI — unified, secure and ready to scale.
          </p>
          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-sm text-white/70">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/60">© {new Date().getFullYear()} CRM + ERP. All rights reserved.</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
