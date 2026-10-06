import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Format Blink — PDF, Image, Video & Clip Tools',description:'Your everyday file workspace. Convert and edit PDFs, images, videos and clips.',icons:{icon:[{url:'/favicon.ico',sizes:'any'},{url:'/icon-48.png',type:'image/png',sizes:'48x48'},{url:'/icon-192.png',type:'image/png',sizes:'192x192'}],apple:[{url:'/apple-touch-icon.png',sizes:'180x180'}]}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en" data-theme="light"><body>{children}</body></html>}
