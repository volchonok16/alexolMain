/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'header-bg-color': '#232526',
                'golden': '#C0A570',
                'golden2': '#97794D',
                'golden3': '#E3CB8F',
                'dark-gray': '#3D3D3D',
                'gray1': '#1D2228',
                'gray2':'#313944',
                'black1':'#0A0A0A'
            },
            backgroundImage: {
                'home-image': "url('/src/assets/home/faculty_home.png')",
                'landing-image': "url('/src/assets/landing/new_landing_bg.png')",
                'banner-background': "url('/src/assets/landing/banner_bg.png')",
            },
            fontFamily: {
                'alexol': ['Montserrat', 'sans-serif']
            },
            spacing: {
                '26': '6.5rem',
            },
            boxShadow: {
                'header-referral': '0px 0px 28.3px 0px #603FA5 inset',
                'header-referral-link': '0px 4px 4px 0px rgba(0, 0, 0, 0.25)',
                'rank-1-shadow': '1px 2px 0px 0px #05CA11'
            },
            screens: {
                'laptop': '1149px',
            }
        },
    },
    plugins: [],
}

