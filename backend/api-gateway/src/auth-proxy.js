import { createProxyMiddleware } from "http-proxy-middleware";

export function createAuthProxy({ target, frontendUrl = "http://localhost:5173", proxyTimeout = 45000, retryDelay = 500 }) {
  const proxy = createProxyMiddleware({
    target,
    changeOrigin: true,
    proxyTimeout,
    on: {
      error(error, req, res) {
        const isGoogleCallback = req.method === "GET" &&
          req.url.split("?")[0] === "/google/callback";
        // Log the transport error, never the OAuth code or complete callback URL.
        console.error("Auth proxy connection failed:", error.code || "UNKNOWN");
        if (res.headersSent || res.destroyed) return;
        // ECONNREFUSED means no connection was established and the code was not used.
        // Never replay a callback after a timeout/reset: Google codes are single-use.
        if (isGoogleCallback && error.code === "ECONNREFUSED" && (req.authProxyRetries || 0) < 3) {
          req.authProxyRetries = (req.authProxyRetries || 0) + 1;
          setTimeout(() => {
            if (!res.destroyed && !res.writableEnded) proxy(req, res, () => {});
          }, retryDelay * req.authProxyRetries);
          return;
        }
        if (isGoogleCallback) {
          const url = new URL("/tai-khoan/dang-nhap", frontendUrl);
          url.searchParams.set("error", "Dịch vụ đăng nhập tạm thời gián đoạn. Vui lòng thử Tiếp tục với Google lại.");
          res.writeHead(302, { Location: url.toString(), "Cache-Control": "no-store" });
          res.end();
          return;
        }
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, message: "Auth Service Unavailable" }));
      },
    },
  });
  return proxy;
}
