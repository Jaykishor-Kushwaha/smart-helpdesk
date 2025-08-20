import mongoose from 'mongoose';
const AgentSuggestionSchema = new mongoose.Schema({
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true },
  predictedCategory: { type: String, enum: ['billing','tech','shipping','other'], required: true },
  articleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Article' }],
  draftReply: { type: String, required: true },
  confidence: { type: Number, required: true },
  autoClosed: { type: Boolean, default: false },
  modelInfo: {
    provider: String,
    model: String,
    promptVersion: String,
    latencyMs: Number,
  }
}, { timestamps: { createdAt: true, updatedAt: false } });
export const AgentSuggestion = mongoose.model('AgentSuggestion', AgentSuggestionSchema);