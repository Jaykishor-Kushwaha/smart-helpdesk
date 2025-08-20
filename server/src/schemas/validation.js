import { z } from 'zod';

// Auth schemas
export const RegisterSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password too long')
  })
});

export const LoginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required')
  })
});

// Ticket schemas
export const CreateTicketSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    description: z.string().max(2000, 'Description too long').optional(),
    category: z.enum(['billing', 'tech', 'shipping', 'other']).optional()
  })
});

export const ReplySchema = z.object({
  body: z.object({
    body: z.string().min(1, 'Reply body is required').max(2000, 'Reply too long'),
    resolveTicket: z.boolean().optional().default(true)
  })
});

export const AssignTicketSchema = z.object({
  body: z.object({
    assignee: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid assignee ID')
  })
});

// KB schemas
export const CreateArticleSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    body: z.string().min(1, 'Body is required').max(10000, 'Body too long'),
    tags: z.array(z.string().max(50, 'Tag too long')).max(10, 'Too many tags').optional().default([]),
    status: z.enum(['draft', 'published']).optional().default('draft')
  })
});

export const UpdateArticleSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format')
  }),
  body: z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
    body: z.string().min(1, 'Body is required').max(10000, 'Body too long').optional(),
    tags: z.array(z.string().max(50, 'Tag too long')).max(10, 'Too many tags').optional(),
    status: z.enum(['draft', 'published']).optional()
  })
});

export const SearchKBSchema = z.object({
  query: z.object({
    query: z.string().max(200, 'Search query too long').optional()
  })
});

// Config schemas
export const UpdateConfigSchema = z.object({
  body: z.object({
    autoCloseEnabled: z.boolean().optional(),
    confidenceThreshold: z.number().min(0, 'Threshold must be >= 0').max(1, 'Threshold must be <= 1').optional(),
    slaHours: z.number().min(1, 'SLA hours must be >= 1').max(168, 'SLA hours must be <= 168').optional()
  })
});

// Agent schemas
export const TriageSchema = z.object({
  body: z.object({
    ticketId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ticket ID'),
    traceId: z.string().uuid('Invalid trace ID').optional()
  })
});

export const AgentReplySchema = z.object({
  body: z.object({
    customReply: z.string().max(2000, 'Reply too long').optional(),
    resolveTicket: z.boolean().optional().default(true)
  })
});

export const RegenerateSuggestionSchema = z.object({
  body: z.object({
    template: z.enum(['default', 'urgent', 'detailed']).optional().default('default')
  })
});

// Common param schemas
export const MongoIdParam = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format')
  })
});

export const TicketIdParam = z.object({
  params: z.object({
    ticketId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ticket ID format')
  })
});
