const promClient = require("prom-client");

const registry = new promClient.Registry();

registry.setDefaultLabels({
  application: "revproxy"
});

promClient.collectDefaultMetrics({
  register: registry,
  prefix: "nodejs_"
});

const requestsTotal = new promClient.Counter({
  name: "revproxy_http_requests",
  help: "Total number of completed HTTP requests handled by revproxy.",
  labelNames: ["method", "status_code"],
  registers: [registry]
});

const requestDuration = new promClient.Histogram({
  name: "revproxy_http_request_duration_seconds",
  help: "End-to-end time spent handling an HTTP request in seconds.",
  labelNames: ["method", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry]
});

const requestsInFlight = new promClient.Gauge({
  name: "revproxy_http_requests_in_flight",
  help: "Number of HTTP requests currently being handled by revproxy.",
  registers: [registry]
});

const revproxyUp = new promClient.Gauge({
  name: "revproxy_up",
  help: "Whether the revproxy process is running.",
  registers: [registry]
});

revproxyUp.set(1);

module.exports = {
  registry,
  requestsTotal,
  requestDuration,
  requestsInFlight
};
