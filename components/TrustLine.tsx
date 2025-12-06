export function TrustLine() {
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
    <section className="py-16 border-y border-[#0AE3FF]/10 bg-[#0C0F16]/50 overflow-hidden">
      <div className="mb-8 text-center">
        <p className="text-[#A8B0C0] uppercase tracking-wider">
          Нам доверяют лидеры отраслей
        </p>
      </div>
      
      <div className="relative">
        <div className="flex animate-[scroll-left_30s_linear_infinite]">
          {/* Дублируем массив для бесшовной прокрутки */}
          {[...clients, ...clients, ...clients].map((client, index) => (
            <div
              key={index}
              className="flex-shrink-0 px-12 flex items-center justify-center"
            >
              <span className="text-2xl tracking-wider opacity-40 hover:opacity-100 hover:text-[#0AE3FF] transition-all duration-300 whitespace-nowrap">
                {client}
              </span>
            </div>
          ))}
        </div>
        
        {/* Градиенты по краям для плавного исчезновения */}
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#0C0F16] to-transparent pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#0C0F16] to-transparent pointer-events-none" />
      </div>
    </section>
  );
}
