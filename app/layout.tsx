import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'ConverToolIn — PDF, Image, Video & Clip Tools',description:'Your everyday file workspace. Convert and edit PDFs, images, videos and clips.',icons:{icon:[{url:'/favicon.ico',sizes:'any'}],apple:[{url:'/apple-touch-icon.png',sizes:'180x180'}]}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en" data-theme="light"><body>{children}</body></html>}
