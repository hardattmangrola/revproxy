const http=require("http");
const resolveRoute=require("../router/router")
const proxy_port=8080;
const timeout=15000;

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
    const {service, rewrittenPath}=resolved;
    console.log(`[Proxy] Routing to ${service.name} (${service.port})`);
    
    //configuring outgoing req
    const options={
        hostname:service.host,
        port:service.port,
        path:rewrittenPath,
        method:clientReq.method,
        headers:{
            ...filterHeaders(clientReq.headers),
            host:`${service.host}:${service.port}`
        },
        agent:upstreamAgent
    };

    // req to backend
    const upstreamReq=http.request(options,(upstreamRes)=>{
        console.log(`[Proxy] Backend responded: ${upstreamRes.statusCode}`);
        // forward backend status and header
        clientRes.writeHead(upstreamRes.statusCode, upstreamRes.headers);
        upstreamRes.on("aborted",()=>{
            console.error("[Proxy] Upstream response abroted");
            if(!clientRes.destroyed){
                clientRes.destroy();
            }
        });    
        upstreamRes.on("error",(err)=>{
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
        console.log("[Proxy] Client aborted request");
        upstreamReq.destroy();
    });
    // client disconnected before response completed
    clientRes.on("close",()=>{
        if(!clientRes.writableEnded){
            console.log("[Proxy] Client disconnected");
            upstreamReq.destroy();
        }
    });
    // forward request body 
    clientReq.pipe(upstreamReq);
});

proxyServer.listen(proxy_port,()=>{
    console.log(`Reverse Proxy running on http://localhost:${proxy_port}`);
});

function shutdown(){
    console.log("[Proxy] Shutting down...");
    proxyServer.close(()=>{
        upstreamAgent.destroy();
        console.log("[Proxy] Server cllosed");
        
    });
}
process.on("SIGNINT", shutdown);
process.on("SIGTERM",shutdown);