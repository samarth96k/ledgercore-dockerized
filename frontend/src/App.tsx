import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import Wallet from "./pages/user/Wallet";
import UserLayout from "./pages/user/UserLayout";
import TransactionResult from "./pages/user/TransactionResult";
import Ledger from "./pages/user/Ledger";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminRoute from "./components/AdminRoute";
import Accounts from "./pages/admin/Accounts";
import AdminLedger from "./pages/admin/Ledger";
import Transactions from "./pages/admin/Transactions";
import Events from "./pages/admin/Events";
import Idempotency from "./pages/admin/Idempotency";
import Reconciliation from "./pages/admin/Reconciliation";
import Simulation from "./pages/admin/Simulation";
import SimulationResults from "./pages/admin/SimulationResults";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/signup" element={<Signup />} />

      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route element={<UserLayout />}>
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/ledger" element={<Ledger />} />
        <Route path="/wallet/result" element={<TransactionResult />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />

      {/* ADMIN******************************************************************************************** */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<div>Admin Dashboard</div>} />
        <Route path="accounts" element={<Accounts />} />
        <Route path="ledger" element={<AdminLedger />} />
        <Route path="/admin/transactions" element={<Transactions />} />
        <Route path="/admin/events" element={<Events />} />
        <Route path="/admin/idempotency" element={<Idempotency />} />
        <Route path="/admin/reconciliation" element={<Reconciliation />} />
        <Route path="simulation" element={<Simulation />} />
        <Route path="simulation-results" element={<SimulationResults />} />{" "}
      </Route>
    </Routes>
  );
}

export default App;
