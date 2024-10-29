import { socialMediaLinks } from "./constants";
import bg from "../assets/features/bg.png";

export const Contacts = () => {
  return (
    <section
      className="flex justify-between pt-20 pb-10 sm:pb-20"
      style={{ background: `url(${bg}) repeat-y` }}
    >
      <div className="basis-[40%]">
        <p className="text-[32px]">Контакты</p>
        <div className=" mt-8">
          <p className="text-[28px]">Адрес</p>
          <p className="mt-3">Россия., Москва.</p>
          <p>Янковского 1 корпус 1</p>
        </div>
        <p className="mt-5 font-normal">alexolcorp@gmail.com</p>
        <div className="mt-10 w-[400px] flex flex-row flex-wrap items-center justify-center gap-7 self-center">
          {socialMediaLinks.map((item) => {
            const Logo = item.logo;
            return (
              <div
                key={item.title}
                className="flex-1 rounded-[10px] bg-gradient-to-r from-golden2 to-golden3 grow shadow-[8px_8px_8px_rgba(156,137,77,0.25)] transition-shadow duration-300 ease-in-out"
              >
                <div
                  className="rounded-[10px] m-[1px] hover:shadow-[inset_4px_4px_8px_rgba(156,137,77,0.25)]"
                  style={{
                    background: `var(--background)`,
                  }}
                >
                  <a
                    href={item.link}
                    className="p-2 m-[1px] hover:shadow-[0px_4px_10px_0px_#C0A570] text-center text-xl leading-5 rounded-[10px] cursor-pointer flex flex-row gap-4 items-center justify-between"
                  >
                    <div className="bg-gradient-to-r from-golden2 to-golden3 bg-clip-text text-transparent">
                      {item.title}
                    </div>
                    <Logo />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <iframe
        className="basis-[45%]"
        src="https://www.google.com/maps/embed?pb=!1m16!1m12!1m3!1d562.1384628248043!2d37.47379414788874!3d55.696744050780374!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!2m1!1z0Y_QvdC60L7QstGB0LrQvtCz0L4gMSDQvNC-0YHQutCy0LA!5e0!3m2!1sru!2sru!4v1728413170852!5m2!1sru!2sru"
        width="600"
        height="450"
        loading="lazy"
      ></iframe>
    </section>
  );
};
