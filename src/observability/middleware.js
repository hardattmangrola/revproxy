const { randomUUID } = require("crypto");
const { performance } = require("perf_hooks");
const logger = require("./logger");
const {
  registry,
  requestsTotal,
  requestDuration,
  requestsInFlight
} = require("./metrics");

function getPathname(requestUrl) {
  try {
    return new URL(requestUrl, "http://revproxy.local").pathname;
  } catch {
    return "/";
  }
}

/*
 * Wrap your existing proxy request handler:
 *
 * const observedHandler = createObservabilityMiddleware(handleProxyRequest);
 * const server = http.createServer(observedHandler);
 *
 * /metrics and /healthz are handled here, before your normal proxy middleware.
 */
function createObservabilityMiddleware(proxyHandler) {
  return async function observedRequestHandler(req, res) {
    const requestId = randomUUID();
    const startedAt = performance.now();
    const pathname = getPathname(req.url);

    req.requestId = requestId;
    res.setHeader("X-Request-ID", requestId);

    if (pathname === "/healthz" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", service: "revproxy" }));
      return;
    }

    if (pathname === "/metrics" && req.method === "GET") {
      try {
        const body = await registry.metrics();
        res.writeHead(200, {
          "Content-Type": registry.contentType,
          "Cache-Control": "no-store"
        });
        res.end(body);
      } catch (error) {
        logger.error("Failed to generate Prometheus metrics", {
          requestId,
          error: error.message
        });

        if (!res.headersSent) {
          res.writeHead(500, { "Content-Type": "text/plain" });
        }
        res.end("Unable to generate metrics");
      }
      return;
    }

    requestsInFlight.inc();

    let finalized = false;

    function finalize(outcome) {
      if (finalized) return;
      finalized = true;

      requestsInFlight.dec();

      const durationSeconds = (performance.now() - startedAt) / 1000;
      const statusCode = String(res.statusCode || 500);

      if (outcome === "finish") {
        requestsTotal.inc({
          method: req.method,
          status_code: statusCode
        });

        requestDuration.observe(
          { method: req.method, status_code: statusCode },
          durationSeconds
        );
      }

      const metadata = {
        requestId,
        method: req.method,
        path: pathname,
        statusCode: Number(statusCode),
        durationMs: Number((durationSeconds * 1000).toFixed(2)),
        clientIp: req.socket.remoteAddress
      };

      if (outcome === "finish") {
        logger.info("HTTP request completed", metadata);
      } else {
        logger.warn("HTTP connection closed before response completed", metadata);
      }
    }

    res.once("finish", () => finalize("finish"));
    res.once("close", () => {
      if (!res.writableFinished) finalize("close");
    });

    try {
      proxyHandler(req, res);
    } catch (error) {
      logger.error("Unhandled proxy handler error", {
        requestId,
        method: req.method,
        path: pathname,
        error: error.message
      });

      if (!res.headersSent && !res.destroyed) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          error: "Internal Server Error",
          requestId
        }));
      } else if (!res.destroyed) {
        res.destroy(error);
      }
    }
  };
}

module.exports = createObservabilityMiddleware;
