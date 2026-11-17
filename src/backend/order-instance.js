const http = require("http");

function createOrderInstance(port, instanceId) {
    const server = http.createServer((req, res) => {
        if (req.method === "GET" && req.url === "/health") {
            res.writeHead(200, {
                "Content-Type": "application/json"
            });
            return res.end(JSON.stringify({
                status: "UP",
                instance: instanceId
            }));
        }

        console.log(`[${instanceId}] ${req.method} ${req.url}`);
        setTimeout(() => {
            res.writeHead(200, {
                "Content-Type": "application/json"
            });
            res.end(JSON.stringify({
                service: "Order Service",
                instance: instanceId,
                port,
                path: req.url
            }));
        }, 500);
    });

    server.listen(port, () => {
        console.log(`${instanceId} listening on port ${port}`);
    });
}

createOrderInstance(3001, "orders-1");
