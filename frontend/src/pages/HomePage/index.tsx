import { ArrowDown, ArrowRight, Check, ChevronDown, Workflow } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/shared/contexts';
import { marketingCopy } from '@/shared/utils/marketingCopy';
import { ScrollExperience } from '@/shared/ui/ScrollExperience';
import { Portfolio } from './components/Portfolio';
import { News } from './components/News';
import { Contact } from './components/Contact';
import './HomePage.scss';

export const HomePage = () => {
  const { language } = useLanguage();
  const copy = marketingCopy[language].home;
  const topics = marketingCopy[language].contact.topics;
  const directions = copy.directions.map((direction, index) => ({
    ...direction,
    number: `0${index + 1}`,
    href: index === 0 ? '/speeches' : '#contact',
  }));

  return (
    <ScrollExperience className="repositioned-home">
      <main id="main-content" lang={language}>
        <section
          className="business-hero"
          data-reveal="left"
          data-rail-label={language === 'ru' ? 'Начало' : 'Overview'}
        >
          <div className="business-hero__grid" aria-hidden="true" />
          <div className="business-hero__content">
            <div className="eyebrow">
              <span /> {copy.heroKicker}
            </div>
            <h1>
              {copy.heroTitleStart} <em>{copy.heroTitleEmphasis}</em> {copy.heroTitleEnd}
            </h1>
            <p className="business-hero__lead">{copy.heroLead}</p>
            <p className="business-hero__proof">{copy.heroProof}</p>
            <p className="business-hero__industries">{copy.industries}</p>
            <div className="business-hero__actions">
              <a className="button button--solid" href="#contact">
                {copy.discuss} <ArrowRight size={17} />
              </a>
              <Link className="button button--outline" to="/speeches">
                {copy.speeches}
              </Link>
            </div>
            <a className="business-hero__scroll" href="#challenges">
              <span>{copy.scroll}</span>
              <ArrowDown size={15} />
            </a>
          </div>
          <div className="business-hero__visual" aria-label={copy.processLabel}>
            <div className="process-board">
              <div className="process-board__top">
                <span>{copy.processLabel}</span>
                <span className="process-board__status">{copy.processStatus}</span>
              </div>
              <div className="process-node">
                <span className="process-node__icon">01</span>
                <div>
                  <b>{copy.incoming}</b>
                  <small>{copy.incomingTypes}</small>
                </div>
              </div>
              <div className="process-connector">
                <i />
                <i />
                <i />
              </div>
              <div className="process-node process-node--core">
                <span className="process-node__icon">
                  <Workflow size={19} />
                </span>
                <div>
                  <b>{copy.process}</b>
                  <small>{copy.processTypes}</small>
                </div>
              </div>
              <div className="process-connector">
                <i />
                <i />
                <i />
              </div>
              <div className="process-node">
                <span className="process-node__icon">
                  <Check size={18} />
                </span>
                <div>
                  <b>{copy.outcome}</b>
                  <small>{copy.outcomeTypes}</small>
                </div>
              </div>
              <div className="process-board__foot">{copy.processFoot}</div>
            </div>
            <div className="business-hero__stamp">
              <span>{copy.fromTask}</span>
              <b>{copy.solution}</b>
            </div>
          </div>
          <div className="business-hero__location">{copy.region}</div>
        </section>

        <section
          className="business-section challenges"
          id="challenges"
          data-reveal="right"
          data-rail-label={language === 'ru' ? 'Задачи' : 'Challenges'}
        >
          <div className="section-heading">
            <div>
              <div className="eyebrow">{copy.challengeKicker}</div>
              <h2>
                {copy.challengeTitleA}
                <br />
                {copy.challengeTitleB}
              </h2>
            </div>
            <p>{copy.challengeLead}</p>
          </div>
          <div className="challenge-grid">
            {copy.problems.map((item, index) => (
              <article className="challenge-card" key={item}>
                <span className="challenge-card__number">0{index + 1}</span>
                <p>{item}</p>
                <span className="challenge-card__mark" aria-hidden="true">
                  ↗
                </span>
              </article>
            ))}
          </div>
        </section>

        <section
          className="business-section directions"
          id="services"
          data-reveal="left"
          data-rail-label={language === 'ru' ? 'Направления' : 'Services'}
        >
          <div className="section-heading">
            <div>
              <div className="eyebrow">{copy.directionsKicker}</div>
              <h2>
                {copy.directionsTitleA}
                <br />
                {copy.directionsTitleB}
              </h2>
            </div>
            <p>{copy.directionsLead}</p>
          </div>
          <div className="direction-grid">
            {directions.map(item => (
              <article className="direction-card" key={item.number}>
                <div className="direction-card__top">
                  <span>{item.number}</span>
                  <ArrowRight size={18} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <div className="direction-card__result">
                  <Check size={15} />
                  <span>{item.result}</span>
                </div>
                <a
                  href={item.href}
                  onClick={() => {
                    if (item.href === '#contact')
                      window.setTimeout(
                        () =>
                          window.dispatchEvent(
                            new CustomEvent('alexol:contact-topic', { detail: topics[Number(item.number) - 1] })
                          ),
                        0
                      );
                  }}
                >
                  {item.action}
                  <ArrowRight size={15} />
                </a>
              </article>
            ))}
          </div>
        </section>

        <section
          className="journey-section"
          id="journey"
          aria-labelledby="journey-title"
          data-reveal="right"
          data-rail-label={language === 'ru' ? 'Путь' : 'Journey'}
        >
          <div className="journey-section__inner">
            <div className="eyebrow">{copy.journeyKicker}</div>
            <h2 id="journey-title">{copy.journeyTitle}</h2>
            <p className="journey-section__intro">{copy.journeyLead}</p>
            <div className="journey-track">
              {copy.journey.map((step, index) => (
                <div className="journey-step" key={step}>
                  <span className="journey-step__number">0{index + 1}</span>
                  <b>{step}</b>
                  {index < copy.journey.length - 1 && <span className="journey-step__connector" />}
                </div>
              ))}
            </div>
            <span className="journey-section__note">{copy.journeyNote}</span>
          </div>
        </section>

        <section
          className="business-section use-cases"
          data-reveal="left"
          data-rail-label={language === 'ru' ? 'Сценарии' : 'Scenarios'}
        >
          <div className="section-heading">
            <div>
              <div className="eyebrow">{copy.examplesKicker}</div>
              <h2>
                {copy.examplesTitleA}
                <br />
                {copy.examplesTitleB}
              </h2>
            </div>
            <p>{copy.examplesLead}</p>
          </div>
          <div className="use-case-layout">
            <div className="use-case-list">
              {copy.examples.map((item, index) => (
                <div className="use-case-item" key={item}>
                  <span>0{index + 1}</span>
                  <p>{item}</p>
                  <ArrowRight size={16} />
                </div>
              ))}
            </div>
            <aside className="use-case-note">
              <div className="use-case-note__icon">
                <Workflow size={22} />
              </div>
              <span>{copy.firstTask}</span>
              <h3>{copy.noAiNeeded}</h3>
              <p>{copy.noAiText}</p>
            </aside>
          </div>
        </section>

        <section
          className="why-section"
          id="about"
          data-reveal="right"
          data-rail-label={language === 'ru' ? 'О подходе' : 'Approach'}
        >
          <div className="why-section__inner">
            <div className="why-section__intro">
              <div className="eyebrow">{copy.whyKicker}</div>
              <h2>{copy.whyTitle}</h2>
              <p>{copy.whyLead}</p>
            </div>
            <div className="why-points">
              {copy.why.map(([title, description], index) => (
                <article key={title}>
                  <span>0{index + 1}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <div id="portfolio" data-reveal="left" data-rail-label={language === 'ru' ? 'Проекты' : 'Projects'}>
          <Portfolio />
        </div>

        <section
          className="development-section"
          id="development"
          data-reveal="right"
          data-rail-label={language === 'ru' ? 'Разработка' : 'Development'}
        >
          <div className="development-section__copy">
            <div className="eyebrow">{copy.developmentKicker}</div>
            <h2>{copy.developmentTitle}</h2>
            <p>{copy.developmentText}</p>
            <a className="button button--solid" href="#contact">
              {copy.developmentAction}
              <ArrowRight size={17} />
            </a>
          </div>
          <div className="development-tags">
            {copy.developmentTags.map(tag => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </section>

        <section
          className="business-section faq-section"
          data-reveal="left"
          data-rail-label={language === 'ru' ? 'FAQ' : 'FAQ'}
        >
          <div className="section-heading">
            <div>
              <div className="eyebrow">{copy.faqKicker}</div>
              <h2>{copy.faqTitle}</h2>
            </div>
          </div>
          <div className="faq-list">
            {copy.questions.map(([question, answer]) => (
              <details className="faq-item" key={question}>
                <summary>
                  {question}
                  <ChevronDown size={18} />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section
          className="business-cta"
          data-reveal="right"
          data-rail-label={language === 'ru' ? 'Связаться' : 'Contact'}
        >
          <div className="business-cta__copy">
            <div className="eyebrow">{copy.ctaKicker}</div>
            <h2>{copy.ctaTitle}</h2>
            <p>{copy.ctaText}</p>
          </div>
          <a className="button button--light" href="#contact">
            {copy.ctaAction}
            <ArrowRight size={17} />
          </a>
        </section>
        <div id="news" data-reveal="left" data-rail-label={language === 'ru' ? 'Новости' : 'News'}>
          <News />
        </div>
        <div id="contact" data-reveal="right" data-rail-label={language === 'ru' ? 'Форма' : 'Enquiry'}>
          <Contact />
        </div>
      </main>
    </ScrollExperience>
  );
};
