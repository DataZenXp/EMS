/* ==========================================================================
   TASKGRID // STARTUP LOGICAL CONTROLLER WITH SECURE PIN AUTHENTICATION
   TEAM MEMBERS: ARMAN, SADMAN, ADNAN, FAHEEM
   ========================================================================== */

const COLLAB_STORAGE_KEY = 'taskgrid_4node_secure_v2';

const INITIAL_COLLABORATIVE_DATA = {
  activeUserId: null, // Starts logged out! Requires PIN login.
  members: [
    {
      id: 'MEM-1',
      name: 'Arman',
      email: 'arman@startup.io',
      pin: 'Awaazfmdie',
      clockStatus: 'OUT',
      lastClockIn: null,
      lastClockOut: null,
      totalMinutesToday: 0
    },
    {
      id: 'MEM-2',
      name: 'Sadman',
      email: 'sadman@startup.io',
      pin: 'Awaazfmdie',
      clockStatus: 'OUT',
      lastClockIn: null,
      lastClockOut: null,
      totalMinutesToday: 0
    },
    {
      id: 'MEM-3',
      name: 'Adnan',
      email: 'adnan@startup.io',
      pin: 'Awaazfmdie',
      clockStatus: 'OUT',
      lastClockIn: null,
      lastClockOut: null,
      totalMinutesToday: 0
    },
    {
      id: 'MEM-4',
      name: 'Faheem',
      email: 'faheem@startup.io',
      pin: 'Awaazfmdie',
      clockStatus: 'OUT',
      lastClockIn: null,
      lastClockOut: null,
      totalMinutesToday: 0
    }
  ],
  tasks: [
    {
      id: 'TSK-101',
      title: 'Setup secure PIN login & permission lock',
      description: 'Ensure only logged-in account holders can update their assigned tasks to prevent chaos.',
      priority: 'High',
      status: 'In Progress',
      daysAllowed: 2,
      createdBy: 'MEM-1',
      assignedTo: 'MEM-1',
      createdAt: '2026-07-01T09:00:00Z',
      updatedAt: '2026-07-01T11:00:00Z',
      attachments: [],
      comments: [
        { id: 'C-1', authorId: 'MEM-1', authorName: 'Arman', text: 'Locking edit permissions so no one accidentally marks others tasks complete.', timestamp: '10:30 AM' }
      ],
      timeline: [
        { text: 'Arman created task (2 Days Allowed)', timestamp: '09:00 AM' },
        { text: 'Arman started progress', timestamp: '10:30 AM' }
      ]
    },
    {
      id: 'TSK-102',
      title: 'Design Neo-Brutalist Login Screen',
      description: 'Create a clean, secure PIN entry card for Arman, Sadman, Adnan, and Faheem.',
      priority: 'High',
      status: 'Review',
      daysAllowed: 3,
      createdBy: 'MEM-1',
      assignedTo: 'MEM-2',
      createdAt: '2026-07-01T08:30:00Z',
      updatedAt: '2026-07-01T10:45:00Z',
      attachments: [],
      comments: [],
      timeline: [
        { text: 'Arman assigned task to Sadman (3 Days Allowed)', timestamp: '08:30 AM' },
        { text: 'Sadman moved to Review', timestamp: '10:45 AM' }
      ]
    },
    {
      id: 'TSK-103',
      title: 'Verify automatic cleanup for expired completed work',
      description: 'Test that completed items properly stay visible and clean up after deadline window.',
      priority: 'Medium',
      status: 'Todo',
      daysAllowed: 3,
      createdBy: 'MEM-3',
      assignedTo: 'MEM-4',
      createdAt: '2026-07-01T09:15:00Z',
      updatedAt: '2026-07-01T09:15:00Z',
      attachments: [],
      comments: [],
      timeline: [
        { text: 'Adnan assigned task to Faheem (3 Days Allowed)', timestamp: '09:15 AM' }
      ]
    }
  ],
  notifications: [
    {
      id: 'NT-1',
      type: 'security',
      title: 'Secure Authentication Active',
      message: 'PIN protection and task ownership locking are now enabled.',
      targetMemberId: 'MEM-1',
      timestamp: 'Just now',
      read: false
    }
  ],
  attendanceLogs: [
    { id: 'LOG-1', userId: 'MEM-1', userName: 'Arman', action: 'CLOCK_IN', timestamp: new Date(Date.now() - 3600000 * 4).toISOString() },
    { id: 'LOG-2', userId: 'MEM-2', userName: 'Sadman', action: 'CLOCK_IN', timestamp: new Date(Date.now() - 3600000 * 3.5).toISOString() }
  ]
};

function getCollaborativeState() {
  const saved = localStorage.getItem(COLLAB_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (!parsed.attendanceLogs) parsed.attendanceLogs = [];
      if (parsed.members && Array.isArray(parsed.members)) {
        parsed.members.forEach(m => {
          m.pin = 'Awaazfmdie';
          delete m.role;
          delete m.bio;
          if (!m.clockStatus) m.clockStatus = 'OUT';
          if (m.lastClockIn === undefined) m.lastClockIn = null;
          if (m.lastClockOut === undefined) m.lastClockOut = null;
          if (m.totalMinutesToday === undefined) m.totalMinutesToday = 0;
        });
      }
      return parsed;
    } catch (e) {
      console.error('Data corrupted, resetting state');
    }
  }
  localStorage.setItem(COLLAB_STORAGE_KEY, JSON.stringify(INITIAL_COLLABORATIVE_DATA));
  return JSON.parse(JSON.stringify(INITIAL_COLLABORATIVE_DATA));
}

function saveCollaborativeState(stateObj) {
  localStorage.setItem(COLLAB_STORAGE_KEY, JSON.stringify(stateObj));
}

function resetCollaborativeState() {
  localStorage.setItem(COLLAB_STORAGE_KEY, JSON.stringify(INITIAL_COLLABORATIVE_DATA));
  return JSON.parse(JSON.stringify(INITIAL_COLLABORATIVE_DATA));
}
