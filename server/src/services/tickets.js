import { Ticket } from '../models/Ticket.js';
export const TicketService = {
  create: (data) => Ticket.create(data),
  list: (filter) => Ticket.find(filter).sort({ createdAt: -1 }),
  get: (id) => Ticket.findById(id)
};