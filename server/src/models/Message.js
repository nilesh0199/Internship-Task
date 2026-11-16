import mongoose from 'mongoose';

const EmailAddressSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    email: { type: String, required: true, lowercase: true, trim: true },
  },
  { _id: false }
);

const MessageSchema = new mongoose.Schema(
  {
    threadId: { type: String, required: true, index: true },
    providerMessageId: { type: String, required: true },
    from: EmailAddressSchema,
    to: [EmailAddressSchema],
    cc: [EmailAddressSchema],
    bcc: [EmailAddressSchema],
    replyTo: { type: String, default: null },
    subject: { type: String, required: true },
    date: { type: Date, required: true, index: true },
    snippet: { type: String, default: '' },
    bodyHtml: { type: String, default: '' },
    bodyText: { type: String, default: '' },
    headers: {
      listUnsubscribe: { type: String, default: null },
      precedence: { type: String, default: null },
      messageIdHeader: { type: String, default: null },
    },
    direction: { type: String, enum: ['INBOUND', 'OUTBOUND'], required: true },
    hasAttachments: { type: Boolean, default: false },
    attachments: [
      {
        filename: String,
        mimeType: String,
        sizeBytes: Number,
        attachmentId: String,
      },
    ],
  },
  { timestamps: true }
);

MessageSchema.index({ threadId: 1, date: 1 });

export const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);
