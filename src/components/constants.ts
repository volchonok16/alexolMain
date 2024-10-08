import VK from '../common/assets/VK.svg'
import Youtube from '../common/assets/Youtube.svg'
import Insta from '../common/assets/Instagram.svg'
import Rutube from '../common/assets/Rutube.svg'
import Telegram from '../common/assets/Telegram.svg'

const menuItems = ['Наши продукты', 'Контент', 'Сотрудничество']

const slogan1 = 'Команда друзей'
const slogan2 = 'меняющая мир'

const socialMediaText = 'Делаем мир лучше - вместе'

const socialMediaLinks = [
    {
        title: 'Вконтакте',
        link: 'https://vk.com/club227224055',
        logo: VK,
    },
    {
        title: 'Youtube',
        link: 'https://youtube.com/@alexolcorp1',
        logo: Youtube,
    },
    {
        title: 'Instagram',
        link: 'https://www.instagram.com/alexolcorp',
        logo: Insta,
    },
    {
        title: 'Rutube',
        link: 'https://rutube.ru/channel/10596522',
        logo: Rutube,
    },
    {
        title: 'Telegram',
        link: 'https://t.me/alexolcorp',
        logo: Telegram,
    }
]

export {
    menuItems,
    slogan1,
    slogan2,
    socialMediaText,
    socialMediaLinks,
}