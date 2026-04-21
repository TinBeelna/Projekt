import { auth } from "@/app/lib/auth"
import { NextResponse } from 'next/server'

export default auth((request) => { //promjena iz cookies u auth!
    const isLoggedIn = !!request.auth;
    const userRole = request.auth?.user?.role;
    const pathname = request.nextUrl.pathname;
    const { nextUrl } = request;
    const isPublicPage = pathname === '/' || pathname === '/register';
    const isAdminPage = pathname.startsWith('/admin'); //admin ruta
    const isRefundAdminPage = pathname.startsWith('/refundAdmin');

      // Dopusti Auth.js rute da prođu bez provjere
    if (nextUrl.pathname.startsWith('/api/auth')) {
        return NextResponse.next();
    }

    // ako nema autha maila (nismo se logirali), vrati na root stranicu (login)
    if (!isLoggedIn) {
        if (!isPublicPage) {
            return NextResponse.redirect(new URL('/', request.url));
        }
        return NextResponse.next();
    }

    // ako u keksima ne vidimo rolu ADMINa, salji osobu na next response (404)
    if (isAdminPage && userRole !== 'ADMIN') {
        //return NextResponse.next();
        return NextResponse.redirect(new URL('/not-found', request.url));
    }

    if (isRefundAdminPage && userRole !== 'REFUNDADMIN') {
        //return NextResponse.next();
        return NextResponse.redirect(new URL('/not-found', request.url));
    }

    // logirana osoba ne treba opet na login -> admin na admin dashboard a user na user dashboard
    if (isLoggedIn && isPublicPage) {
        let target = '/user/user-dashboard';

        if (userRole === 'ADMIN') {
            target = '/admin/admin-dashboard'
        } else if (userRole === 'REFUNDADMIN') {
            target = '/refundAdmin/refunds' //ide se samo na refund stranicu (nema potrebe za dashboardom)
        }
        return NextResponse.redirect(new URL(target, request.url));
    }

    return NextResponse.next();
})

//na sta se ne odnosi middleware (javne rute)
export const config = {
    //matcher: ['/', '/register', '/user/:path*', '/admin/:path*'],
    matcher: ['/((?!api/auth|api/webhook|_next/static|_next/image|favicon.ico).*)'],

};
