/**
 * lib/db.ts — Mongoose connection singleton.
 *
 * ─── Why a singleton? ─────────────────────────────────────────────────────────
 * Next.js runs in a serverless-like environment where each request may
 * re-import modules. Without caching the connection, every request would open
 * a new TCP connection to MongoDB — exhausting the connection pool (default 100).
 *
 * We store the connection promise on the Node.js global object, which persists
 * across module re-evaluations in Next.js's hot-reload development mode.
 *
 * ─── Interview Q: Why global instead of module-level? ────────────────────────
 * In development, Next.js uses fast-refresh which re-evaluates modules.
 * A module-level variable is reset on each re-evaluation. The `global` object
 * is not — it persists for the lifetime of the Node.js process.
 * In production (built), this distinction doesn't matter (modules evaluated once).
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not set');
}

// Extend the global type so TypeScript knows about our cached connection
declare global {
  // eslint-disable-next-line no-var
  var mongoose: { conn: mongoose.Connection | null; promise: Promise<mongoose.Connection> | null } | undefined;
}

const cached = global.mongoose ?? { conn: null, promise: null };
global.mongoose = cached;

export async function connectDB(): Promise<mongoose.Connection> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,       // connection pool — shared across requests
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose
      .connect(MONGODB_URI!, opts)
      .then((m) => m.connection);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
