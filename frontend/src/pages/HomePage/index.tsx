import { Hero } from './components/Hero';
import { TrustLine } from './components/TrustLine';
import { About } from './components/About';
import { Services } from './components/Services';
import { Portfolio } from './components/Portfolio';
import { WhyDigital } from './components/WhyDigital';
import { Pricing } from './components/Pricing';
import { WorkSteps } from './components/WorkSteps';
import { News } from './components/News';
import { Contact } from './components/Contact';
import './HomePage.scss';

export const HomePage = () => {
  return (
    <main>
      <Hero />
      <TrustLine />

      <div id="about">
        <About />
      </div>

      <div id="services">
        <Services />
      </div>

      <div id="portfolio">
        <Portfolio />
      </div>

      <WhyDigital />
      <Pricing />
      <WorkSteps />

      <div id="news">
        <News />
      </div>

      <div id="contact">
        <Contact />
      </div>
    </main>
  );
};
