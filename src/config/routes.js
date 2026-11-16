const routes = [
    {
        prefix: "/users",
        service: "users",
        stripPrefix: true
    },
    {
        prefix: "/products",
        service: "products",
        stripPrefix: true
    },
    {
        prefix: "/orders",
        service: "orders",
        stripPrefix: true
    }
];

module.exports = routes;
