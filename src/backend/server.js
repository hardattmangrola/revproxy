const http = require("http");
function createBackend(name, port) {
    const server = http.createServer((req, res) => {
        console.log(`[${name}] ${req.method} ${req.url}`);

        res.writeHead(200, {
            "Content-Type": "application/json"
        });

        res.end(JSON.stringify({
            service: name,
            message: `Response from ${name}`,
            method: req.method,
            path: req.url,
            timestamp: new Date().toISOString()
        }));
    });

    server.listen(port, () => {
        console.log(`${name} running on port ${port}`);
    });
}

createBackend("User Service", 3001);
createBackend("Product Service", 3002);
createBackend("Order Service", 3003);
