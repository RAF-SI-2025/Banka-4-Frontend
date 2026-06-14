import TaxPage from './pages/admin/TaxPage';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore }    from './store/authStore';
import { useLayoutEffect } from 'react';
import { useTokenRefresh } from './hooks/useTokenRefresh';
import { usePermissions } from './hooks/usePermissions.js';

// Auth pages
import UnifiedLogin      from './pages/auth/UnifiedLogin';
import ResetPassword     from './pages/auth/ResetPassword';
import AccountActivation from './pages/auth/AccountActivation';

// Admin pages
import Dashboard       from './pages/admin/Dashboard';
import EmployeeList    from './pages/admin/EmployeeList';
import NewEmployee     from './pages/admin/NewEmployee';
import EmployeeDetails from './pages/admin/EmployeeDetails';
import ClientList      from './pages/admin/ClientList';
import ClientDetails   from './pages/admin/ClientDetails';
import NewClient       from './pages/admin/NewClient';
import Loans           from './pages/admin/Loans';
import PaymentOverview from './pages/admin/PaymentOverview';
import Accounts        from './pages/admin/Accounts';
import NewAccount      from './pages/admin/NewAccount';
import CardsPage       from './pages/admin/CardsPage';
import CardsPortal     from './pages/admin/CardsPortal';
import ClientsPortal   from './pages/admin/ClientsPortal';
import LoansPortal     from './pages/admin/LoansPortal';
import ActuariesPage   from './pages/admin/ActuariesPage';
import AuditLogPage    from './pages/admin/AuditLogPage';
import ExchangesPage   from './pages/admin/ExchangesPage';
import PortfolioPage from './pages/admin/PortfolioPage.jsx';
import OtcPonudePage from './pages/admin/OtcPonudePage.jsx';
import DtcPage from './pages/admin/DtcPage.jsx';

// Client pages
import ClientDashboard       from './pages/client/ClientDashboard';
import ClientAccounts        from './pages/client/ClientAccounts';
import ClientExchange        from './pages/client/ClientExchange';
import ClientLoans           from './pages/client/ClientLoans';
import ClientRecipients      from './pages/client/ClientRecipients';
import ClientTransfers       from './pages/client/ClientTransfers';
import ClientTransferHistory from './pages/client/ClientTransferHistory';
import ClientPaymentOverview from './pages/client/ClientPaymentOverview';
import NewPayment       from './pages/client/NewPayment';
import ClientSecurities from './pages/client/ClientSecurities';
import ClientPortfolioPage from './pages/client/ClientPortfolioPage';
import ClientFundsPage from './pages/client/ClientFundsPage';
import FundDetailsPage from './pages/funds/FundDetailsPage';
import ClientDtcPage from './pages/client/ClientDtcPage';

// Investment funds pages  ← NOVO
import FundDiscoveryPage from './pages/investmentFunds/FundDiscoveryPage';
import CreateFundPage    from './pages/investmentFunds/CreateFundPage';

// Shared
import NotFound from './pages/NotFound';

import CreateTransfer  from './features/transfers/CreateTransfer';
import ConfirmTransfer from './features/transfers/ConfirmTransfer';

import RatesList          from './features/exchange/RatesList.jsx';
import CurrencyCalculator from './features/exchange/CurrencyCalculator.jsx';

import SupervisorOrdersPage from './pages/supervisor/SupervisorOrdersPage.jsx';
import ProfitBankPage from './pages/profit-bank/ProfitBankPage.jsx';

import OtcPortalPage from './pages/otc/OtcPortalPage';
import MyOrdersPage from './pages/orders/MyOrdersPage.jsx';


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
  if (identityType !== 'client') return <Navigate to="/admin" replace />;
  return children;
}

function EmployeeRoute({ children }) {
  const identityType = useAuthStore(s => s.user?.identity_type);
  if (identityType !== 'employee') return <Navigate to="/dashboard" replace />;
  return children;
}

function SupervisorRoute({ children }) {
  const { isSupervisor } = usePermissions();
  if (!isSupervisor) return <Navigate to="/dashboard" replace />;
  return children;
}



// Wrapper koji dozvoljava i klijentima i zaposlenima  ← NOVO
function ClientOrEmployeeRoute({ children }) {
  const identityType = useAuthStore(s => s.user?.identity_type);
  if (identityType !== 'client' && identityType !== 'employee') {
    return <Navigate to="/login" replace />;
  }
  return children;
}
function OrdersPageGate({ children }) {
  const identityType = useAuthStore(s => s.user?.identity_type);
  const { isSupervisor, canAny } = usePermissions();

  // klijenti uvek smeju
  if (identityType === 'client') return children;

  // zaposleni: samo trading ili supervisor
  const canTrade = isSupervisor || canAny('trading');
  if (!canTrade) return <Navigate to="/admin" replace />;

  return children;
}

export default function App() {
  const token = useAuthStore(s => s.token);
  const user  = useAuthStore(s => s.user);

  useLayoutEffect(() => {
    useAuthStore.getState().initFromStorage();
  }, []);

  useTokenRefresh();

  const getDefaultRoute = () => {
    if (!token) return '/login';
    if (!user)  return '/login';
    if (user.identity_type === 'client')   return '/dashboard';
    if (user.identity_type === 'employee') return '/admin';
    return '/login';
  };


  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />

        <Route path="/login"          element={<UnifiedLogin />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/activate"       element={<AccountActivation />} />

        {/* KLIJENTSKE RUTE */}
        <Route path="/dashboard"           element={<ProtectedRoute><ClientRoute><ClientDashboard /></ClientRoute></ProtectedRoute>} />
        <Route path="/client/accounts"     element={<ProtectedRoute><ClientRoute><ClientAccounts  /></ClientRoute></ProtectedRoute>} />
        <Route path="/client/payments"     element={<ProtectedRoute><ClientRoute><ClientPaymentOverview /></ClientRoute></ProtectedRoute>} />
        <Route path="/client/transfers"    element={<ProtectedRoute><ClientRoute><ClientTransfers /></ClientRoute></ProtectedRoute>} />
        <Route path="/client/exchange"     element={<ProtectedRoute><ClientRoute><ClientExchange  /></ClientRoute></ProtectedRoute>} />
        <Route path="/client/cards"        element={<ProtectedRoute><ClientRoute><CardsPage portalType="client" /></ClientRoute></ProtectedRoute>} />
        <Route path="/client/loans"        element={<ProtectedRoute><ClientRoute><ClientLoans     /></ClientRoute></ProtectedRoute>} />
        <Route path="/client/payments/new" element={<ProtectedRoute><ClientRoute><NewPayment      /></ClientRoute></ProtectedRoute>} />
        <Route path="/client/recipients"   element={<ProtectedRoute><ClientRoute><ClientRecipients /></ClientRoute></ProtectedRoute>} />
        <Route path="/transfers/new"       element={<ProtectedRoute><ClientRoute><CreateTransfer  /></ClientRoute></ProtectedRoute>} />
        <Route path="/transfers/confirm"   element={<ProtectedRoute><ClientRoute><ConfirmTransfer /></ClientRoute></ProtectedRoute>} />
        <Route path="/client/securities"   element={<ProtectedRoute><ClientRoute><ClientSecurities /></ClientRoute></ProtectedRoute>} />
        <Route path="/transfers/history"   element={<ProtectedRoute><ClientRoute><ClientTransferHistory /></ClientRoute></ProtectedRoute>} />
        <Route path="/client/portfolio" element={<ProtectedRoute><ClientRoute><ClientPortfolioPage /></ClientRoute></ProtectedRoute>} />
        <Route path="/client/dtc" element={<ProtectedRoute><ClientRoute><ClientDtcPage /></ClientRoute></ProtectedRoute>} />
        <Route path="/otc" element={<ProtectedRoute><ClientOrEmployeeRoute><OtcPortalPage /></ClientOrEmployeeRoute></ProtectedRoute>}/>
        <Route path="/client/investment-funds" element={<ProtectedRoute><ClientRoute><ClientFundsPage /></ClientRoute></ProtectedRoute>} />
        <Route path="/client/investment-funds/:id" element={<ProtectedRoute><ClientRoute><FundDetailsPage /></ClientRoute></ProtectedRoute>} />

        {/* ADMIN/EMPLOYEE RUTE */}
        <Route path="/admin"       element={<ProtectedRoute><EmployeeRoute><Dashboard      /></EmployeeRoute></ProtectedRoute>} />
        <Route path="/clients"      element={<ProtectedRoute><EmployeeRoute><ClientList    /></EmployeeRoute></ProtectedRoute>} />
        <Route path="/clients/new"  element={<ProtectedRoute><EmployeeRoute><NewClient     /></EmployeeRoute></ProtectedRoute>} />
        <Route path="/clients/:id"  element={<ProtectedRoute><EmployeeRoute><ClientDetails /></EmployeeRoute></ProtectedRoute>} />
        <Route path="/loans"       element={<ProtectedRoute><EmployeeRoute><Loans          /></EmployeeRoute></ProtectedRoute>} />
        <Route path="/payments"    element={<ProtectedRoute><EmployeeRoute><PaymentOverview /></EmployeeRoute></ProtectedRoute>} />
        <Route path="/cards"       element={<ProtectedRoute><EmployeeRoute><CardsPage portalType="admin" /></EmployeeRoute></ProtectedRoute>} />
        <Route path="/accounts"     element={<ProtectedRoute><EmployeeRoute><Accounts      /></EmployeeRoute></ProtectedRoute>} />
        <Route path="/accounts/new" element={<ProtectedRoute><EmployeeRoute><NewAccount    /></EmployeeRoute></ProtectedRoute>} />
        <Route path="/admin/cards"   element={<ProtectedRoute><EmployeeRoute><CardsPortal   /></EmployeeRoute></ProtectedRoute>} />
        <Route path="/admin/clients" element={<ProtectedRoute><EmployeeRoute><ClientsPortal /></EmployeeRoute></ProtectedRoute>} />
        <Route path="/admin/loans"   element={<ProtectedRoute><EmployeeRoute><LoansPortal   /></EmployeeRoute></ProtectedRoute>} />
        <Route path="/tax" element={<ProtectedRoute><EmployeeRoute><TaxPage /></EmployeeRoute></ProtectedRoute>} />
        <Route path="/admin/actuaries" element={<ProtectedRoute><SupervisorRoute><ActuariesPage /></SupervisorRoute></ProtectedRoute>} />
        <Route path="/admin/audit-log" element={<ProtectedRoute><SupervisorRoute><AuditLogPage /></SupervisorRoute></ProtectedRoute>} />
        <Route path="/admin/exchanges" element={<ProtectedRoute><EmployeeRoute><ExchangesPage /></EmployeeRoute></ProtectedRoute>} />
        <Route path="/securities" element={<ProtectedRoute><EmployeeRoute><ClientSecurities /></EmployeeRoute></ProtectedRoute>} />
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
          <ProtectedRoute><SupervisorRoute><SupervisorOrdersPage /></SupervisorRoute></ProtectedRoute>
        } />
        <Route path="/profit-bank" element={
          <ProtectedRoute><SupervisorRoute><ProfitBankPage /></SupervisorRoute></ProtectedRoute>
        } />
        <Route path="/exchange/rates"      element={<ProtectedRoute><ClientRoute><RatesList /></ClientRoute></ProtectedRoute>} />
        <Route path="/exchange/calculator" element={<ProtectedRoute><ClientRoute><CurrencyCalculator /></ClientRoute></ProtectedRoute>} />
        <Route path="/portfolio" element={<ProtectedRoute><EmployeeRoute><PortfolioPage /></EmployeeRoute></ProtectedRoute>} />
        <Route path="/dtc" element={<ProtectedRoute><EmployeeRoute><DtcPage /></EmployeeRoute></ProtectedRoute>} />
        <Route path="/otc/ponude" element={<ProtectedRoute><EmployeeRoute><OtcPonudePage /></EmployeeRoute></ProtectedRoute>} />
        <Route
            path="/orders/my"
            element={
              <ProtectedRoute>
                <OrdersPageGate>
                  <MyOrdersPage />
                </OrdersPageGate>
              </ProtectedRoute>
            }
        />
        {/* INVESTMENT FUNDS ← NOVO */}
        {/* Dostupno klijentima i svim zaposlenima (agentima, supervizorima) */}
        <Route
          path="/investment-funds"
          element={
            <ProtectedRoute>
              <ClientOrEmployeeRoute>
                <FundDiscoveryPage />
              </ClientOrEmployeeRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/investment-funds/:id"
          element={
            <ProtectedRoute>
              <ClientOrEmployeeRoute>
                <FundDetailsPage />
              </ClientOrEmployeeRoute>
            </ProtectedRoute>
          }
        />
        {/* Kreiranje fonda – samo supervizori */}
        <Route
          path="/investment-funds/new"
          element={
            <ProtectedRoute>
              <SupervisorRoute>
                <CreateFundPage />
              </SupervisorRoute>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />

      </Routes>
    </BrowserRouter>
  );
}
