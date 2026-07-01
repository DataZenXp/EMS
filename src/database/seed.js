const User = require('../models/User');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');

const seedDatabase = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('[Database Seed]: Database already contains users. Skipping initial seed.');
      return;
    }

    console.log('[Database Seed]: Seeding initial team members (Arman, Sadman, Adnan, Faheem)...');

    // All passwords match the frontend PIN 'Awaazfmdie' so login works immediately
    const arman = await User.create({
      name: 'Arman',
      email: 'arman@startup.io',
      passwordHash: 'Awaazfmdie',
      avatar: 'AR'
    });

    const sadman = await User.create({
      name: 'Sadman',
      email: 'sadman@startup.io',
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

    console.log('[Database Seed]: Team members seeded. Creating sample tasks...');

    const task1 = await Task.create({
      title: 'Setup secure PIN login & permission lock',
      description: 'Ensure only logged-in account holders can update their assigned tasks to prevent chaos.',
      priority: 'High',
      status: 'In Progress',
      createdBy: arman._id,
      assignedTo: arman._id,
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    });

    await ActivityLog.create({
      taskId: task1._id,
      userId: arman._id,
      action: 'TASK_CREATED',
      details: 'Created task (2 Days Allowed)'
    });

    const task2 = await Task.create({
      title: 'Design Neo-Brutalist Login Screen',
      description: 'Create a clean, secure PIN entry card for Arman, Sadman, Adnan, and Faheem.',
      priority: 'High',
      status: 'Review',
      createdBy: arman._id,
      assignedTo: sadman._id,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    });

    await ActivityLog.create({
      taskId: task2._id,
      userId: arman._id,
      action: 'TASK_CREATED',
      details: 'Assigned task to Sadman (3 Days Allowed)'
    });

    await Notification.create({
      receiverId: arman._id,
      senderId: arman._id,
      type: 'assigned',
      message: 'Secure Authentication & Ownership Locking initialized on MongoDB'
    });

    console.log('[Database Seed]: Seeding complete!');
  } catch (error) {
    console.error(`[Database Seed Error]: ${error.message}`);
  }
};

module.exports = seedDatabase;
