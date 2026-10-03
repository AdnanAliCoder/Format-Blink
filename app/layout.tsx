import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Format Blink — PDF, Image, Video & Clip Tools',description:'Your everyday file workspace. Convert and edit PDFs, images, videos and clips.',icons:{icon:'/brand-icon.webp',apple:'/brand-icon.webp'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
