import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import moment from "moment";
import { globalErrorMiddleware } from "./middlewares/error.middleware";
import { notFoundMiddleware } from "./middlewares/notfound.middleware";
import { serve } from "@hono/node-server";
import { env } from "./env";
import { createSessionController } from "./controllers/session";
import * as whastapp from "wa-multi-session";
import { createMessageController } from "./controllers/message";
import { CreateWebhookProps } from "./webhooks";
import { createWebhookMessage } from "./webhooks/message";
import { createWebhookSession } from "./webhooks/session";
import { createProfileController } from "./controllers/profile";
import { serveStatic } from "@hono/node-server/serve-static";
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import * as fs from "fs";
import * as path from "path";

const app = new Hono();

// Add global error handlers for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[Startup] Uncaught Exception:', error);
  // Don't exit the process, log and continue
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Startup]Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, log and continue
});

app.use(
  logger((...params) => {
    params.map((e) => console.log(`${moment().toISOString()} | ${e}`));
  })
);
app.use(cors());
import { sessionMiddleware } from "./middlewares/session.middleware";
app.use(sessionMiddleware);

app.onError(globalErrorMiddleware);
app.notFound(notFoundMiddleware);

/**
 * Health check endpoint (no auth required for Railway)
 */
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: env.DB_HOST,
    port: env.PORT
  });
});

/**
 * Root endpoint for basic testing
 */
app.get("/", (c) => {
  return c.json({
    message: "WhatsApp Gateway API",
    version: "4.3.1",
    endpoints: {
      health: "/health",
      sessions: "/session",
      messages: "/message",
      auth: "/auth"
    }
  });
});

/**
 * serve media message static files
 */
app.use(
  "/media/*",
  serveStatic({
    root: "./",
  })
);

/**
 * session routes
 */
app.route("/session", createSessionController());
/**
 * message routes
 */
app.route("/message", createMessageController());
/**
 * profile routes
 */
app.route("/profile", createProfileController());

/**
 * auth routes
 */
import { createAuthController } from "./controllers/auth";
app.route("/auth", createAuthController());

/**
 * user routes
 */
import { createUserController } from "./controllers/user";
app.route("/users", createUserController());

/**
 * contact routes
 */
import { createContactController } from "./controllers/contact";
app.route("/contacts", createContactController());

/**
 * history routes
 */
import { createHistoryController } from "./controllers/history";
app.route("/history", createHistoryController());

/**
 * admin routes
 */
import { createAdminController } from "./controllers/admin";
app.route("/admin", createAdminController());

const port = env.PORT;

console.log(`[Startup] Starting server on port ${port}...`);
console.log(`[Startup] Environment Configuration:`);
console.log(`[Startup]   NODE_ENV: ${env.NODE_ENV}`);
console.log(`[Startup]   PORT: ${port}`);
console.log(`[Startup]   DB_HOST: ${env.DB_HOST || 'NOT SET'}`);
console.log(`[Startup]   DB_PORT: ${env.DB_PORT}`);
console.log(`[Startup]   DB_USER: ${env.DB_USER}`);
console.log(`[Startup]   DB_NAME: ${env.DB_NAME}`);
console.log(`[Startup]   DB_PASSWORD: ${env.DB_PASSWORD ? 'SET' : 'NOT SET'}`);
console.log(`[Startup]   RAILWAY_ENVIRONMENT: ${env.RAILWAY_ENVIRONMENT || 'not set'}`);
console.log(`[Startup]   WEBHOOK_BASE_URL: ${env.WEBHOOK_BASE_URL || 'not set'}`);
console.log(`[Startup]   KEY: ${env.KEY ? 'SET' : 'NOT SET'}`);

serve(
  {
    fetch: app.fetch,
    port,
    hostname: '0.0.0.0', // Listen on all interfaces for Railway
  },
  (info) => {
    console.log(`✅ Server is running on http://localhost:${info.port}`);
    console.log(`[Startup] Health check available at http://localhost:${info.port}/health`);
  }
);

whastapp.onConnected((session) => {
  console.log(`session: '${session}' connected`);
});

// Implement Webhook
if (env.WEBHOOK_BASE_URL) {
  const webhookProps: CreateWebhookProps = {
    baseUrl: env.WEBHOOK_BASE_URL,
  };

  // message webhook
  whastapp.onMessageReceived(createWebhookMessage(webhookProps));

  // session webhook
  const webhookSession = createWebhookSession(webhookProps);

  whastapp.onConnected((session) => {
    console.log(`session: '${session}' connected`);
    webhookSession({ session, status: "connected" });
  });
  whastapp.onConnecting((session) => {
    console.log(`session: '${session}' connecting`);
    webhookSession({ session, status: "connecting" });
  });
  whastapp.onDisconnected((session) => {
    console.log(`session: '${session}' disconnected`);
    webhookSession({ session, status: "disconnected" });
  });
}
// End Implement Webhook

// Restore sessions from DB
import { getAllSessionsFromDB, initUsersTable, initContactsTable, initMessagesTable, saveMessageToDB } from "./controllers/dbService";

(async () => {
  try {
    console.log('[Startup] Waiting for database to be ready...');
    // Add delay to ensure database is ready
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('[Startup] Initializing database tables...');
    await initUsersTable();
    await initContactsTable();
    await initMessagesTable();

    console.log('[Startup] Fetching sessions from database...');
    const sessions = await getAllSessionsFromDB();
    console.log(`[Startup] Found ${sessions.length} sessions to restore`);

    for (const session of sessions) {
      console.log(`[Startup] Restoring session: ${session.session_name}`);
      try {
        await whastapp.startSession(session.session_name, {
          sessionData: typeof session.session_data === 'string'
            ? JSON.parse(session.session_data)
            : session.session_data,
          onConnected: async () => {
            console.log(`[Startup] Session '${session.session_name}' connected`);
          },
          onQRUpdated: (qr: string) => {
            console.log(`[Startup] Session '${session.session_name}' QR updated`);
          },
          onMessageReceived: async (msg: any) => {
            // Save incoming message
            if (!msg.key.fromMe) {
              const content = msg.message?.conversation ||
                msg.message?.extendedTextMessage?.text ||
                msg.message?.imageMessage?.caption ||
                msg.message?.videoMessage?.caption ||
                "Media Message";

              const messageType = Object.keys(msg.message || {})[0];
              const type = msg.message?.imageMessage ? 'image' :
                msg.message?.videoMessage ? 'video' :
                  msg.message?.documentMessage ? 'document' :
                    msg.message?.stickerMessage ? 'sticker' : 'text';

              let mediaUrl = null;

              // Handle Media Download
              if (['image', 'video', 'document', 'sticker'].includes(type)) {
                try {
                  const buffer = await downloadMediaMessage(
                    msg,
                    'buffer',
                    {},
                    {
                      logger: console as any,
                      reuploadRequest: (msg: any) => new Promise((resolve) => resolve(msg))
                    }
                  );

                  if (buffer) {
                    const ext = type === 'image' ? 'jpg' :
                      type === 'video' ? 'mp4' :
                        type === 'sticker' ? 'webp' :
                          'bin'; // Default for document if unknown

                    const fileName = `${Date.now()}_${msg.key.id}.${ext}`;
                    const filePath = path.join("media", fileName);

                    // Ensure media directory exists
                    if (!fs.existsSync("media")) {
                      fs.mkdirSync("media");
                    }

                    await fs.promises.writeFile(filePath, buffer);
                    mediaUrl = `/media/${fileName}`;
                    console.log(`[Media] Saved to ${mediaUrl}`);
                  }
                } catch (err) {
                  console.error("[Media] Failed to download media:", err);
                }
              }

              await saveMessageToDB(
                session.session_name,
                msg.key.remoteJid || '',
                false,
                type,
                content,
                mediaUrl
              );
            }
          }
        } as any);
      } catch (sessionError) {
        console.error(`[Startup] Failed to restore session '${session.session_name}':`, sessionError);
        // Continue with other sessions
      }
    }
    console.log(`[Startup] Completed. ${sessions.length} sessions processed.`);
  } catch (error) {
    console.error("[Startup] Failed to initialize database or restore sessions:", error);
    console.error("[Startup] App will continue without database/session restoration");
    // Don't crash the app on startup failures
  }
})();
