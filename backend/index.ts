import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { config } from "./config";

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.set('trust proxy', 1);

const PostgreSQLStore = connectPgSimple(session);

let sessionStore: session.Store;

try {
  sessionStore = new PostgreSQLStore({
    conObject: {
      connectionString: config.database.url,
    },
    tableName: 'sessions',
    createTableIfMissing: true,
  });
  
  sessionStore.on('error', (error: Error) => {
    log(`Session store database error: ${error.message}`);
    if (config.server.nodeEnv === 'production') {
      log('Session store error in production - sessions may not persist');
    }
  });
  
  sessionStore.on('connect', () => {
    log('Session store connected to PostgreSQL database successfully');
  });
  
  log('Using PostgreSQL session store (production mode)');
  
} catch (error) {
  log(`Failed to initialize PostgreSQL session store: ${error instanceof Error ? error.message : 'Unknown error'}`);
  throw new Error('Failed to initialize session store - database connection required');
}

const isProduction = config.server.nodeEnv === 'production';

const cookieSettings: session.CookieOptions = {
  httpOnly: true,
  maxAge: config.session.ttl,
  sameSite: 'lax',
  secure: isProduction ? 'auto' : false,
};

app.use(session({
  store: sessionStore,
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  name: config.session.cookieName,
  cookie: cookieSettings,
  proxy: true,
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      const isSensitiveRoute = path.startsWith('/api/auth') || path.startsWith('/api/api-keys');
      if (capturedJsonResponse && !isSensitiveRoute) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: config.server.nodeEnv
  });
});

(async () => {
  try {
    const server = await registerRoutes(app);

    app.use((err: Error & { status?: number; statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      log(`Request error: ${err.message || err}`);
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    server.listen({
      port: config.server.port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${config.server.port}`);
    });
  } catch (error) {
    log(`Server initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
})();
