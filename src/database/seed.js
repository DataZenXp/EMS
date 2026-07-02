const User = require('../models/User');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');

const seedDatabase = async () => {
  try {
    // Clean up default demo tasks from MongoDB if present
    await Task.deleteMany({
      title: {
        $in: [
          'Setup secure PIN login & permission lock',
          'Design Neo-Brutalist Login Screen',
          'Verify automatic cleanup for expired completed work'
        ]
      }
    });

    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('[Database Seed]: Database already contains users. Skipping initial seed.');
      return;
    }

    console.log('[Database Seed]: Seeding initial team members (Arman, Sadhman, Adnan, Faheem)...');

    // All passwords match the frontend PIN 'Awaazfmdie' so login works immediately
    const arman = await User.create({
      name: 'Arman',
      email: 'arman@startup.io',
      passwordHash: 'Awaazfmdie',
      avatar: 'AR'
    });

    const sadhman = await User.create({
      name: 'Sadhman',
      email: 'sadhman@startup.io',
      passwordHash: 'Awaazfmdie',
      avatar: 'SA'
    });

    const adnan = await User.create({
      name: 'Adnan',
      email: 'adnan@startup.io',
      passwordHash: 'Awaazfmdie',
      avatar: 'AD'
    });

    const faheem = await User.create({
      name: 'Faheem',
      email: 'faheem@startup.io',
      passwordHash: 'Awaazfmdie',
      avatar: 'FA'
    });

    console.log('[Database Seed]: Seeding complete!');
  } catch (error) {
    console.error(`[Database Seed Error]: ${error.message}`);
  }
};

module.exports = seedDatabase;
