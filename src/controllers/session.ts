import * as whatsapp from "wa-multi-session";
import { Hono } from "hono";
import { requestValidator } from "../middlewares/validation.middleware";
import { z } from "zod";
import { createKeyMiddleware } from "../middlewares/key.middleware";
import { toDataURL } from "qrcode";
import { HTTPException } from "hono/http-exception";
import { deleteSessionFromDB, getSessionFromDB, saveSessionToDB } from "./dbService";
import { setCookie, deleteCookie } from "hono/cookie";

export const createSessionController = () => {
  const app = new Hono();

  app.get("/", createKeyMiddleware(), async (c) => {
    return c.json({
      data: whatsapp.getAllSession(),
    });
  });

  const startSessionSchema = z.object({
    session: z.string().optional(),
  });

  app.post(
    "/start",
    createKeyMiddleware(),
    requestValidator("json", startSessionSchema),
    async (c) => {
      const { session: payloadSession } = c.req.valid("json");
      // @ts-ignore
      const sessionName = (payloadSession || c.get("session_id")) as string;

      if (!sessionName) {
        return c.json({ error: "Session name is required" }, 400);
      }

      // Check memory first
      const session = whatsapp.getSession(sessionName);
      // @ts-ignore
      if (session && session.user) {
        setCookie(c, "wa_session_id", sessionName, { httpOnly: true, secure: true, sameSite: 'Strict', maxAge: 31536000 });
        return c.json({
          data: {
            message: "Session already connected",
          },
        });
      }

      // Check DB first
      const existingSession = await getSessionFromDB(sessionName);
      if (existingSession) {
        console.log(`[Session] Found existing session '${sessionName}' in DB. Loading...`);
        try {
          // Force delete just in case it's in a zombie state
          await whatsapp.deleteSession(sessionName);
          await whatsapp.startSession(sessionName, {
            sessionData: typeof existingSession.session_data === 'string'
              ? JSON.parse(existingSession.session_data)
              : existingSession.session_data,
          } as any);
          setCookie(c, "wa_session_id", sessionName, { httpOnly: true, secure: true, sameSite: 'Strict', maxAge: 31536000 });
          return c.json({
            data: {
              message: "Session loaded from database",
            },
          });
        } catch (error) {
          console.error("[Session] Failed to load session from DB:", error);
          // If loading fails, maybe we should delete it? For now, let's just proceed to try new session or error.
        }
      }

      const qr = await new Promise<string | null>(async (resolve) => {
        console.log("Starting session:", sessionName);

        try {
          await whatsapp.startSession(sessionName, {
            onConnected: async () => {
              console.log("✅ Connected");
              const session = whatsapp.getSession(sessionName);
              const sessionData = session?.authState.creds;
              // Save to DB
              try {
                await saveSessionToDB(sessionName, sessionData);
              } catch (dbErr) {
                console.error("Failed to save session to DB:", dbErr);
              }
              resolve(null);

              // Listen for credential updates to persist session
              // @ts-ignore
              if (session && session.ev) {
                // @ts-ignore
                session.ev.on('creds.update', async () => {
                  console.log("🔄 Credentials updated, saving to DB...");
                  const updatedSession = whatsapp.getSession(sessionName);
                  const updatedData = updatedSession?.authState.creds;
                  try {
                    await saveSessionToDB(sessionName, updatedData);
                  } catch (dbErr) {
                    console.error("Failed to save updated session to DB:", dbErr);
                  }
                });
              }
            },
            onQRUpdated(qr: string) {
              console.log("📱 QR:", qr);
              resolve(qr);
            },
          } as any);
        } catch (err) {
          console.error("❌ startSession error:", err);
          resolve(null); // or rethrow if needed
        }


        console.log("👀 Waiting for QR code or connection...");
      });


      if (qr) {
        return c.json({
          qr: qr,
        });
      }

      const finalSession = whatsapp.getSession(sessionName);
      // @ts-ignore
      if (!finalSession || !finalSession.user) {
        return c.json({ error: "Failed to start session" }, 500);
      }

      setCookie(c, "wa_session_id", sessionName, { httpOnly: true, secure: true, sameSite: 'Strict', maxAge: 31536000 });
      return c.json({
        data: {
          message: "Connected",
        },
      });
    }
  );
  app.get(
    "/start",
    createKeyMiddleware(),
    requestValidator("query", startSessionSchema),
    async (c) => {
      const { session: payloadSession } = c.req.valid("query");
      // @ts-ignore
      const sessionName = (payloadSession || c.get("session_id")) as string;

      if (!sessionName) {
        return c.json({ error: "Session name is required" }, 400);
      }

      // Check memory first
      const session = whatsapp.getSession(sessionName);
      // @ts-ignore
      if (session && session.user) {
        setCookie(c, "wa_session_id", sessionName, { httpOnly: true, secure: true, sameSite: 'Strict', maxAge: 31536000 });
        return c.json({
          data: {
            message: "Session already connected",
          },
        });
      }

      // Check DB first
      const existingSession = await getSessionFromDB(sessionName);
      if (existingSession) {
        console.log(`[Session] Found existing session '${sessionName}' in DB. Loading...`);
        try {
          // Force delete just in case it's in a zombie state
          await whatsapp.deleteSession(sessionName);
          await whatsapp.startSession(sessionName, {
            sessionData: typeof existingSession.session_data === 'string'
              ? JSON.parse(existingSession.session_data)
              : existingSession.session_data,
          } as any);
          setCookie(c, "wa_session_id", sessionName, { httpOnly: true, secure: true, sameSite: 'Strict', maxAge: 31536000 });
          return c.json({
            data: {
              message: "Session loaded from database",
            },
          });
        } catch (error) {
          console.error("[Session] Failed to load session from DB:", error);
        }
      }

      const isExist = whatsapp.getSession(sessionName);
      if (isExist) {
        console.log("⚠️ Session exists in memory. Deleting...");
        await whatsapp.deleteSession(sessionName);
      }


      const qr = await new Promise<string | null>(async (r) => {
        await whatsapp.startSession(sessionName, {
          onConnected: async () => {
            // Save to DB
            try {
              const session = whatsapp.getSession(sessionName);
              const sessionData = session?.authState.creds;
              await saveSessionToDB(sessionName, sessionData);
            } catch (dbErr) {
              console.error("Failed to save session to DB:", dbErr);
            }
            r(null);
          },
          onQRUpdated(qr: string) {
            r(qr);
          },
        } as any);
      });

      if (qr) {
        const qrImage = await toDataURL(qr);
        return c.json({
          qr: qrImage,
        });
      }

      const finalSession = whatsapp.getSession(sessionName);
      // @ts-ignore
      if (!finalSession || !finalSession.user) {
        return c.json({ error: "Failed to start session" }, 500);
      }

      setCookie(c, "wa_session_id", sessionName, { httpOnly: true, secure: true, sameSite: 'Strict', maxAge: 31536000 });
      return c.json({
        data: {
          message: "Connected",
        },
      });
    }
  );

  app.all("/logout", createKeyMiddleware(), async (c) => {
    let sessionName = c.req.query("session");
    if (!sessionName) {
      try {
        const body = await c.req.json();
        sessionName = body.session;
      } catch (e) {
        // Ignore JSON parse error
      }
    }
    sessionName = sessionName || "";

    await whatsapp.deleteSession(sessionName);
    await deleteSessionFromDB(sessionName);

    deleteCookie(c, "wa_session_id");

    return c.json({
      data: "success",
    });
  });

  return app;
};
