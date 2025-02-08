import { FormEvent, useState } from "react";
import { socialMediaLinks } from "./constants";

interface FormData {
    email: string | undefined;
    phone: string | undefined;
    name: string | undefined;
    message: string | undefined;
}

export const Contacts = () => {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const resetFormData = () => {
        setName("");
        setPhone("");
        setEmail("");
        setMessage("");
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        const formData: FormData = {
            email,
            phone,
            name,
            message,
        };

        try {
            const res = await fetch("http://pallink.fun:12370/feedback/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
                mode: "no-cors",
            });

            if (res.ok) {
                setError("Спасибо, с вами свяжутся ASAP");
                resetFormData();
            } else {
                setError("Что то пошло не так :(");
            }
        } catch (err) {
            setError(`Ошибка при отправке - ${err}`);
        }
    };
    return (
        <section className="flex flex-col md:flex-row lg:flex-row gap-[15px] md:gap-0 lg:gap-0 md:justify-between lg:justify-between pt-10 lg:pt-20">
            {error && <p>{error}</p>}
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
                        onChange={(e) => setName(e.target.value)}
                        required
                    ></input>
                    <input
                        className="rounded-[10px] border-[1px] border-golden h-[44px] py-[10px] px-[20px]"
                        placeholder="+7(999)-999-99-99"
                        type="tel"
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                    ></input>
                    <input
                        className="rounded-[10px] border-[1px] border-golden h-[44px] py-[10px] px-[20px]"
                        placeholder="Почта"
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    ></input>
                    <input
                        className="rounded-[10px] border-[1px] border-golden h-[74px] py-[10px] px-[20px]"
                        placeholder="Введите свой вопрос"
                        type="textarea"
                        id="message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    ></input>
                    <div className="">
                        <button
                            type="submit"
                            className="text-white w-[415px] bg-gradient-to-r from-golden2 to-golden3 hover:to-[#e2c783] hover:from-[#cc994d] rounded-[20px] h-[44px]"
                        >
                            Связаться
                        </button>
                        <p className="text-[16px] opacity-60 pt-[5px]">
                            Нажимая на кнопку, вы соглашаетесь с политикой
                            конфиденциальности сайта
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
        </section>
    );
};
