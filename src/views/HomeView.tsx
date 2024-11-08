import { Experts } from "@/components/Experts";
import { Features } from "@/components/Features";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { PageTitle } from "@/components/PageTItle";
import { Partners } from "@/components/Partners";
import { Steps } from "@/components/Steps";
import { SocialMediaBlock } from "@/components/SocialMediaBlock";
import "react-toastify/dist/ReactToastify.css";
import { Contacts } from "@/components/Contacts";
import { useEffect, useState } from "react";
import bg from "../assets/features/bg.png";

const HomeView = () => {
  const [theme, setTheme] = useState<string>("light-theme");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme) {
      setTheme(savedTheme);
    }

    document.body.className = theme;
  }, [theme]);
  return (
    <Layout>
      <PageHeader theme={theme} setTheme={setTheme} />
      <SocialMediaBlock />
      <PageTitle />
      <section style={{ background: `url(${bg}) repeat-y top / auto 37%` }}>
        <Features theme={theme} />
        <Steps theme={theme} />
      </section>
      <Experts />
      <Partners theme={theme} />
      <Contacts />
    </Layout>
  );
};

export default HomeView;
