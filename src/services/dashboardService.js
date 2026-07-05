const Task = require('../models/Task');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { TASK_STATUS } = require('../constants/roles');

function applyBackendAttendanceRules(user) {
  if (!user) return false;
  let modified = false;
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // 1. Midnight reset
  if (user.lastClockDate && user.lastClockDate !== todayStr) {
    user.totalMinutesToday = 0;
    user.lastClockDate = todayStr;
    modified = true;
  } else if (!user.lastClockDate) {
    user.lastClockDate = todayStr;
    modified = true;
  }

  // 2. 12-Hour Auto Clock Out check (720 minutes)
  if (user.clockStatus === 'IN' && user.lastClockIn) {
    const elapsedMins = Math.floor((now.getTime() - new Date(user.lastClockIn).getTime()) / 60000);
    if (elapsedMins >= 720) {
      user.clockStatus = 'OUT';
      user.lastClockOut = new Date(new Date(user.lastClockIn).getTime() + 720 * 60000);
      user.totalMinutesToday = Math.min(720, (user.totalMinutesToday || 0) + 720);
      user.totalMinutesAllTime = (user.totalMinutesAllTime || 0) + 720;
      modified = true;
    }
  }
  return modified;
}

class DashboardService {
  static async getMyTasks(userId) {
    return Task.find({ assignedTo: userId })
      .populate('assignedTo createdBy', 'name email avatar')
      .sort({ createdAt: -1 });
  }

  static async getTasksAssignedToMe(userId) {
    return Task.find({ assignedTo: userId })
      .populate('createdBy', 'name email avatar')
      .sort({ createdAt: -1 });
  }

  static async getTasksCreatedByMe(userId) {
    return Task.find({ createdBy: userId })
      .populate('assignedTo', 'name email avatar')
      .sort({ createdAt: -1 });
  }

  static async getPendingTasks(userId) {
    return Task.find({
      assignedTo: userId,
      status: { $ne: TASK_STATUS.COMPLETED }
    })
      .populate('assignedTo createdBy', 'name email avatar')
      .sort({ dueDate: 1 });
  }

  static async getCompletedTasks(userId) {
    return Task.find({
      assignedTo: userId,
      status: TASK_STATUS.COMPLETED
    })
      .populate('assignedTo createdBy', 'name email avatar')
      .sort({ updatedAt: -1 });
  }

  static async getDueTodayTasks(userId) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return Task.find({
      assignedTo: userId,
      status: { $ne: TASK_STATUS.COMPLETED },
      dueDate: { $gte: startOfDay, $lte: endOfDay }
    })
      .populate('assignedTo createdBy', 'name email avatar');
  }

  static async getTeamOverview() {
    const users = await User.find({}, 'name email avatar isOnline availability clockStatus lastClockIn lastClockOut totalMinutesToday totalMinutesAllTime lastClockDate');
    for (const user of users) {
      if (applyBackendAttendanceRules(user)) {
        await user.save();
      }
    }
    const allTasks = await Task.find({}, 'status assignedTo priority');

    return users.map(user => {
      const userTasks = allTasks.filter(t => t.assignedTo.toString() === user._id.toString());
      const active = userTasks.filter(t => t.status !== TASK_STATUS.COMPLETED).length;
      const completed = userTasks.filter(t => t.status === TASK_STATUS.COMPLETED).length;

      return {
        user,
        metrics: {
          total: userTasks.length,
          active,
          completed
        }
      };
    });
  }

  static async getRecentActivity(limit = 20) {
    return ActivityLog.find({})
      .populate('userId', 'name avatar')
      .populate('taskId', 'title status')
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  static async updateMemberAvailability(identifier, availability) {
    let user = null;
    if (identifier && identifier.match(/^[0-9a-fA-F]{24}$/)) {
      user = await User.findById(identifier);
    }
    if (!user && identifier) {
      user = await User.findOne({ $or: [{ email: identifier.toLowerCase() }, { name: identifier }] });
    }
    if (!user) return null;
    user.availability = availability;
    await user.save();
    return user;
  }

  static async updateClockStatus(identifier, clockStatus, lastClockIn, lastClockOut, totalMinutesToday, totalMinutesAllTime, lastClockDate) {
    let user = null;
    if (identifier && identifier.match(/^[0-9a-fA-F]{24}$/)) {
      user = await User.findById(identifier);
    }
    if (!user && identifier) {
      user = await User.findOne({ $or: [{ email: identifier.toLowerCase() }, { name: identifier }] });
    }
    if (!user) return null;

    applyBackendAttendanceRules(user);

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (clockStatus === 'IN' && user.clockStatus !== 'IN') {
      user.clockStatus = 'IN';
      user.lastClockIn = now;
      user.lastClockOut = null;
      user.lastClockDate = todayStr;
      
      await ActivityLog.create({
        userId: user._id,
        action: 'CLOCK_IN',
        details: `Clocked in at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      }).catch(() => {});
    } else if (clockStatus === 'OUT' && user.clockStatus === 'IN') {
      const start = user.lastClockIn ? new Date(user.lastClockIn).getTime() : now.getTime();
      const elapsedMins = Math.max(1, Math.floor((now.getTime() - start) / 60000));
      const workedMins = Math.min(elapsedMins, 720);

      user.clockStatus = 'OUT';
      user.lastClockOut = now;
      user.totalMinutesToday = Math.min(720, (user.totalMinutesToday || 0) + workedMins);
      user.totalMinutesAllTime = (user.totalMinutesAllTime || 0) + workedMins;
      user.lastClockDate = todayStr;

      await ActivityLog.create({
        userId: user._id,
        action: 'CLOCK_OUT',
        details: `Finished shift (${Math.floor(workedMins / 60)}h ${workedMins % 60}m worked)`
      }).catch(() => {});
    } else {
      if (clockStatus !== undefined) user.clockStatus = clockStatus;
      if (lastClockIn !== undefined) user.lastClockIn = lastClockIn;
      if (lastClockOut !== undefined) user.lastClockOut = lastClockOut;
      if (totalMinutesToday !== undefined) user.totalMinutesToday = totalMinutesToday;
      if (totalMinutesAllTime !== undefined) user.totalMinutesAllTime = totalMinutesAllTime;
      if (lastClockDate !== undefined) user.lastClockDate = lastClockDate;
    }

    await user.save();
    return user;
  }
}

module.exports = DashboardService;
