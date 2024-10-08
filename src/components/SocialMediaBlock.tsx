import { slogan1, slogan2, socialMediaLinks, socialMediaText } from './constants';
import Block1 from '../common/assets/Block1.svg'
import Block2 from '../common/assets/Block2.svg'
import Block3 from '../common/assets/Block3.svg'
import Block4 from '../common/assets/Block4.svg'
import Block5 from '../common/assets/Block5.svg'
import Block6 from '../common/assets/Block6.svg'
import Block7 from '../common/assets/Block7.svg'
import Block8 from '../common/assets/Block8.svg'
import Background from '../common/assets/Background.svg'

export const SocialMediaBlock = () => {

    return (
        <div className='flex flex-row justify-between items-center relative'>
            <Background className='absolute top-0 right-0 width'/>
            <div className='flex flex-col'>
                <div className='text-5xl leading-[46px] mb-4 text-nowrap'>{slogan1}</div>
                <div className='text-5xl leading-[46px] ps-[107px] mb-9 text-nowrap'>{slogan2}</div>
                <div className='w-[139px] h-[4px] bg-gradient-to-r from-golden2 to-golden3 self-center mb-10' />
                <div className='text-xl self-center mb-12'>{socialMediaText}</div>
                <div className='w-[400px] flex flex-row flex-wrap items-center justify-center gap-7 self-center'>
                    {socialMediaLinks.map(item => {
                        const Logo = item.logo
                        return (
                            <div className='flex-1 rounded-[10px] bg-gradient-to-r from-golden2 to-golden3 grow shadow-[8px_8px_8px_0px_#00000040]'>
                                <div className='rounded-[10px] m-[1px] bg-white'>
                                    <a href={item.link} className='p-2 m-[1px] hover:shadow-[0px_4px_10px_0px_#C0A570] text-center text-xl leading-5 rounded-[10px] cursor-pointer flex flex-row gap-4 justify-between'>
                                        <div className='bg-gradient-to-r from-golden2 to-golden3 bg-clip-text text-transparent'>{item.title}</div>
                                        <Logo />
                                    </a>  
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
            <div className='w-[786px] h-[548px] relative'>
                <Block1 className='absolute top-[155px] left-[32px] rotate-[-54]' />
                <Block2 className='absolute top-[400px] left-[50px] rotate-[-75]' />
                <Block3 className='absolute top-[35px] left-[230px] rotate-[45]' />
                <Block4 className='absolute top-[300px] left-[250px] rotate-[-54]' />
                <Block5 className='absolute top-[100px] left-[450px] rotate-[-60]' />
                <Block6 className='absolute top-[350px] left-[460px] rotate-[45]' />
                <Block7 className='absolute top-[20px] left-[650px] rotate-[-67]' />
                <Block8 className='absolute top-[170px] left-[620px] rotate-[-75]' />
            </div>
        </div>
    )
};
