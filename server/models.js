import mongoose from 'mongoose';

const { Schema } = mongoose;
const ttl = { type: Date, index: { expireAfterSeconds: 0 } }; // MongoDB deletes the document automatically at this time

const registrationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 120, unique: true },
    emailKey: { type: String, unique: true, sparse: true }, // normalised email (no +tags): one registration per MFU mailbox
    emailVerified: { type: Boolean, default: false },
    lineId: { type: String, required: true, trim: true, maxlength: 40 },
    lineIdKey: { type: String, required: true, unique: true },
    seat: { type: String, unique: true, sparse: true }, // e.g. "C7"; absent for waitlist
    status: { type: String, enum: ['confirmed', 'waitlist'], default: 'confirmed', index: true },
    ticketCode: { type: String, required: true, unique: true },
    checkedIn: { type: Boolean, default: false },
    checkedInAt: { type: Date },
    checkedInBy: { type: String },
    ip: { type: String } // logged for abuse prevention
  },
  { timestamps: true }
);

// A registration waiting for its email code. Seats are held while it exists. Auto-deleted when it expires.
const pendingSchema = new Schema({
  email: { type: String, required: true, unique: true },
  emailKey: { type: String, required: true },
  name: String, lineId: String, seat: String,
  otpHash: String, attempts: { type: Number, default: 0 }, lastSentAt: Date,
  ip: String, userAgent: String,
  expiresAt: ttl
});

// A frozen visitor (by IP address). Auto-deleted a day after the freeze ends.
const blockSchema = new Schema({
  key: { type: String, required: true, unique: true },
  ip: String, userAgent: String, reason: String,
  strikes: { type: Number, default: 0 }, until: Date, purgeAt: ttl
}, { timestamps: true });

// Rolling counters for rate limiting that work on serverless (state lives in MongoDB, not memory).
const hitSchema = new Schema({ key: { type: String, required: true, unique: true }, count: { type: Number, default: 0 }, expireAt: ttl });

const adminSchema = new Schema({ email: { type: String, required: true, unique: true, lowercase: true, trim: true }, passwordHash: { type: String, required: true }, createdBy: String }, { timestamps: true });

const checkinLinkSchema = new Schema({
  tokenHash: { type: String, required: true, unique: true },
  label: { type: String, maxlength: 60 }, expiresAt: Date, revoked: { type: Boolean, default: false },
  uses: { type: Number, default: 0 }, lastUsedAt: Date, createdBy: String
}, { timestamps: true });

// Uploaded images (MFU logo, people photos). Small files stored directly in MongoDB and served by /api/asset/:id.
const assetSchema = new Schema({ mime: String, name: String, size: Number, data: Buffer, createdBy: String }, { timestamps: true });

// One document holds all editable website settings (key: "site").
const settingSchema = new Schema({ key: { type: String, unique: true, required: true }, data: { type: Schema.Types.Mixed, default: {} } }, { timestamps: true });

const m = (name, schema) => mongoose.models[name] || mongoose.model(name, schema);
export const Registration = m('Registration', registrationSchema);
export const Pending = m('Pending', pendingSchema);
export const Block = m('Block', blockSchema);
export const Hit = m('Hit', hitSchema);
export const Admin = m('Admin', adminSchema);
export const CheckinLink = m('CheckinLink', checkinLinkSchema);
export const Asset = m('Asset', assetSchema);
export const Setting = m('Setting', settingSchema);
