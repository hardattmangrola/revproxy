const routes = require("../config/routes");
const services = require("../registry/services");

function resolveRoute(requestUrl) {

    // Parse incoming URL
    const parsedURL = new URL(
        requestUrl,
        "http://localhost"
    );

    const pathname=parsedURL.pathname;
    // Match the longest prefix first
    const sortedRoutes = [...routes].sort(
        (a, b) => b.prefix.length - a.prefix.length
    );
    for (const route of sortedRoutes) {
        const matches =
            pathname === route.prefix ||
            pathname.startsWith(route.prefix + "/");

        if (matches) {
            const service = services[route.service];
            if (!service) {
                return null;
            }
            // Perform Path rewriting
            let rewrittenPath=pathname;
            if(route.stripPrefix){
                rewrittenPath=pathname.slice(route.prefix.length);
                //Empty path should become "/"
                if(!rewrittenPath){
                    rewrittenPath='/';
                }
            }
            // Preserver query params
            rewrittenPath+=parsedURL.search;
            return {
                service,
                route,
                orginalPath:pathname,
                rewrittenPath
            };
        }
    }
    return null;
}

module.exports = resolveRoute;
