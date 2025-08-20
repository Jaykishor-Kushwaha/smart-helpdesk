import bcrypt from 'bcryptjs';
import { connectDB } from '../lib/db.js';
import { User } from '../models/User.js';
import { Article } from '../models/Article.js';
import { Ticket } from '../models/Ticket.js';
import { Reply } from '../models/Reply.js';

await connectDB();
await User.deleteMany({});
await Article.deleteMany({});
await Ticket.deleteMany({});
await Reply.deleteMany({});

const [admin, agent, user] = await Promise.all([
  User.create({ name:'Admin', email:'admin@helpdesk.local', password_hash: await bcrypt.hash('admin123',10), role:'admin' }),
  User.create({ name:'Agent', email:'agent@helpdesk.local', password_hash: await bcrypt.hash('agent123',10), role:'agent' }),
  User.create({ name:'User',  email:'user@helpdesk.local',  password_hash: await bcrypt.hash('user123',10),  role:'user'  })
]);

await Article.insertMany([
  { title:'How to update payment method', body:'Go to billing → payment → update.', tags:['billing','payments'], status:'published' },
  { title:'Troubleshooting 500 errors', body:'Check logs, restart auth module.', tags:['tech','errors'], status:'published' },
  { title:'Tracking your shipment', body:'Visit orders → tracking link.', tags:['shipping','delivery'], status:'published' }
]);

await Ticket.insertMany([
  { title:'Refund for double charge', description:'I was charged twice for order #1234', category:'other', createdBy: user._id },
  { title:'App shows 500 on login', description:'Stack trace mentions auth module', category:'other', createdBy: user._id },
  { title:'Where is my package?', description:'Shipment delayed 5 days', category:'other', createdBy: user._id }
]);

console.log('Seeded users: admin@helpdesk.local / admin123, agent@helpdesk.local / agent123, user@helpdesk.local / user123');
process.exit(0);