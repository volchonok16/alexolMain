import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ArrowDown, ArrowRight, Check, AlertCircle, Clock3, Presentation, UsersRound } from 'lucide-react';
import { contactApi } from '@/api';
import { useLanguage } from '@/shared/contexts';
import { marketingCopy } from '@/shared/utils/marketingCopy';
import { ScrollExperience } from '@/shared/ui/ScrollExperience';
import './SpeechesPage.scss';

export const SpeechesPage = () => {
  const { language } = useLanguage();
  const copy = marketingCopy[language].speeches;
  const topics = copy.topics;
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', message: '' });
  const mutation = useMutation({
    mutationFn: contactApi.sendContact,
    onSuccess: () => setForm({ name: '', company: '', email: '', phone: '', message: '' }),
  });

  const update = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate({
      ...form,
      budget: language === 'ru' ? 'Корпоративное выступление или обучение' : 'Corporate talk or workshop',
      description:
        `${language === 'ru' ? 'Заявка на корпоративное выступление/практикум.' : 'Corporate talk/workshop enquiry.'} ${form.message}`.trim(),
    });
  };

  return (
    <ScrollExperience className="speeches-page">
      <main id="main-content" lang={language}>
        <section
          className="speeches-hero"
          data-reveal="left"
          data-rail-label={language === 'ru' ? 'Выступление' : 'Talk'}
        >
          <div className="speeches-hero__content">
            <div className="eyebrow">
              <span /> {copy.kicker}
            </div>
            <h1>
              {copy.titleStart} <em>{copy.titleEmphasis}</em>
            </h1>
            <p>{copy.lead}</p>
            <div className="speeches-hero__actions">
              <a className="button button--solid" href="#request">
                {copy.request} <ArrowRight size={17} />
              </a>
              <a className="speeches-hero__link" href="#program">
                {copy.programLink} <ArrowDown size={15} />
              </a>
            </div>
            <div className="speeches-hero__meta">
              <span>
                <UsersRound size={16} /> {copy.audienceMeta}
              </span>
              <span>
                <Presentation size={16} /> {copy.formatMeta}
              </span>
            </div>
          </div>
          <div className="speeches-hero__visual">
            <div className="talk-card">
              <span className="talk-card__caption">{copy.visualCaption}</span>
              <div className="talk-card__question">{copy.visualQuestion}</div>
              <div className="talk-card__rule" />
              <div className="talk-card__answer">
                <span>01</span>
                <b>{copy.visualAnswers[0]}</b>
              </div>
              <div className="talk-card__answer">
                <span>02</span>
                <b>{copy.visualAnswers[1]}</b>
              </div>
              <div className="talk-card__answer">
                <span>03</span>
                <b>{copy.visualAnswers[2]}</b>
              </div>
              <div className="talk-card__footer">{copy.visualFoot}</div>
            </div>
            <div className="talk-card__index">A / 01</div>
          </div>
        </section>

        <section
          className="speeches-section speeches-audience"
          data-reveal="right"
          data-rail-label={language === 'ru' ? 'Аудитория' : 'Audience'}
        >
          <div className="speeches-section__heading">
            <div className="eyebrow">{copy.audienceKicker}</div>
            <h2>{copy.audienceTitle}</h2>
            <p>{copy.audienceLead}</p>
          </div>
          <div className="audience-points">
            {copy.audiences.map(([title, description], index) => (
              <article key={title}>
                <span>0{index + 1}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="speeches-section program-section"
          id="program"
          data-reveal="left"
          data-rail-label={language === 'ru' ? 'Программа' : 'Agenda'}
        >
          <div className="speeches-section__heading">
            <div className="eyebrow">{copy.programKicker}</div>
            <h2>{copy.programTitle}</h2>
            <p>{copy.programLead}</p>
          </div>
          <div className="program-list">
            {topics.map((topic, index) => (
              <div className="program-list__item" key={topic}>
                <span>0{index + 1}</span>
                <p>{topic}</p>
                <Check size={17} />
              </div>
            ))}
          </div>
        </section>

        <section className="demo-section" data-reveal="right" data-rail-label={language === 'ru' ? 'Демо' : 'Demos'}>
          <div className="speeches-section__heading">
            <div className="eyebrow">{copy.demosKicker}</div>
            <h2>{copy.demosTitle}</h2>
            <p>{copy.demosLead}</p>
          </div>
          <div className="demo-grid">
            {copy.demonstrations.map(([before, after], index) => (
              <article className="demo-card" key={before}>
                <span className="demo-card__number">0{index + 1}</span>
                <div>
                  <small>{copy.task}</small>
                  <p>{before}</p>
                </div>
                <ArrowRight size={18} />
                <div>
                  <small>{copy.scenario}</small>
                  <p>{after}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          className="speeches-section formats-section"
          data-reveal="left"
          data-rail-label={language === 'ru' ? 'Форматы' : 'Formats'}
        >
          <div className="speeches-section__heading">
            <div className="eyebrow">{copy.formatsKicker}</div>
            <h2>{copy.formatsTitle}</h2>
          </div>
          <div className="format-grid">
            <article>
              <span className="format-grid__icon">
                <Presentation size={21} />
              </span>
              <small>{copy.introLabel}</small>
              <h3>{copy.talkTitle}</h3>
              <p>{copy.talkDescription}</p>
              <div>
                <Clock3 size={15} /> {copy.talkDuration}
              </div>
            </article>
            <article>
              <span className="format-grid__icon">
                <UsersRound size={21} />
              </span>
              <small>{copy.practiceLabel}</small>
              <h3>{copy.practiceTitle}</h3>
              <p>{copy.practiceDescription}</p>
              <div>
                <Clock3 size={15} /> {copy.practiceDuration}
              </div>
            </article>
          </div>
          <p className="formats-section__note">{copy.formatNote}</p>
        </section>

        <section
          className="speaker-section"
          data-reveal="right"
          data-rail-label={language === 'ru' ? 'Спикер' : 'Speaker'}
        >
          <div className="speaker-section__mark">A</div>
          <div>
            <div className="eyebrow">{copy.speakerKicker}</div>
            <h2>{copy.speakerTitle}</h2>
            <p>{copy.speakerBio}</p>
            <p className="speaker-section__note">{copy.speakerNote}</p>
          </div>
        </section>

        <section
          className="speeches-outcome"
          data-reveal="left"
          data-rail-label={language === 'ru' ? 'Результат' : 'Outcome'}
        >
          <div>
            <div className="eyebrow">{copy.outcomeKicker}</div>
            <h2>{copy.outcomeTitle}</h2>
          </div>
          <ul>
            {copy.outcomes.map(item => (
              <li key={item}>
                <Check size={17} /> {item}
              </li>
            ))}
          </ul>
        </section>

        <section
          className="speeches-request"
          id="request"
          data-reveal="right"
          data-rail-label={language === 'ru' ? 'Заявка' : 'Enquiry'}
        >
          <div className="speeches-request__copy">
            <div className="eyebrow">{copy.requestKicker}</div>
            <h2>{copy.requestTitle}</h2>
            <p>{copy.requestLead}</p>
            <div className="speeches-request__place">{copy.region}</div>
          </div>
          <form className="speeches-form" onSubmit={submit}>
            <label>
              {copy.name}
              <input name="name" autoComplete="name" value={form.name} onChange={update} required />
            </label>
            <div className="speeches-form__row">
              <label>
                {copy.company}
                <input name="company" autoComplete="organization" value={form.company} onChange={update} />
              </label>
              <label>
                {copy.phone}
                <input name="phone" autoComplete="tel" type="tel" value={form.phone} onChange={update} />
              </label>
            </div>
            <label>
              {copy.email}
              <input name="email" autoComplete="email" type="email" value={form.email} onChange={update} required />
            </label>
            <label>
              {copy.formPrompt}
              <textarea
                name="message"
                value={form.message}
                onChange={update}
                rows={3}
                placeholder={copy.formPlaceholder}
              />
            </label>
            <label className="speeches-form__consent">
              <input type="checkbox" required />
              <span>{copy.consent}</span>
            </label>
            <button className="button button--solid" type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? copy.sending : copy.submit} <ArrowRight size={17} />
            </button>
            {mutation.isSuccess && (
              <p className="speeches-form__feedback speeches-form__feedback--success" role="status">
                <Check size={16} /> {copy.success}
              </p>
            )}
            {mutation.isError && (
              <p className="speeches-form__feedback speeches-form__feedback--error" role="alert">
                <AlertCircle size={16} /> {copy.error}
              </p>
            )}
          </form>
        </section>
      </main>
    </ScrollExperience>
  );
};
