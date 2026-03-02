import { useTranslation } from '@/shared/utils/translations';

export const TrustLine = () => {
  const { t } = useTranslation();
  const clients = [
    'BonusBlock',
    'Portal to Bitcoin',
    'Elys Network',
    'Xion',
    'KiteAi',
    'Agoric',
    'OneWish',
    'TheoriqAI',
    'Dubs',
    'Beggars',
    'Metropolis',
  ];

  return (
    <section className="trust-line">
      <div className="trust-line__header">
        <p className="trust-line__title">{t('trustLine.title')}</p>
      </div>

      <div className="trust-line__wrapper">
        <div className="trust-line__scroll">
          {[...clients, ...clients, ...clients].map((client, index) => (
            <div key={index} className="trust-line__item">
              <span className="trust-line__client">{client}</span>
            </div>
          ))}
        </div>

        <div className="trust-line__gradient trust-line__gradient--left" />
        <div className="trust-line__gradient trust-line__gradient--right" />
      </div>
    </section>
  );
};
