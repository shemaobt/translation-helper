import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { neon } from "@neondatabase/serverless";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeQdrantCollection } from "./vector-memory";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Trust proxy for proper secure cookie and IP handling
// Replit runs applications behind a proxy in all environments
app.set('trust proxy', 1);

// Session configuration
const PostgreSQLStore = connectPgSimple(session);

// Ensure SESSION_SECRET is available (use a default for deployment if not set)
const sessionSecret = process.env.SESSION_SECRET || 'obt-mentor-companion-secret-2025';
if (!process.env.SESSION_SECRET) {
  log('Warning: SESSION_SECRET not set, using default (please set in production)');
}

// Configure session store to use existing Drizzle sessions table with error handling
let sessionStore: any;

// Validate DATABASE_URL exists
if (!process.env.DATABASE_URL) {
  const errorMsg = 'DATABASE_URL environment variable is required';
  log(`Session store error: ${errorMsg}`);
  if (process.env.NODE_ENV === 'production') {
    throw new Error(errorMsg);
  }
  // Use memory store in development if DATABASE_URL missing
  const MemoryStore = session.MemoryStore;
  sessionStore = new MemoryStore();
  log('Using memory-based session store (degraded mode)');
} else {
  try {
    sessionStore = new PostgreSQLStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      tableName: 'sessions', // Use existing Drizzle table name
      createTableIfMissing: true, // Auto-create table if missing (fixes production)
    });
    
    // Test database connection with error handling
    sessionStore.on('error', (error: any) => {
      log(`Session store database error: ${error.message}`);
      // In production, this is critical but we'll let it continue
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
    // Fallback to memory store
    const MemoryStore = session.MemoryStore;
    sessionStore = new MemoryStore();
    log('Falling back to memory-based session store (degraded mode)');
  }
}

// Add session middleware with error handling
try {
  // Check if we're in production environment
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Determine cookie settings based on environment
  const cookieSettings: any = {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax' as const,
    // Set secure to true only in production with HTTPS
    secure: isProduction ? 'auto' : false,
  };

  app.use(session({
    store: sessionStore,
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    name: 'obt_mentor.sid', // Custom session cookie name
    cookie: cookieSettings,
    proxy: true, // Trust the reverse proxy (important for Replit deployments)
  }));
} catch (error) {
  log(`Failed to configure session middleware: ${error instanceof Error ? error.message : 'Unknown error'}`);
  // Continue without session middleware as fallback
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
      
      // Only log response body for non-sensitive routes
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

// Add health check endpoint for deployment readiness
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

(async () => {
  try {
    const server = await registerRoutes(app);

    // Initialize Qdrant collection for global memory
    try {
      await initializeQdrantCollection();
      log('Qdrant vector memory initialized successfully');
    } catch (error) {
      log(`Warning: Qdrant initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      log('Continuing without vector memory (semantic search will be unavailable)');
    }

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      log(`Request error: ${err.message || err}`);
      // Don't rethrow - log and continue to prevent crashes
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
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
