import mongoose from 'mongoose';

// Cache the connection on globalThis so serverless invocations (Vercel) reuse it instead of reconnecting every request.
const cache = globalThis.__mongo || (globalThis.__mongo = { conn: null, promise: null });

export async function connectDB() {
  if (cache.conn) return cache.conn;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, { serverSelectionTimeoutMS: 8000, bufferCommands: false }).then(m => m);
  }
  try {
    cache.conn = await cache.promise;
  } catch (e) {
    cache.promise = null; // allow a retry on the next request
    throw e;
  }
  return cache.conn;
}
