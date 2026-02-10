import { z } from 'zod';
import { insertUserPreferencesSchema, insertConversationSchema, insertMessageSchema, conversations, messages, userPreferences, subscriptions } from './schema';

// Shared error schemas
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  // --- User & Settings ---
  user: {
    getPreferences: {
      method: 'GET' as const,
      path: '/api/user/preferences' as const,
      responses: {
        200: z.custom<typeof userPreferences.$inferSelect>(),
        404: z.null(), // Not found means defaults
      },
    },
    updatePreferences: {
      method: 'PUT' as const,
      path: '/api/user/preferences' as const,
      input: insertUserPreferencesSchema.partial(),
      responses: {
        200: z.custom<typeof userPreferences.$inferSelect>(),
      },
    },
    getSubscription: {
      method: 'GET' as const,
      path: '/api/user/subscription' as const,
      responses: {
        200: z.custom<typeof subscriptions.$inferSelect>(),
        404: z.null(), // Default to free
      },
    },
  },

  // --- Conversations ---
  conversations: {
    list: {
      method: 'GET' as const,
      path: '/api/conversations' as const,
      responses: {
        200: z.array(z.custom<typeof conversations.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/conversations/:id' as const,
      responses: {
        200: z.object({
          conversation: z.custom<typeof conversations.$inferSelect>(),
          messages: z.array(z.custom<typeof messages.$inferSelect>()),
        }),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/conversations' as const,
      input: z.object({
        title: z.string().optional(),
        initialMessage: z.string().optional(),
      }),
      responses: {
        201: z.custom<typeof conversations.$inferSelect>(),
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/conversations/:id' as const,
      input: insertConversationSchema.partial(),
      responses: {
        200: z.custom<typeof conversations.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/conversations/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },

  // --- Messages ---
  messages: {
    create: {
      method: 'POST' as const,
      path: '/api/conversations/:id/messages' as const,
      input: z.object({
        content: z.string(),
        role: z.enum(['user', 'assistant']).optional(),
        attachments: z.array(z.object({
          type: z.enum(['image', 'file', 'audio']),
          url: z.string(),
          name: z.string(),
          size: z.number().optional(),
        })).optional(),
      }),
      responses: {
        201: z.custom<typeof messages.$inferSelect>(), // The user message
        // Note: The assistant response usually comes via stream or separate event in real-time apps,
        // but for simple request/response, it might return the assistant message too.
        // We'll stick to returning the created user message here, and client listens for stream.
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/conversations/:id/messages' as const,
      responses: {
        200: z.array(z.custom<typeof messages.$inferSelect>()),
      },
    },
    stream: {
      method: 'POST' as const,
      path: '/api/conversations/:id/messages/stream' as const,
      input: z.object({}),
      responses: {
        200: z.any(), // SSE stream
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
