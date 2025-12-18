import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from './shared/layouts/Header';
import { Footer } from './shared/layouts/Footer';
import { HomePage } from './pages/HomePage';
import { NewsPage } from './pages/NewsPage';
import { ThemeProvider, LanguageProvider } from './shared/contexts';
import './styles/globals.scss';

const queryClient = new QueryClient();

const PublicLayout = ({ children }: { children: React.ReactNode }) => (
  <>
    <Header />
    {children}
    <Footer />
  </>
);

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <ThemeProvider>
          <BrowserRouter>
            <Routes>
              <Route
                path="/"
                element={
                  <PublicLayout>
                    <HomePage />
                  </PublicLayout>
                }
              />
              <Route
                path="/news"
                element={
                  <PublicLayout>
                    <NewsPage />
                  </PublicLayout>
                }
              />
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
};

export default App;
