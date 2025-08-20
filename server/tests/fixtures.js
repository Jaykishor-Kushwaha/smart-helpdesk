// Test fixtures for stubbed LLM outputs and seed data

export const mockUsers = {
  admin: {
    name: 'Test Admin',
    email: 'admin@test.com',
    password: 'admin123',
    role: 'admin'
  },
  agent: {
    name: 'Test Agent', 
    email: 'agent@test.com',
    password: 'agent123',
    role: 'agent'
  },
  user: {
    name: 'Test User',
    email: 'user@test.com', 
    password: 'user123',
    role: 'user'
  }
};

export const mockArticles = [
  {
    title: 'Billing FAQ',
    body: 'How to update payment method, refund policies, billing cycles',
    tags: ['billing', 'payment', 'refund'],
    status: 'published'
  },
  {
    title: 'Technical Support Guide',
    body: 'Troubleshooting 500 errors, login issues, API problems',
    tags: ['tech', 'errors', 'api'],
    status: 'published'
  },
  {
    title: 'Shipping Information',
    body: 'Tracking shipments, delivery times, shipping policies',
    tags: ['shipping', 'delivery', 'tracking'],
    status: 'published'
  }
];

export const mockTickets = [
  {
    title: 'Refund for double charge',
    description: 'I was charged twice for order #1234',
    category: 'billing'
  },
  {
    title: 'App shows 500 error on login',
    description: 'Stack trace mentions auth module',
    category: 'tech'
  },
  {
    title: 'Where is my package?',
    description: 'Shipment delayed 5 days',
    category: 'shipping'
  }
];

export const mockLLMOutputs = {
  classification: {
    billing: { predictedCategory: 'billing', confidence: 0.85 },
    tech: { predictedCategory: 'tech', confidence: 0.92 },
    shipping: { predictedCategory: 'shipping', confidence: 0.78 },
    other: { predictedCategory: 'other', confidence: 0.45 }
  },
  
  draftReplies: {
    billing: {
      draftReply: 'Thank you for contacting us about your billing concern. Based on our knowledge base, here are the steps to resolve this issue: [1] Check your payment method settings [2] Contact billing support for refund processing. References: [1] [2]',
      citations: ['billing-article-id-1', 'billing-article-id-2']
    },
    tech: {
      draftReply: 'We understand you are experiencing technical difficulties. Here are troubleshooting steps: [1] Clear browser cache [2] Check API status [3] Try incognito mode. References: [1] [2]',
      citations: ['tech-article-id-1', 'tech-article-id-2']
    },
    shipping: {
      draftReply: 'Thank you for your shipping inquiry. You can track your package using: [1] Order tracking portal [2] Contact shipping support. References: [1] [2]',
      citations: ['shipping-article-id-1', 'shipping-article-id-2']
    }
  }
};
