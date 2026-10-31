import mongoose from 'mongoose';

const registrationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 120, unique: true },
    lineId: { type: String, required: true, trim: true, maxlength: 40 },
    lineIdKey: { type: String, required: true, unique: true }, // lowercase copy so LINE IDs are unique regardless of case
    status: { type: String, enum: ['confirmed', 'waitlist'], default: 'confirmed', index: true },
    ticketCode: { type: String, required: true, unique: true },
    checkedIn: { type: Boolean, default: false },
    checkedInAt: { type: Date }
  },
  { timestamps: true }
);

// One document holds all editable website settings (key: "site").
const settingSchema = new mongoose.Schema({ key: { type: String, unique: true, required: true }, data: { type: mongoose.Schema.Types.Mixed, default: {} } }, { timestamps: true });

export const Registration = mongoose.models.Registration || mongoose.model('Registration', registrationSchema);
export const Setting = mongoose.models.Setting || mongoose.model('Setting', settingSchema);
