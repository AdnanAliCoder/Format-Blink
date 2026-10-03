import {NextRequest,NextResponse} from 'next/server';
export function middleware(request:NextRequest){if(/^\/google[^/]+\.html$/.test(decodeURIComponent(request.nextUrl.pathname)))return NextResponse.rewrite(new URL('/api/verification'+request.nextUrl.pathname,request.url));return NextResponse.next()}
export const config={matcher:['/:path*']};
