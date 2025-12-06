import { Header } from "./shared/layouts/Header";
import { Footer } from "./shared/layouts/Footer";
import { HomePage } from "./pages/HomePage";
import "./styles/globals.scss";

const App = () => {
  return (
    <div>
      <Header />
      <HomePage />
      <Footer />
    </div>
  );
};

export default App;
