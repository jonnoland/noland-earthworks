import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { isKnownSpaRoute, spaNotFoundHtml } from "../publicRoutePolicy";

const SPA_HTML_CACHE_CONTROL = "no-cache, no-store, must-revalidate";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use((req, res, next) => {
    const isAssetRequest = path.extname(req.path).length > 0 || req.path.startsWith("/src/") || req.path.startsWith("/@");
    if (req.method === "GET" && !isAssetRequest && !req.path.startsWith("/api/") && !isKnownSpaRoute(req.path)) {
      res.status(404).set({ "Content-Type": "text/html; charset=utf-8" }).end(spaNotFoundHtml);
      return;
    }
    next();
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    if (!isKnownSpaRoute(req.path)) {
      res.status(404).set({ "Content-Type": "text/html; charset=utf-8" }).end(spaNotFoundHtml);
      return;
    }

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({
        "Content-Type": "text/html",
        "Cache-Control": SPA_HTML_CACHE_CONTROL,
      }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // HTML route responses must not remain stale at an edge cache after a publish.
  // Hashed assets still receive the static middleware's normal asset caching.
  app.use((req, res, next) => {
    const isAssetRequest = path.extname(req.path).length > 0;
    if (req.method === "GET" && !isAssetRequest && !req.path.startsWith("/api/") && isKnownSpaRoute(req.path)) {
      res.setHeader("Cache-Control", SPA_HTML_CACHE_CONTROL);
    }
    next();
  });

  app.use(express.static(distPath, {
    setHeaders(res, filePath) {
      if (path.basename(filePath) === "index.html") {
        res.setHeader("Cache-Control", SPA_HTML_CACHE_CONTROL);
      }
    },
  }));

  // fall through to index.html if the file doesn't exist
  app.use("*", (req, res) => {
    if (!isKnownSpaRoute(req.path)) {
      res.status(404).set({ "Content-Type": "text/html; charset=utf-8" }).end(spaNotFoundHtml);
      return;
    }
    res.setHeader("Cache-Control", SPA_HTML_CACHE_CONTROL);
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
