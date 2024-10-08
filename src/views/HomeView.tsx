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

const HomeView = () => {
    return (
        <Layout>
            <PageHeader />
            <SocialMediaBlock />
            <PageTitle />
            <Features />
            <Steps />
            <Experts />
            <Partners />
            <Contacts />
        </Layout>
    );
};

export default HomeView;
