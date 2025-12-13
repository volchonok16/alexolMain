import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header } from './shared/layouts/Header';
import { Footer } from './shared/layouts/Footer';
import { HomePage } from './pages/HomePage';
import { ThemeProvider } from './shared/contexts';
import './styles/globals.scss';

const PublicLayout = ({ children }: { children: React.ReactNode }) => (
  <>
    <Header />
    {children}
    <Footer />
  </>
);

const App = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
