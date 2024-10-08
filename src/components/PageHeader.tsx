import Logo from '../common/assets/Logo1.svg'
import { menuItems } from './constants';

export const PageHeader = () => {
    return (
        <div className='h-[90px] flex flex-row gap-7'>
            <Logo className='h-full'/>
            <div className='flex flex-row items-center justify-center gap-7 flex-1'>
                {menuItems.map(item => (
                    <div className='px-7 py-1 hover:bg-golden/25 text-center text-2xl hover:text-golden rounded-[10px] cursor-pointer'>{item}</div> 
                ))}
            </div>
        </div>
    )
};
