import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "../auth/ProtectedRoute.jsx";
import AppShell from "../components/layout/AppShell.jsx";

import Login from "../pages/Login.jsx";
import Dashboard from "../pages/Dashboard.jsx";
import Medicines from "../pages/Medicines.jsx";
import Batches from "../pages/Batches.jsx";
import Inventory from "../pages/Inventory.jsx";
import POS from "../pages/POS.jsx";
import Purchases from "../pages/Purchases.jsx";
import Customers from "../pages/Customers.jsx";
import Suppliers from "../pages/Suppliers.jsx";
import Reports from "../pages/Reports.jsx";
import Compliance from "../pages/Compliance.jsx";
import Admin from "../pages/Admin.jsx";
import SettingsRoles from "../pages/SettingsRoles.jsx";
import SettingsModules from "../pages/SettingsModules.jsx";
import SettingsBranding from "../pages/SettingsBranding.jsx";
import SettingsOrg from "../pages/SettingsOrg.jsx";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell>
              <Dashboard />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route path="/pos" element={<ProtectedRoute><AppShell><POS /></AppShell></ProtectedRoute>} />
      <Route path="/medicines" element={<ProtectedRoute><AppShell><Medicines /></AppShell></ProtectedRoute>} />
      <Route path="/batches" element={<ProtectedRoute><AppShell><Batches /></AppShell></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute><AppShell><Inventory /></AppShell></ProtectedRoute>} />
      <Route path="/purchases" element={<ProtectedRoute><AppShell><Purchases /></AppShell></ProtectedRoute>} />
      <Route path="/customers" element={<ProtectedRoute><AppShell><Customers /></AppShell></ProtectedRoute>} />
      <Route path="/suppliers" element={<ProtectedRoute><AppShell><Suppliers /></AppShell></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><AppShell><Reports /></AppShell></ProtectedRoute>} />
      <Route path="/compliance" element={<ProtectedRoute><AppShell><Compliance /></AppShell></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute requirePerms={["USER_ADMIN"]}><AppShell><Admin /></AppShell></ProtectedRoute>} />
      <Route path="/settings/roles" element={<ProtectedRoute requirePerms={["ROLE_READ", "USER_ADMIN"]}><AppShell><SettingsRoles /></AppShell></ProtectedRoute>} />
      <Route path="/settings/modules" element={<ProtectedRoute requirePerms={["SETTINGS_READ", "USER_ADMIN"]}><AppShell><SettingsModules /></AppShell></ProtectedRoute>} />
      <Route path="/settings/branding" element={<ProtectedRoute requirePerms={["SETTINGS_READ", "USER_ADMIN"]}><AppShell><SettingsBranding /></AppShell></ProtectedRoute>} />
      <Route path="/settings/org" element={<ProtectedRoute requirePerms={["SETTINGS_READ", "USER_ADMIN"]}><AppShell><SettingsOrg /></AppShell></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
