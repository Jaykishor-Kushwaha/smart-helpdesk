import bcrypt from 'bcryptjs';
import { connectDB } from './lib/db.js';
import { User } from './models/User.js';
import { Article } from './models/Article.js';
import { Ticket } from './models/Ticket.js';
import { Reply } from './models/Reply.js';

// Import the main app
import('./index.js').then(async () => {
  // Wait a bit for the server to start
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Now seed the database
  console.log('Seeding database...');
  
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
    { title:'Billing FAQ', content:'Common billing questions...', tags:['billing','faq'] },
    { title:'Technical Support', content:'Technical troubleshooting...', tags:['tech','support'] },
    { title:'Shipping Info', content:'Shipping policies...', tags:['shipping','policy'] }
  ]);

  console.log('Database seeded successfully!');
  console.log('Demo accounts:');
  console.log('- Admin: admin@helpdesk.local / admin123');
  console.log('- Agent: agent@helpdesk.local / agent123');
  console.log('- User: user@helpdesk.local / user123');
});
