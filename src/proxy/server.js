const http=require("http");
const proxy_port=8080;
const upstream_host="localhost";
const upstream_port=3001;

const proxyServer=http.createServer((clientReq,clientRes)=>{
    console.log(`[Proxy] Incoming: ${clientReq.method} ${clientReq.url}`);
    
    //configuring outgoing req
    const proxyOptions={
        hostname:upstream_host,
        port:upstream_port,
        path:clientReq.url,
        method:clientReq.method,
        headers:{
            ...clientReq.headers,
            host:`${upstream_host}:${upstream_port}`
        }
    };

    // req to backend
    const upstreamReq=http.request(proxyOptions,(upstreamRes)=>{
        console.log(`[Proxy] Backend responded: ${upstreamRes.statusCode}`);
        // forward backend status and header
        clientRes.writeHead(upstreamRes.statusCode, upstreamRes.headers);
        //stream back response to client
        upstreamRes.pipe(clientRes);    
    });
    // backend connection error
    upstreamReq.on("error",(err)=>{
        console.log("[Proxy] Upstream Error:", err.message);
        if(!clientRes.headersSent){
            clientRes.writeHead(502,{"Content-Type":"application/json"});
            clientRes.end(JSON.stringify({
                error:"Bad Gateway",
                message:"Unable to reach upstream server"
            }))
        }else{
            clientRes.destroy(err);
        }
    });
    // forward client request body to backend
    clientReq.pipe(upstreamReq);
});

proxyServer.listen(proxy_port,()=>{
    console.log(`Reverse Proxy running on http://localhost:${proxy_port}`);
});