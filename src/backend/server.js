const http=require("http");
const port=3001;
const server=http.createServer((req,res)=>{
    console.log(`[Backend] ${req.method} ${req.url}`);
    let body="";
    req.on("data",(chunk)=>{
        body+=chunk;
    });
    req.on("end",()=>{
        res.writeHead(200,{"Content-Type":"application/json"});
        res.end(JSON.stringify({
            message:"Response from backend",
            method:req.method,
            path:req.url,
            receivedBody:body?JSON.parse(body):null
        }));
    });
});

server.listen(port,()=>{
    console.log(`Backend running on http://localhost:${port}`);
});