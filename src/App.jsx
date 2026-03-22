import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore }    from './store/authStore';
import { useLayoutEffect } from 'react';

// Auth pages
import UnifiedLogin      from './pages/auth/UnifiedLogin';
import ResetPassword     from './pages/auth/ResetPassword';
import AccountActivation from './pages/auth/AccountActivation';

// Admin pages
import Dashboard      from './pages/admin/Dashboard';
import EmployeeList   from './pages/admin/EmployeeList';
import NewEmployee    from './pages/admin/NewEmployee';
import EmployeeDetails from './pages/admin/EmployeeDetails';
import ClientList     from './pages/admin/ClientList';
import Loans          from './pages/admin/Loans';
import PaymentOverview from './pages/admin/PaymentOverview';
import Accounts       from './pages/admin/Accounts';
import CardsPage      from './pages/admin/CardsPage';

// Client pages
import ClientDashboard  from './pages/client/ClientDashboard';
import ClientAccounts   from './pages/client/ClientAccounts';
import ClientCards      from './pages/client/ClientCards';
import ClientExchange   from './pages/client/ClientExchange';
import ClientLoans      from './pages/client/ClientLoans';
import ClientRecipients from './pages/client/ClientRecipients';
import ClientTransfers  from './pages/client/ClientTransfers';
import NewPayment       from './pages/client/NewPayment';

// Shared
import NotFound from './pages/NotFound';

import CreateTransfer   from './features/transfers/CreateTransfer';
import ConfirmTransfer  from './features/transfers/ConfirmTransfer';
import TransfersHistory from './features/transfers/TransfersHistory';

import RatesList        from './features/exchange/RatesList.jsx';
import CurrencyCalculator from './features/exchange/CurrencyCalculator.jsx';

import SupervisorOrdersPage from './pages/supervisor/SupervisorOrdersPage.jsx';
import {isSupervisorLike} from './utils/roleGuards.js';


function ProtectedRoute({ children }) {
  const token = useAuthStore(s => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function PermissionRoute({ permission, children }) {
  const permissions = useAuthStore(s => s.user?.permissions ?? []);
  if (!permissions.includes(permission)) return <Navigate to="/dashboard" replace />;
  return children;
}

function ClientRoute({ children }) {
  const identityType = useAuthStore(s => s.user?.identity_type);
  if (identityType !== 'CLIENT') return <Navigate to="/admin" replace />;
  return children;
}

function EmployeeRoute({ children }) {
  const identityType = useAuthStore(s => s.user?.identity_type);
  if (identityType !== 'EMPLOYEE') return <Navigate to="/dashboard" replace />;
  return children;
}

function SupervisorRoute({ children }) {
  const user = useAuthStore(s => s.user);
  if (!isSupervisorLike(user)) { return <Navigate to="/dashboard" replace />; }
  return children;
}

export default function App() {
  const token = useAuthStore(s => s.token);
  const user = useAuthStore(s => s.user);
  
  // Inicijalizuj auth iz localStorage PRE prvog rendera
  useLayoutEffect(() => {
    useAuthStore.getState().initFromStorage();
  }, []);
  
  // Odluči gde da redirektuje na osnovu identity_type
  const getDefaultRoute = () => {
    if (!token) return '/login';
    if (!user)  return '/login';
    if (user.identity_type === 'CLIENT')   return '/dashboard';
    if (user.identity_type === 'EMPLOYEE') return '/admin';
    if (user.identity_type === 'SUPERVISOR') return '/supervisor/orders';

    return '/login';
  };
  
  return (
    <BrowserRouter>
      <Routes>

        {/* ROOT - Pametni redirect na osnovu role */}
        <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />

        {/* UNIFIED LOGIN */}
        <Route path="/login"            element={<UnifiedLogin />} />

        <Route path="/reset-password"   element={<ResetPassword />} />
        <Route path="/activate"         element={<AccountActivation />} />

        {/* KLIJENTSKE RUTE */}
        <Route path="/dashboard"           element={<ProtectedRoute><ClientRoute><ClientDashboard /></ClientRoute></ProtectedRoute>} />
        <Route path="/client/accounts"     element={<ProtectedRoute><ClientRoute><ClientAccounts  /></ClientRoute></ProtectedRoute>} />
        <Route path="/client/payments"     element={<ProtectedRoute><ClientRoute><PaymentOverview /></ClientRoute></ProtectedRoute>} />
        <Route path="/client/transfers"    element={<ProtectedRoute><ClientRoute><ClientTransfers /></ClientRoute></ProtectedRoute>} />
        <Route path="/client/exchange"     element={<ProtectedRoute><ClientRoute><ClientExchange  /></ClientRoute></ProtectedRoute>} />
        <Route path="/client/cards"        element={<ProtectedRoute><ClientRoute><ClientCards     /></ClientRoute></ProtectedRoute>} />
        <Route path="/client/loans"        element={<ProtectedRoute><ClientRoute><ClientLoans     /></ClientRoute></ProtectedRoute>} />
        <Route path="/client/payments/new" element={<ProtectedRoute><ClientRoute><NewPayment      /></ClientRoute></ProtectedRoute>} />
        <Route path="/client/recipients"   element={<ProtectedRoute><ClientRoute><ClientRecipients /></ClientRoute></ProtectedRoute>} />
        <Route path="/transfers/new"       element={<ProtectedRoute><ClientRoute><CreateTransfer  /></ClientRoute></ProtectedRoute>} />
        <Route path="/transfers/confirm"   element={<ProtectedRoute><ClientRoute><ConfirmTransfer /></ClientRoute></ProtectedRoute>} />
        <Route path="/transfers/history"   element={<ProtectedRoute><ClientRoute><TransfersHistory /></ClientRoute></ProtectedRoute>} />

        {/* ADMIN/EMPLOYEE RUTE */}
        <Route path="/admin"     element={<ProtectedRoute><EmployeeRoute><Dashboard    /></EmployeeRoute></ProtectedRoute>} />
        <Route path="/clients"   element={<ProtectedRoute><EmployeeRoute><ClientList   /></EmployeeRoute></ProtectedRoute>} />
        <Route path="/loans"     element={<ProtectedRoute><EmployeeRoute><Loans        /></EmployeeRoute></ProtectedRoute>} />
        <Route path="/payments"  element={<ProtectedRoute><EmployeeRoute><PaymentOverview /></EmployeeRoute></ProtectedRoute>} />
        <Route path="/cards"     element={<ProtectedRoute><EmployeeRoute><CardsPage    /></EmployeeRoute></ProtectedRoute>} />
        <Route path="/accounts"  element={<ProtectedRoute><EmployeeRoute><Accounts     /></EmployeeRoute></ProtectedRoute>} />
        <Route path="/employees" element={
          <ProtectedRoute><EmployeeRoute><PermissionRoute permission="employee.view"><EmployeeList /></PermissionRoute></EmployeeRoute></ProtectedRoute>
        } />
        <Route path="/employees/new" element={
          <ProtectedRoute><EmployeeRoute><PermissionRoute permission="employee.create"><NewEmployee /></PermissionRoute></EmployeeRoute></ProtectedRoute>
        } />
        <Route path="/employees/:id" element={
          <ProtectedRoute><EmployeeRoute><PermissionRoute permission="employee.view"><EmployeeDetails /></PermissionRoute></EmployeeRoute></ProtectedRoute>
        } />
        <Route path="/supervisor/orders" element={
          <ProtectedRoute><EmployeeRoute><SupervisorRoute><SupervisorOrdersPage /></SupervisorRoute></EmployeeRoute></ProtectedRoute>
        } />

        <Route path="/exchange/rates"      element={<RatesList />} />
        <Route path="/exchange/calculator" element={<CurrencyCalculator />} />

        <Route path="*" element={<NotFound />} />



      </Routes>
    </BrowserRouter>
  );
}
