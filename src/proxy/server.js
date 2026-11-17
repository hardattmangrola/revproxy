const http=require("http");
const resolveRoute=require("../router/router")
const proxy_port=8080;
const timeout=15000;
const authenticate = require("../middleware/auth");
const checkIP = require("../middleware/ipFilter");
const createBodyLimit = require("../middleware/bodyLimit");
const MAX_BODY_SIZE = 5 * 1024 * 1024;
const TokenBucketRateLimiter =
    require("../middleware/rateLimiter");

const rateLimiter = new TokenBucketRateLimiter(
    10,  // Maximum 10 tokens
    5    // Refill 5 tokens per second
);
const RoundRobin=require("../loadbalancer/roundRobin");
const WeightedRoundRobin = require("../loadbalancer/weightedRoundRobin");
const LeastConnections = require("../loadbalancer/leastConnections");
const services=require("../registry/services");
const {startHealthChecks}=require("../health/healthChecker");
const {
    recordFailure,
    recordSuccess
}=require("../health/healthManager");
const selectors={
    roundRobin: new Map(),
    weightedRoundRobin: new Map(),
    leastConnections: new LeastConnections()
};

const strategy="weightedRoundRobin";
function selectedBackend(serviceKey, instances){
    if(strategy==='leastConnections'){
        return selectors.leastConnections.select(instances);
    }
    const strategyMap=selectors[strategy];
    if(!strategyMap){
        throw new Error(`Unknown strategy: ${strategy}`);
    }
    if(!strategyMap.has(serviceKey)){
        const selector=strategy==='roundRobin'
        ? new RoundRobin()
        : new WeightedRoundRobin();
        strategyMap.set(serviceKey,selector);
    }
    return strategyMap
                .get(serviceKey)
                .select(instances);
}
//Reuse upstream TCP Connections-> Connection Pooling
const upstreamAgent=new http.Agent({
    keepAlive:true, // Reuse sockets for subsequent requests
    maxSockets:100, // limit concurrent sockets per origin
    maxFreeSockets:10 // limit idle sockets retained for reuse
})

//Remove hop-by-hop headers
function filterHeaders(headers){
    const result={...headers};
    //connection can nominate additional hop-by-hop headers
    if(result.connection){
        result.connection.split(",").forEach((header)=>{
            delete result[header.trim().toLowerCase()];
        });
    }

    const hopByHop=[
        "connection",
        "keep-alive",
        "proxy-authenticate",
        "proxy-authorization",
        "te",
        "trailer",
        "transfer-encoding",
        "upgrade"
    ];

    hopByHop.forEach((header)=>delete result[header]);
    return result;
}
const proxyServer=http.createServer((clientReq,clientRes)=>{
    console.log(`[Proxy] Incoming: ${clientReq.method} ${clientReq.url}`);
    
    if (!authenticate(clientReq, clientRes)) {
        return;
    }
    if (!checkIP(clientReq, clientRes)) {
        return;
    }

    const contentLength = clientReq.headers["content-length"];
    if (contentLength && Number(contentLength) > MAX_BODY_SIZE) {
        clientRes.writeHead(413, {
            "Content-Type": "application/json"
        });
        clientRes.end(JSON.stringify({
            error: "Payload Too Large"
        }));
        return;
    }

    const clientIp = clientReq.socket.remoteAddress;
    const rateLimit = rateLimiter.allowRequest(clientIp);
    clientRes.setHeader(
        "X-RateLimit-Remaining",
        rateLimit.remaining
    );
    if (!rateLimit.allowed) {
        clientRes.writeHead(429, {
            "Content-Type": "application/json",
            "Retry-After": rateLimit.retryAfter
        });
        clientRes.end(JSON.stringify({
            error: "Too Many Requests",
            message: "Rate limit exceeded",
            retryAfter: rateLimit.retryAfter
        }));
        return;
    }
    // Resolve the destination service
    const resolved=resolveRoute(clientReq.url);
    // Handle unkown routes
    if(!resolved){
        clientRes.writeHead(404,{"Content-Type": "application/json"});
        clientRes.end(JSON.stringify({
            error:"Route not found",
            path:clientReq.url
        }));
        return ;
    }
    const {service, serviceKey, rewrittenPath}=resolved;
    const instance=selectedBackend(serviceKey,service.instances);
    if(!instance){
        clientRes.writeHead(503,{"Content-Type": "application/json"});
        clientRes.end(JSON.stringify({
            error: "Service Unavailable",
            message: "No healthy backend instances available"
        }));
        return;
    }
    instance.activeConnections += 1;
    let released = false;
    function releaseConnection(){
        if(released) return;

        released = true;
        instance.activeConnections = Math.max(
            0,
            instance.activeConnections - 1
        );
    }
    console.log(`[Proxy] Routing to ${instance.id} (${instance.port})`);
    
    //configuring outgoing req
    const options={
        hostname:instance.host,
        port:instance.port,
        path:rewrittenPath,
        method:clientReq.method,
        headers:{
            ...filterHeaders(clientReq.headers),
            host:`${instance.host}:${instance.port}`
        },
        agent:upstreamAgent
    };

    // req to backend
    const upstreamReq=http.request(options,(upstreamRes)=>{
        console.log(`[Proxy] Backend responded: ${upstreamRes.statusCode}`);
        if(upstreamRes.statusCode>=500){
            instance.breaker.failure();
            recordFailure(instance,`HTTP ${upstreamRes.statusCode}`);
        }else{
            instance.breaker.success();
            recordSuccess(instance);
        }
        upstreamRes.on("end",releaseConnection);
        upstreamRes.on("close",releaseConnection);
        // forward backend status and header
        clientRes.writeHead(
            upstreamRes.statusCode,
            filterHeaders(upstreamRes.headers)
        );
        upstreamRes.on("aborted",()=>{
            releaseConnection();
            console.error("[Proxy] Upstream response abroted");
            if(!clientRes.destroyed){
                clientRes.destroy();
            }
        });    
        upstreamRes.on("error",(err)=>{
            releaseConnection();
            console.error("[Proxy] Response stream error: ", err.message);
            if(!clientRes.destroyed){
                clientRes.destroy();
            }
        });
        //Stream response to client
        upstreamRes.pipe(clientRes);
    });
    //Upstream socket inactivity timeout
    upstreamReq.setTimeout(timeout,()=>{
        const err=new Error("Upstream Timroue");
        err.code="ETIMEDOUT";
        upstreamReq.destroy(err);
    });
    // backend connection error
    upstreamReq.on("error",(err)=>{
        releaseConnection();
        instance.breaker.failure();
        recordFailure(instance,err.message);
        console.log("[Proxy] Upstream Error:", err.message);
        if(clientRes.destroyed || clientRes.writableEnded){
            return;
        }
        if(!clientRes.headersSent){
            const status=err.code==="ETIMEDOUT"?504:502;
            clientRes.writeHead(status,{"Content-Type":"application/json"});
            clientRes.end(JSON.stringify({
                error:status===504?"Gateway Timeout": "Bad Gateway"
            }));
        }else{
            clientRes.destroy(err);
        }
    });
    //client aborted the incoming request
    clientReq.on("aborted",()=>{
        releaseConnection();
        console.log("[Proxy] Client aborted request");
        upstreamReq.destroy();
    });
    clientReq.on("error",releaseConnection);
    // client disconnected before response completed
    clientRes.on("close",()=>{
        if(!clientRes.writableEnded){
            releaseConnection();
            console.log("[Proxy] Client disconnected");
            upstreamReq.destroy();
        }
    });
    // Forward the request body while enforcing the configured size limit.
    const bodyLimiter = createBodyLimit(MAX_BODY_SIZE);
    bodyLimiter.on("error", (err) => {
        if (err.code === "BODY_TOO_LARGE") {
            console.log("[Security] Request body limit exceeded");
            releaseConnection();
            upstreamReq.destroy();

            if (!clientRes.headersSent && !clientRes.destroyed) {
                clientRes.writeHead(413, {
                    "Content-Type": "application/json"
                });
                clientRes.end(JSON.stringify({
                    error: "Payload Too Large",
                    maxSize: MAX_BODY_SIZE
                }));
            }
        }
    });

    clientReq.pipe(bodyLimiter).pipe(upstreamReq);
});

const stopHealthChecks=startHealthChecks(services);

proxyServer.listen(proxy_port,()=>{
    console.log(`Reverse Proxy running on http://localhost:${proxy_port}`);
});

function shutdown(){
    console.log("[Proxy] Shutting down...");
    stopHealthChecks();
    proxyServer.close(()=>{
        upstreamAgent.destroy();
        console.log("[Proxy] Server cllosed");
        
    });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM",shutdown);