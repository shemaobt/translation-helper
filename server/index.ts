import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { config } from "./config";

const app = express();
app.use(express.json({ limit: '10mb' })); // Increased for screenshot uploads
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.set('trust proxy', 1);

const PostgreSQLStore = connectPgSimple(session);

const sessionSecret = process.env.SESSION_SECRET || config.session.secret;
if (!process.env.SESSION_SECRET) {
  log('Warning: SESSION_SECRET not set, using default (please set in production)');
}

let sessionStore: any;

if (!process.env.DATABASE_URL) {
  const errorMsg = 'DATABASE_URL environment variable is required';
  log(`Session store error: ${errorMsg}`);
  if (process.env.NODE_ENV === 'production') {
    throw new Error(errorMsg);
  }
  const MemoryStore = session.MemoryStore;
  sessionStore = new MemoryStore();
  log('Using memory-based session store (degraded mode)');
} else {
  try {
    sessionStore = new PostgreSQLStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      tableName: 'sessions',
      createTableIfMissing: true,
    });
    
    sessionStore.on('error', (error: any) => {
      log(`Session store database error: ${error.message}`);
      if (process.env.NODE_ENV === 'production') {
        log('Session store error in production - sessions may not persist');
      }
    });
    
    sessionStore.on('connect', () => {
      log('Session store connected to PostgreSQL database successfully');
    });
    
    log('Using PostgreSQL session store (production mode)');
    
  } catch (error) {
    log(`Failed to initialize PostgreSQL session store: ${error instanceof Error ? error.message : 'Unknown error'}`);
    const MemoryStore = session.MemoryStore;
    sessionStore = new MemoryStore();
    log('Falling back to memory-based session store (degraded mode)');
  }
}

try {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const cookieSettings: any = {
    httpOnly: true,
    maxAge: config.session.ttl,
    sameSite: 'lax' as const,
    secure: isProduction ? 'auto' : false,
  };

  app.use(session({
    store: sessionStore,
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    name: config.session.cookieName,
    cookie: cookieSettings,
    proxy: true,
  }));
} catch (error) {
  log(`Failed to configure session middleware: ${error instanceof Error ? error.message : 'Unknown error'}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

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
    environment: process.env.NODE_ENV || 'development'
  });
});

(async () => {
  try {
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
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

    const port = parseInt(process.env.PORT || '5000', 10);
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
    });
  } catch (error) {
    log(`Server initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
})();
