import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";

export const sessionMiddleware = createMiddleware(async (c, next) => {
    const cookieSession = getCookie(c, "wa_session_id");

    if (cookieSession) {
        // Inject into query if not present
        const query = c.req.query();
        if (!query.session) {
            // Hono's req.query() returns a readonly object or similar in some versions, 
            // but we can't easily mutate c.req.query directly in all Hono versions.
            // However, we can use c.set to pass it down or rely on the fact that 
            // our controllers might check the cookie if the param is missing.
            // A better approach for Hono is to modify the request URL or body, 
            // but that's complex. 

            // EASIER STRATEGY: 
            // Let's attach it to the context 'c' variable so controllers can use it.
            c.set("session_id", cookieSession);
        }
    }

    await next();
});
