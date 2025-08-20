// MongoDB initialization script for Docker
db = db.getSiblingDB('helpdesk');

// Create collections with indexes
db.createCollection('users');
db.createCollection('articles');
db.createCollection('tickets');
db.createCollection('agentsuggestions');
db.createCollection('replies');
db.createCollection('auditlogs');

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.articles.createIndex({ title: "text", body: "text", tags: "text" });
db.tickets.createIndex({ createdBy: 1 });
db.tickets.createIndex({ status: 1 });
db.tickets.createIndex({ category: 1 });
db.agentsuggestions.createIndex({ ticketId: 1 });
db.replies.createIndex({ ticketId: 1 });
db.auditlogs.createIndex({ ticketId: 1 });
db.auditlogs.createIndex({ timestamp: 1 });

print('Database initialized successfully');
