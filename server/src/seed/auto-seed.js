import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Article } from '../models/Article.js';

export async function seedDatabase() {
  try {
    // Check if users already exist
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('Database already seeded, skipping...');
      return;
    }

    console.log('Seeding database with demo data...');

    // Create demo users
    const [admin, agent, user] = await Promise.all([
      User.create({ 
        name: 'Admin', 
        email: 'admin@helpdesk.local', 
        password_hash: await bcrypt.hash('admin123', 10), 
        role: 'admin' 
      }),
      User.create({ 
        name: 'Agent', 
        email: 'agent@helpdesk.local', 
        password_hash: await bcrypt.hash('agent123', 10), 
        role: 'agent' 
      }),
      User.create({ 
        name: 'User', 
        email: 'user@helpdesk.local', 
        password_hash: await bcrypt.hash('user123', 10), 
        role: 'user' 
      })
    ]);

    // Create demo articles
    await Article.insertMany([
      {
        title: 'How to update your payment method',
        body: 'To update your payment method:\n1. Log into your account\n2. Go to Account Settings > Payment Methods\n3. Click "Add New Payment Method"\n4. Enter your new card details\n5. Save the changes\n\nYour new payment method will be used for future billing cycles.',
        tags: ['billing', 'payments', 'account'],
        status: 'published'
      },
      {
        title: 'Troubleshooting login problems',
        body: 'If you cannot log into your account:\n1. Verify your email address is correct\n2. Try password reset if needed\n3. Clear browser cache and cookies\n4. Try incognito/private browsing mode\n5. Disable browser extensions temporarily\n\nIf issues persist, contact support.',
        tags: ['tech', 'login', 'troubleshooting'],
        status: 'published'
      },
      {
        title: 'How to track your order and shipment',
        body: 'To track your order:\n1. Check your order confirmation email for tracking number\n2. Log into your account > "My Orders"\n3. Click the tracking link or visit carrier website\n4. Enter tracking number for real-time updates\n\nShipping timeframes:\n- Standard: 5-7 business days\n- Express: 2-3 business days\n- Overnight: Next business day',
        tags: ['shipping', 'tracking', 'delivery'],
        status: 'published'
      }
    ]);

    console.log('✅ Database seeded successfully!');
    console.log('📧 Demo accounts created:');
    console.log('   👑 Admin: admin@helpdesk.local / admin123');
    console.log('   🛠️  Agent: agent@helpdesk.local / agent123');
    console.log('   👤 User: user@helpdesk.local / user123');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }
}
