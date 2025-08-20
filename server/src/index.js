import { createApp } from './app.js';
import { connectDB } from './lib/db.js';
import { config } from './config.js';
import { seedDatabase } from './seed/auto-seed.js';

const app = createApp();
connectDB().then(async ()=>{
  // Auto-seed if database is empty
  await seedDatabase();

  app.listen(config.port, ()=> console.log(`API on :${config.port}`));
});