export const TrustLine = () => {
  const clients = [
    "ТЕХНОКОРП",
    "ФИНТЕХ PRO",
    "МЕДСИСТЕМЫ",
    "ЛОГИСТИК+",
    "ПРОИЗВОДСТВО 24",
    "РИТЕЙЛ GROUP",
    "ЭНЕРГОПРОМ",
    "АВТОМАТИКА",
  ];

  return (
    <section className="trust-line">
      <div className="trust-line__header">
        <p className="trust-line__title">
          Нам доверяют лидеры отраслей
        </p>
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
