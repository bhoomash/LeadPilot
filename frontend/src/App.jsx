import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { LeadsManagement } from './pages/LeadsManagement';
import { LeadDetails } from './pages/LeadDetails';
import { ImportLeads } from './pages/ImportLeads';
import { Settings } from './pages/Settings';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="leads" element={<LeadsManagement />} />
          <Route path="leads/:id" element={<LeadDetails />} />
          <Route path="import" element={<ImportLeads />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
