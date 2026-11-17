const http = require("http");

function createProductInstance(port, instanceId) {
    const server = http.createServer((req, res) => {
        // Health endpoint
        if(req.method==="GET" && req.url==="/health"){
            res.writeHead(200,{
                "Content-Type":"application/json"
            });
            return res.end(JSON.stringify({
                status:"UP",
                instance:instanceId
            }));
        }
        console.log(
            `[${instanceId}] ${req.method} ${req.url}`
        );

        // Simulate backend processing
        setTimeout(() => {

            res.writeHead(200, {
                "Content-Type": "application/json"
            });

            res.end(JSON.stringify({
                service: "Product Service",
                instance: instanceId,
                port: port,
                path: req.url
            }));

        }, 500);
    });

    server.listen(port, () => {
        console.log(
            `${instanceId} listening on port ${port}`
        );
    });
}

createProductInstance(3003, "products-1");
createProductInstance(3004, "products-2");
createProductInstance(3005, "products-3");
