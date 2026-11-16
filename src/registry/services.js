const services = {
    users: {
        name: "User Service",
        instances: [
            {
                id: "users-1",  // Unique identifier for an instance.
                host: "localhost", 
                port: 3001, 
                weight: 1, // Relative traffic allocation.
                activeConnections: 0, // Number of requests currently being processed. 
                healthy: true // Whether the instance is eligible for traffic
            }
        ]
    },
    products: {
        name: "Product Service",
        instances: [
            {
                id: "products-1",
                host: "localhost",
                port: 3002,
                weight: 1,
                activeConnections: 0,
                healthy: true
            },
            {
                id: "products-2",
                host: "localhost",
                port: 3004,
                weight: 2,
                activeConnections: 0,
                healthy: true
            },
            {
                id: "products-3",
                host: "localhost",
                port: 3005,
                weight: 3,
                activeConnections: 0,
                healthy: true
            }
        ]
    },
    orders: {
        name: "Order Service",
        instances: [
            {
                id: "orders-1",
                host: "localhost",
                port: 3003,
                weight: 1,
                activeConnections: 0,
                healthy: true
            }
        ]
    }
};
module.exports = services;
