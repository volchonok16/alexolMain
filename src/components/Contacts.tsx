import { FormEvent, useState } from "react";
import { socialMediaLinks } from "./constants";

interface FormData {
  name: string | undefined;
  phone: string | undefined;
  email: string | undefined;
  que: string | undefined;
}

export const Contacts = () => {
    const [message, setMessage] = useState("");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [que, setQue] = useState("");

    const resetFormData = () => {
        setName("");
        setPhone("");
        setEmail("");
        setQue("");
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        const formData: FormData = {
            name,
            phone,
            email,
            que,
        };

        try {
            const res = await fetch("", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                setMessage("Спасибо, с вами свяжутся ASAP");
                resetFormData();
            } else {
                setMessage("Что то пошло не так :(");
            }
        } catch (err) {
            setMessage(`Ошибка при отправке - ${err}`);
        }
    };
    return (
        <section className="flex flex-col md:flex-row lg:flex-row gap-[15px] md:gap-0 lg:gap-0 md:justify-between lg:justify-between pt-10 lg:pt-20">
            {message &&<p>{message}</p>}
            <div>
                <form
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-6 max-w-[415px]"
                >
                    <input
                        className="rounded-[10px] border-[1px] border-golden h-[44px] py-[10px] px-[20px]"
                        placeholder="Имя"
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e)=>setName(e.target.value)}
                        required
                    ></input>
                    <input
                        className="rounded-[10px] border-[1px] border-golden h-[44px] py-[10px] px-[20px]"
                        placeholder="Телефон"
                        type="phone"
                        id="phone"
                        value={phone}
                        onChange={(e)=>setPhone(e.target.value)}
                        required
                    ></input>
                    <input
                        className="rounded-[10px] border-[1px] border-golden h-[44px] py-[10px] px-[20px]"
                        placeholder="Почта"
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e)=>setEmail(e.target.value)}
                        required
                    ></input>
                    <input
                        className="rounded-[10px] border-[1px] border-golden h-[74px] py-[10px] px-[20px]"
                        placeholder="Введите свой вопрос"
                        type="textarea"
                        id="que"
                        value={que}
                        onChange={(e)=>setQue(e.target.value)}
                    ></input>
                    <div className="">
                        <button type="submit" className="w-[415px] bg-gradient-to-r from-golden2 to-golden3 rounded-[20px] h-[44px]">
              Связаться
                        </button>
                        <p className="text-[16px] opacity-60 pt-[5px]">
              Нажимая на кнопку, вы соглашаетесь с политикой конфиденциальности
              сайта
                        </p>
                    </div>
                </form>
            </div>
            <div className="shadow-2xl px-[140px] py-[65px]">
                <div className=" mt-4">
                    <p className="text-[20px] lg:text-[28px] font-semibold">
            Остались вопросы?
                    </p>
                    <p className="text-[16px] lg:text-[20px] mt-3">
            Заполните форму и мы с вами свяжемся!
                    </p>
                </div>
                <div className="mt-10 md:w-[300px] lg:w-[400px] flex flex-row flex-wrap items-center justify-center gap-6 self-center">
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
                                        className="p-2 m-[1px] hover:shadow-[0px_4px_10px_0px_#C0A570] text-center text-lg lg:text-xl leading-[17px] lg:leading-5 rounded-[10px] cursor-pointer flex flex-row gap-4 items-center justify-between"
                                    >
                                        <div className="">{item.title}</div>
                                        <Logo />
                                    </a>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};
