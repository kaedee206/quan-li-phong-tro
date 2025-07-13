import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Contexts
import { ThemeContextProvider } from './contexts/ThemeContext';

// Components
import Layout from './components/layout/Layout';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorBoundary from './components/common/ErrorBoundary';

// Pages (lazy loaded)
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Rooms = React.lazy(() => import('./pages/Rooms'));
const Tenants = React.lazy(() => import('./pages/Tenants'));
const Contracts = React.lazy(() => import('./pages/Contracts'));
const Payments = React.lazy(() => import('./pages/Payments'));
const Notes = React.lazy(() => import('./pages/Notes'));
const Settings = React.lazy(() => import('./pages/Settings'));

// Form pages
const RoomForm = React.lazy(() => import('./pages/forms/RoomForm'));
const TenantForm = React.lazy(() => import('./pages/forms/TenantForm'));
const ContractForm = React.lazy(() => import('./pages/forms/ContractForm'));
const PaymentForm = React.lazy(() => import('./pages/forms/PaymentForm'));
const NoteForm = React.lazy(() => import('./pages/forms/NoteForm'));

// Detail pages
const RoomDetail = React.lazy(() => import('./pages/details/RoomDetail'));
const TenantDetail = React.lazy(() => import('./pages/details/TenantDetail'));
const ContractDetail = React.lazy(() => import('./pages/details/ContractDetail'));
const PaymentDetail = React.lazy(() => import('./pages/details/PaymentDetail'));
const NoteDetail = React.lazy(() => import('./pages/details/NoteDetail'));

// 404 page
const NotFound = React.lazy(() => import('./pages/NotFound'));

// Create QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Main App component
function App() {
  return (
    <ErrorBoundary>
      <ThemeContextProvider>
        <QueryClientProvider client={queryClient}>
          <Router>
            <div className="App">
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>
                  <Routes>
                    {/* Dashboard */}
                    <Route path="/" element={<Dashboard />} />
                    
                    {/* Rooms */}
                    <Route path="/rooms" element={<Rooms />} />
                    <Route path="/rooms/add" element={<RoomForm />} />
                    <Route path="/rooms/:id" element={<RoomDetail />} />
                    <Route path="/rooms/:id/edit" element={<RoomForm />} />
                    
                    {/* Tenants */}
                    <Route path="/tenants" element={<Tenants />} />
                    <Route path="/tenants/add" element={<TenantForm />} />
                    <Route path="/tenants/:id" element={<TenantDetail />} />
                    <Route path="/tenants/:id/edit" element={<TenantForm />} />
                    
                    {/* Contracts */}
                    <Route path="/contracts" element={<Contracts />} />
                    <Route path="/contracts/add" element={<ContractForm />} />
                    <Route path="/contracts/:id" element={<ContractDetail />} />
                    <Route path="/contracts/:id/edit" element={<ContractForm />} />
                    
                    {/* Payments */}
                    <Route path="/payments" element={<Payments />} />
                    <Route path="/payments/add" element={<PaymentForm />} />
                    <Route path="/payments/:id" element={<PaymentDetail />} />
                    <Route path="/payments/:id/edit" element={<PaymentForm />} />
                    
                    {/* Notes */}
                    <Route path="/notes" element={<Notes />} />
                    <Route path="/notes/add" element={<NoteForm />} />
                    <Route path="/notes/:id" element={<NoteDetail />} />
                    <Route path="/notes/:id/edit" element={<NoteForm />} />
                    
                    {/* Settings */}
                    <Route path="/settings" element={<Settings />} />
                    
                    {/* 404 */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </Layout>
              
              {/* Toast notifications */}
              <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
              />
            </div>
          </Router>
          
          {/* React Query DevTools */}
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </ThemeContextProvider>
    </ErrorBoundary>
  );
}

export default App;