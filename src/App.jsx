import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import WebsiteContentCreator from '@/pages/WebsiteContentCreator';
import ProjectPageCreator from '@/pages/ProjectPageCreator';
import TermsOfService from '@/pages/TermsOfService';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import ClientInsights from '@/pages/ClientInsights';
import Reporting from '@/pages/Reporting';
import ClientReportPublic from '@/pages/ClientReportPublic';
import WillsCorner from '@/pages/WillsCorner';
import ClientMemory from '@/pages/ClientMemory';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  // If not authenticated and no error (e.g. signed out), redirect to login
  if (!isAuthenticated) {
    navigateToLogin();
    return null;
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/WebsiteContentCreator" element={<LayoutWrapper currentPageName="WebsiteContentCreator"><WebsiteContentCreator /></LayoutWrapper>} />
      <Route path="/ProjectPageCreator" element={<LayoutWrapper currentPageName="ProjectPageCreator"><ProjectPageCreator /></LayoutWrapper>} />
      <Route path="/ClientInsights" element={<LayoutWrapper currentPageName="ClientInsights"><ClientInsights /></LayoutWrapper>} />
      <Route path="/Reporting" element={<LayoutWrapper currentPageName="Reporting"><Reporting /></LayoutWrapper>} />
      <Route path="/report/:clientId" element={<ClientReportPublic />} />
      <Route path="/WillsCorner" element={<LayoutWrapper currentPageName="WillsCorner"><WillsCorner /></LayoutWrapper>} />
      <Route path="/ClientMemory" element={<LayoutWrapper currentPageName="ClientMemory"><ClientMemory /></LayoutWrapper>} />
      <Route path="/terms-of-service" element={<TermsOfService />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App