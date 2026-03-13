import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const userEmail = request.cookies.get('userEmail')?.value;
    const userRole = request.cookies.get('userRole')?.value; // !!!!!!!!!!!!!!!!
    const pathname = request.nextUrl.pathname;

    const isPublicPage = pathname === '/' || pathname === '/register';
    const isAdminPage = pathname.startsWith('/admin'); //admin ruta

    // ako nema keksa maila (nismo se logirali), vrati na root stranicu (login)
    if (!userEmail) {
        if (!isPublicPage) {
            return NextResponse.redirect(new URL('/', request.url));
        }
        return NextResponse.next();
    }

    // ako u keksima ne vidimo rolu ADMINa, salji osobu na next response (404)
    if (isAdminPage && userRole !== 'ADMIN') {
        //return NextResponse.next();
        return NextResponse.rewrite(new URL('/not-found', request.url));
    }

    // logirana osoba ne treba opet na login -> admin na admin dashboard a user na user dashboard
    if (userEmail && isPublicPage) {
        const target = userRole === 'ADMIN' ? '/admin/admin-dashboard' : '/user/user-dashboard';
        return NextResponse.redirect(new URL(target, request.url));
    }

    return NextResponse.next();
}
//na sta se ne odnosi middleware (javne rute)
export const config = {
    matcher: ['/', '/register', '/user/:path*', '/admin/:path*'],
};

