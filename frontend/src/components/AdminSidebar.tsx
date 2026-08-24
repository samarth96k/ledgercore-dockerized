import { NavLink } from "react-router-dom";

const items = [
  // {
  //   label: "Dashboard",
  //   path: "/admin",
  // },
  {
    label: "Accounts",
    path: "/admin/accounts",
  },
  {
    label: "Ledger",
    path: "/admin/ledger",
  },
  {
    label: "Transactions",
    path: "/admin/transactions",
  },
  {
    label: "Events",
    path: "/admin/events",
  },
  {
    label: "Idempotency",
    path: "/admin/idempotency",
  },
  {
    label: "Reconciliation",
    path: "/admin/reconciliation",
  },
  {
    label: "Run Simulation",
    path: "/admin/simulation",
    desc:"For developer only"
  },
  {
    label: "Simulation Results",
    path: "/admin/simulation-results",
    desc:"For developer only"
  },
];

export default function AdminSidebar() {
  return (
    <aside className="min-h-[calc(100vh-89px)] w-60 border-r bg-white">
      <nav className="p-4">
        <div className="space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/admin"}
              className={({ isActive }) =>
                `block rounded px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`
              }
            >
              {item.label}
              <div className="text-red-300  hover:bg-slate-50">{item.desc && item.desc}</div>
              
            </NavLink>
          ))}
        </div>
      </nav>
    </aside>
  );
}