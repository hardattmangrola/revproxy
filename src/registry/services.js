const BACKEND_HOST = process.env.BACKEND_HOST || "localhost";

const services = {
    users: {
        name: "User Service",
        instances: [
            {
                id: "users-1",  // Unique identifier for an instance.
                host: BACKEND_HOST,
                port: 3000,
                weight: 1, // Relative traffic allocation.
                activeConnections: 0, // Number of requests currently being processed. 
                healthy: true, // Whether the instance is eligible for traffic
                failures: 0, // Consecutive health-check failures
                successes: 0, // Consecutive successful health checks
                checking: false, //	Prevent overlapping health probes
                lastChecked: null // Timestamp of last health check
            }
        ]
    },
    products: {
        name: "Product Service",
        instances: [
            {
                id: "products-1",
                host: BACKEND_HOST,
                port: 3003,
                weight: 1,
                activeConnections: 0,
                healthy: true,
                failures: 0,
                successes: 0,
                checking: false,
                lastChecked: null
            },
            {
                id: "products-2",
                host: BACKEND_HOST,
                port: 3004,
                weight: 2,
                activeConnections: 0,
                healthy: true,
                failures: 0,
                successes: 0,
                checking: false,
                lastChecked: null
            },
            {
                id: "products-3",
                host: BACKEND_HOST,
                port: 3005,
                weight: 3,
                activeConnections: 0,
                healthy: true,
                failures: 0,
                successes: 0,
                checking: false,
                lastChecked: null
            }
        ]
    },
    orders: {
        name: "Order Service",
        instances: [
            {
                id: "orders-1",
                host: BACKEND_HOST,
                port: 3001,
                weight: 1,
                activeConnections: 0,
                healthy: true,
                failures: 0,
                successes: 0,
                checking: false, 
                lastChecked: null
            }
        ]
    }
};

const CircuitBreaker = require("../health/circuitBreaker");

for (const service of Object.values(services)) {
    for (const instance of service.instances) {
        instance.breaker = new CircuitBreaker(3, 10000);
    }
}

module.exports = services;
