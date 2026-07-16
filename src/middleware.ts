import { NextRequest, NextResponse } from 'next/server';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await verifySession(token) : null;

  const isAdminRoute = pathname.startsWith('/admin');
  const isStudentRoute = pathname.startsWith('/store') || pathname.startsWith('/me');

  if ((isAdminRoute || isStudentRoute) && !user) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (isAdminRoute && user?.role !== 'admin') {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (isStudentRoute && user?.role !== 'student') {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/store/:path*', '/me/:path*'],
};
