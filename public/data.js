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
  tasks: [],
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
          if (m.clockStatus === 'IN') m.lastClockOut = null;
          if (m.lastClockIn === undefined) m.lastClockIn = null;
          if (m.lastClockOut === undefined) m.lastClockOut = null;
          if (m.totalMinutesToday === undefined) m.totalMinutesToday = 0;
        });
      }
      if (parsed.tasks && Array.isArray(parsed.tasks)) {
        parsed.tasks = parsed.tasks.filter(t => 
          !['TSK-101', 'TSK-102', 'TSK-103'].includes(t.id) &&
          !['Setup secure PIN login & permission lock', 'Design Neo-Brutalist Login Screen', 'Verify automatic cleanup for expired completed work'].includes(t.title)
        );
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
