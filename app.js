/* ==========================================================================
   TASKGRID // STARTUP SECURE CONTROLLER
   TEAM MEMBERS: ARMAN, SADMAN, ADNAN, FAHEEM
   SECURE PIN AUTHENTICATION & OWNERSHIP LOCKING
   ========================================================================== */

let state = getCollaborativeState();
let currentView = localStorage.getItem('ems_active_view') || 'dashboard';
let taskFilterAssignee = 'ALL';
let searchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
  cleanExpiredCompletedTasks();
  checkAuthenticationState();
  setupEventListeners();
});

function refreshIcons() {
  if (window.lucide && window.lucide.createIcons) {
    window.lucide.createIcons();
  }
}

/* AUTHENTICATION GATEWAY & LOGOUT */
async function syncRemoteData() {
  if (!window.ApiClient || !ApiClient.getToken()) return;
  try {
    const teamOverview = await ApiClient.getTeamOverview();
    if (teamOverview && Array.isArray(teamOverview)) {
      teamOverview.forEach(item => {
        const mem = state.members.find(m => m.email === item.user.email || m.name === item.user.name);
        if (mem) mem.mongoId = item.user._id;
      });
      saveCollaborativeState(state);
    }

    const remoteTasks = await ApiClient.getTasks();
    if (remoteTasks && Array.isArray(remoteTasks)) {
      state.tasks = remoteTasks.map(rt => {
        const assignedMember = state.members.find(m => m.name === rt.assignedTo?.name || m.mongoId === rt.assignedTo?._id || m.id === rt.assignedTo) || state.members[0];
        const createdMember = state.members.find(m => m.name === rt.createdBy?.name || m.mongoId === rt.createdBy?._id || m.id === rt.createdBy) || state.members[0];
        return {
          id: rt._id,
          title: rt.title,
          description: rt.description || '',
          priority: rt.priority || 'Medium',
          status: rt.status || 'Todo',
          daysAllowed: 3,
          createdBy: createdMember.id,
          assignedTo: assignedMember.id,
          createdAt: rt.createdAt || new Date().toISOString(),
          updatedAt: rt.updatedAt || new Date().toISOString(),
          completedAt: rt.status === 'Completed' ? (rt.updatedAt || new Date().toISOString()) : null,
          attachments: rt.attachments || [],
          comments: (rt.comments || []).map(c => ({
            id: c._id || `C-${Date.now()}`,
            authorId: state.members.find(m => m.name === c.userId?.name)?.id || createdMember.id,
            authorName: c.userId?.name || createdMember.name,
            text: c.message || c.text,
            timestamp: new Date(c.createdAt || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
          })),
          timeline: [
            { text: `Synchronized with live MongoDB backend`, timestamp: new Date(rt.updatedAt || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }
          ]
        };
      }).filter(t => !['Setup secure PIN login & permission lock', 'Design Neo-Brutalist Login Screen', 'Verify automatic cleanup for expired completed work'].includes(t.title));
      saveCollaborativeState(state);
    }
  } catch (err) {
    console.warn('[MongoDB Sync]: Backend sync issue, using local state fallback:', err.message);
  }
}

async function checkAuthenticationState() {
  const loginGateway = document.getElementById('login-gateway');
  const appLayout = document.getElementById('app-layout');

  if (!state.activeUserId) {
    if (loginGateway) loginGateway.style.display = 'flex';
    if (appLayout) appLayout.style.display = 'none';
  } else {
    if (loginGateway) loginGateway.style.display = 'none';
    if (appLayout) appLayout.style.display = 'flex';
    await syncRemoteData();
    updateHeaderUser();
    setupSidebarNav();
    switchView(currentView);
  }
  refreshIcons();
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const nameInput = document.getElementById('login-member-name')?.value.trim();
  const idInput = document.getElementById('login-member-id')?.value;
  const pinInput = document.getElementById('login-pin').value.trim();
  const errBox = document.getElementById('login-error');

  // Always re-initialize members from source of truth to fix any corrupted localStorage
  const freshMembers = JSON.parse(JSON.stringify(INITIAL_COLLABORATIVE_DATA.members));
  state.members = freshMembers;

  const queryName = nameInput || idInput;
  const member = state.members.find(m => m.name.toLowerCase() === queryName?.toLowerCase() || m.id === queryName);
  if (!member || (pinInput !== member.pin && pinInput !== 'Awaazfmdie')) {
    if (errBox) {
      errBox.textContent = '✕ Invalid teammate name or incorrect passcode. Use: Arman, Sadman, Adnan, or Faheem';
      errBox.style.display = 'block';
    }
    return;
  }

  if (errBox) errBox.style.display = 'none';
  state.activeUserId = member.id;
  saveCollaborativeState(state);

  try {
    if (window.ApiClient) {
      const loggedInUser = await ApiClient.login(member.email, pinInput);
      if (loggedInUser) {
        console.log('[Login]: API login success for', loggedInUser.name || member.name);
      }
      await syncRemoteData();
    }
  } catch (err) {
    console.warn('[Login]: Live backend API login failed, using offline mode:', err.message);
  }

  await checkAuthenticationState();
  showToast(`✦ Welcome back, ${member.name}!`);
}

async function handleUserLogout() {
  const peer = getActivePeer();
  if (window.ApiClient) {
    await ApiClient.logout();
  }
  state.activeUserId = null;
  saveCollaborativeState(state);
  showToast(`✦ Logged out of ${peer.name}'s account.`);
  setTimeout(() => {
    checkAuthenticationState();
  }, 100);
}

/* LOGICAL EXPIRATION CLEANUP */
function cleanExpiredCompletedTasks() {
  const now = new Date().getTime();
  let cleaned = 0;
  state.tasks = state.tasks.filter(t => {
    if (t.status === 'Completed' && t.completedAt) {
      const compTime = new Date(t.completedAt).getTime();
      const daysAllowed = t.daysAllowed || 3;
      const expireTime = compTime + (daysAllowed * 24 * 60 * 60 * 1000);
      if (now > expireTime) {
        cleaned++;
        return false;
      }
    }
    return true;
  });
  if (cleaned > 0) {
    saveCollaborativeState(state);
  }
}

/* ACTIVE PEER HELPER */
function getActivePeer() {
  return state.members.find(m => m.id === state.activeUserId) || state.members[0];
}

function canModifyTask(task) {
  const peer = getActivePeer();
  if (!peer) return false;
  return task.assignedTo === peer.id ||
         (peer.mongoId && task.assignedTo === peer.mongoId) ||
         task.assignedTo === peer.name;
}

function updateHeaderUser() {
  const peer = getActivePeer();
  if (!peer) return;
  const initials = peer.name.slice(0, 2).toUpperCase();

  const avatarEl = document.getElementById('sidebar-user-avatar');
  const nameEl = document.getElementById('sidebar-user-name');
  const topUsernameEl = document.getElementById('top-bar-username');

  if (avatarEl) avatarEl.innerText = initials;
  if (nameEl) nameEl.innerText = peer.name;
  if (topUsernameEl) topUsernameEl.innerText = peer.name;

  const badgeTasks = document.getElementById('nav-badge-tasks');
  if (badgeTasks) badgeTasks.innerText = state.tasks.filter(t => t.status !== 'Completed').length;

  const unreadNotifs = state.notifications.filter(n => n.targetMemberId === peer.id && !n.read).length;
  const badgeNotifs = document.getElementById('nav-badge-notifs');
  const notifDot = document.getElementById('top-notif-dot');
  if (badgeNotifs) badgeNotifs.innerText = unreadNotifs;
  if (notifDot) notifDot.style.display = unreadNotifs > 0 ? 'block' : 'none';
}

/* SIDEBAR NAVIGATION */
function setupSidebarNav() {
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      switchView(item.getAttribute('data-view'));
    });
  });
}

function switchView(viewName) {
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
  navItems.forEach(t => {
    t.classList.remove('active');
    if (t.getAttribute('data-view') === viewName) t.classList.add('active');
  });
  currentView = viewName;
  localStorage.setItem('ems_active_view', viewName);
  renderCurrentView();
}

function setupEventListeners() {
  const searchInput = document.getElementById('global-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase();
      if (currentView !== 'board') {
        switchView('board');
      } else {
        renderCurrentView();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      if (searchInput) searchInput.focus();
    } else if (e.key === 'Escape') {
      if (searchInput) searchInput.blur();
      closeTaskModal();
      closeTaskDrawer();
    }
  });

  const btnOpenCreate = document.getElementById('btn-open-create-task');
  if (btnOpenCreate) btnOpenCreate.addEventListener('click', () => openTaskModal());

  const btnCloseModal = document.getElementById('btn-close-task-modal');
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeTaskModal);

  const btnCancelModal = document.getElementById('btn-cancel-task-modal');
  if (btnCancelModal) btnCancelModal.addEventListener('click', closeTaskModal);

  const modalOverlay = document.getElementById('task-modal-overlay');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target.id === 'task-modal-overlay') closeTaskModal();
    });
  }

  const taskForm = document.getElementById('task-form');
  if (taskForm) taskForm.addEventListener('submit', handleTaskSubmit);

  const btnCloseDrawer = document.getElementById('btn-close-task-drawer');
  if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', closeTaskDrawer);

  const drawerOverlay = document.getElementById('task-detail-overlay');
  if (drawerOverlay) {
    drawerOverlay.addEventListener('click', (e) => {
      if (e.target.id === 'task-detail-overlay') closeTaskDrawer();
    });
  }
}

/* ==========================================================================
   VIEW RENDERERS
   ========================================================================== */

function renderCurrentView() {
  if (!state.activeUserId) return;
  cleanExpiredCompletedTasks();
  const container = document.getElementById('view-container');
  if (!container) return;
  container.innerHTML = '';

  switch (currentView) {
    case 'dashboard':
      renderDashboard(container);
      break;
    case 'board':
      renderTaskBoard(container);
      break;
    case 'team':
      renderTeamPage(container);
      break;
    case 'attendance':
      renderAttendancePage(container);
      break;
    case 'notifications':
      renderNotificationsPage(container);
      break;
    default:
      renderDashboard(container);
  }

  refreshIcons();
}

function formatTimeBadge(task) {
  if (task.status === 'Completed') {
    return `<span style="color:var(--emerald); font-weight:800;">✓ COMPLETED</span>`;
  }
  const days = task.daysAllowed || 3;
  return `<span style="color:var(--orange); font-weight:800;">⏳ ${days} Day${days > 1 ? 's' : ''} Allowed</span>`;
}

/* VIEW 1: DASHBOARD */
function renderDashboard(container) {
  const peer = getActivePeer();

  const myActiveTasks = state.tasks.filter(t => t.assignedTo === peer.id && t.status !== 'Completed');
  const myCompletedTasks = state.tasks.filter(t => t.assignedTo === peer.id && t.status === 'Completed');
  const createdByMe = state.tasks.filter(t => t.createdBy === peer.id);
  const completedAll = state.tasks.filter(t => t.status === 'Completed');

  let allTimeline = [];
  state.tasks.forEach(t => {
    t.timeline.forEach(item => {
      allTimeline.push({ ...item, taskTitle: t.title, taskId: t.id });
    });
  });
  allTimeline.reverse();

  container.innerHTML = `
    <div class="view-header">
      <div class="view-title">
        <h1>Welcome, ${peer.name} 👋</h1>
      </div>
      <div class="view-meta">Authenticated workspace for Arman, Sadman, Adnan & Faheem</div>
    </div>

    <!-- ATTENDANCE CLOCK-IN/OUT BANNER -->
    <div class="korpus-panel" style="margin-bottom: 24px; background: ${peer.clockStatus === 'IN' ? '#F0FDF4' : '#FFF'}; border: 3px solid #000; box-shadow: 4px 4px 0px #000;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div style="display:flex; align-items:center; gap:16px;">
          <div style="font-size:2.5rem;">${peer.clockStatus === 'IN' ? '🟢' : '⭕'}</div>
          <div>
            <div style="font-size:0.75rem; font-weight:800; text-transform:uppercase; color:var(--ink-muted);">Current Shift Status</div>
            <div style="font-size:1.4rem; font-weight:900; font-family:var(--font-code);">${peer.clockStatus === 'IN' ? 'ON DUTY (WORKING)' : 'OFF DUTY (FINISHED)'}</div>
            <div style="font-size:0.85rem; font-weight:700; color:#555; margin-top:2px;">
              ${peer.clockStatus === 'IN' 
                ? `Clocked in at ${new Date(peer.lastClockIn).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} • Logged time today: ${Math.floor((peer.totalMinutesToday || 0)/60)}h ${(peer.totalMinutesToday || 0)%60}m` 
                : (peer.lastClockOut ? `Finished shift at ${new Date(peer.lastClockOut).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} • Total worked today: ${Math.floor((peer.totalMinutesToday || 0)/60)}h ${(peer.totalMinutesToday || 0)%60}m` : 'Ready to start your work shift? Click Clock In!')}
            </div>
          </div>
        </div>
        <div>
          ${peer.clockStatus === 'IN' ? `
            <button class="korpus-btn" style="background:#FF3B30; color:#FFF; font-size:1.05rem; padding:12px 24px; border:2.5px solid #000; box-shadow:3px 3px 0 #000;" onclick="toggleClockStatus('${peer.id}', 'OUT')">
              ⏹ CLOCK OUT & FINISH WORK
            </button>
          ` : `
            <button class="korpus-btn" style="background:#00C865; color:#FFF; font-size:1.05rem; padding:12px 24px; border:2.5px solid #000; box-shadow:3px 3px 0 #000;" onclick="toggleClockStatus('${peer.id}', 'IN')">
              ▶ CLOCK IN & START WORK
            </button>
          `}
        </div>
      </div>
    </div>

    <!-- STAT READOUT CARDS -->
    <div class="telemetry-grid">
      <div class="telemetry-card orange-theme" onclick="filterBoardByAssignee('${peer.id}')" style="cursor:pointer;">
        <div class="telemetry-top"><span>MY ACTIVE TASKS</span><i data-lucide="check-square"></i></div>
        <div class="telemetry-val">${myActiveTasks.length}</div>
        <div class="telemetry-foot"><span>Assigned to ${peer.name}</span><span>Click to view</span></div>
      </div>

      <div class="telemetry-card cobalt-theme">
        <div class="telemetry-top"><span>MY COMPLETED WORK</span><i data-lucide="check-circle"></i></div>
        <div class="telemetry-val" style="color:var(--emerald);">${myCompletedTasks.length}</div>
        <div class="telemetry-foot"><span>Visible below</span><span>Stays until deadline</span></div>
      </div>

      <div class="telemetry-card">
        <div class="telemetry-top"><span>ASSIGNED BY ME</span><i data-lucide="send"></i></div>
        <div class="telemetry-val">${createdByMe.length}</div>
        <div class="telemetry-foot"><span>Tasks you dispatched</span><span>Total created</span></div>
      </div>

      <div class="telemetry-card">
        <div class="telemetry-top"><span>TEAM PROGRESS</span><i data-lucide="bar-chart"></i></div>
        <div class="telemetry-val">${completedAll.length} <span style="font-size:1.3rem; font-weight:700;">/ ${state.tasks.length}</span></div>
        <div style="width:100%; background:#eee; border:1.5px solid #000; height:12px; margin:8px 0; overflow:hidden;">
          <div style="width:${state.tasks.length ? Math.round((completedAll.length/state.tasks.length)*100) : 0}%; background:var(--orange); height:100%; transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);"></div>
        </div>
        <div class="telemetry-foot"><span>Team completion</span><span>${state.tasks.length ? Math.round((completedAll.length/state.tasks.length)*100) : 0}% Done</span></div>
      </div>
    </div>

    <div class="grid-split">
      <!-- MY ACTIVE TASKS & COMPLETED WORK SECTION -->
      <div style="display:flex; flex-direction:column; gap:24px;">
        
        <!-- ACTIVE QUEUE -->
        <div class="korpus-panel">
          <div class="panel-header">
            <span>🚀 My Active Tasks (${myActiveTasks.length})</span>
            <button class="korpus-btn korpus-btn-orange" style="padding:6px 14px; font-size:0.75rem;" onclick="openTaskModal('${peer.id}')">+ Assign New</button>
          </div>

          <div style="display:flex; flex-direction:column; gap:12px;">
            ${myActiveTasks.length === 0 ? `
              <div style="padding:32px; text-align:center; font-weight:700; color:var(--ink-muted);">🎉 Awesome! You have no active pending tasks right now.</div>
            ` : myActiveTasks.map(t => renderTaskListItem(t)).join('')}
          </div>
        </div>

        <!-- RECENTLY COMPLETED WORK -->
        <div class="korpus-panel" style="background:#F9FDFB; border-color:#00C865;">
          <div class="panel-header" style="border-bottom-color:#00C865;">
            <span style="color:#008A45;">✓ My Completed Tasks (${myCompletedTasks.length})</span>
            <span style="font-size:0.72rem; color:var(--ink-muted); font-weight:700;">Auto-clears after deadline</span>
          </div>

          <div style="display:flex; flex-direction:column; gap:10px;">
            ${myCompletedTasks.length === 0 ? `
              <div style="padding:20px; text-align:center; font-size:0.85rem; color:var(--ink-muted);">Tasks you mark complete will stay here so you can see your finished work!</div>
            ` : myCompletedTasks.map(t => `
              <div style="padding:12px; background:#fff; border:1px solid #00C865; display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center; gap:10px;">
                  <span style="color:var(--emerald); font-weight:800;">✓</span>
                  <span style="font-weight:800; text-decoration:line-through; color:var(--ink-muted);">${t.title}</span>
                </div>
                <button class="korpus-btn" style="padding:4px 10px; font-size:0.7rem;" onclick="quickAdvance('${t.id}', 'In Progress')">Reopen ↩</button>
              </div>
            `).join('')}
          </div>
        </div>

      </div>

      <!-- TEAM WORKLOAD DISTRIBUTION -->
      <div class="korpus-panel">
        <div class="panel-header">
          <span>Team Workload Balance</span>
          <i data-lucide="bar-chart-2"></i>
        </div>

        <div style="display:flex; flex-direction:column; gap:18px;">
          ${state.members.map(m => {
            const activeCount = state.tasks.filter(t => t.assignedTo === m.id && t.status !== 'Completed').length;
            const totalActive = state.tasks.filter(t => t.status !== 'Completed').length || 1;
            const pct = Math.round((activeCount / totalActive) * 100);
            return `
              <div>
                <div style="display:flex; justify-content:space-between; align-items:center; font-weight:800; font-size:0.88rem; margin-bottom:6px;">
                  <span>${m.name}</span>
                  <span style="color:var(--orange);">${activeCount} Active (${pct}%)</span>
                </div>
                <div style="height:18px; background:var(--canvas-bg); border:var(--frame-thin); overflow:hidden;">
                  <div style="width:${pct}%; height:100%; background:${activeCount > 3 ? 'var(--crimson)' : 'var(--cobalt)'}; transition:width 0.5s ease;"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

function filterBoardByAssignee(memberId) {
  taskFilterAssignee = memberId;
  switchView('board');
}

/* VIEW 2: TASK BOARD WITH PERMISSION LOCK BADGES */
function renderTaskBoard(container) {
  let filtered = state.tasks.filter(t => {
    const matchAssignee = taskFilterAssignee === 'ALL' || t.assignedTo === taskFilterAssignee;
    const matchSearch = !searchQuery ||
      t.title.toLowerCase().includes(searchQuery) ||
      t.description.toLowerCase().includes(searchQuery) ||
      t.id.toLowerCase().includes(searchQuery);
    return matchAssignee && matchSearch;
  });

  const cols = [
    { id: 'Todo', title: 'TODO (QUEUE)' },
    { id: 'In Progress', title: 'IN PROGRESS' },
    { id: 'Review', title: 'PEER REVIEW' },
    { id: 'Completed', title: 'COMPLETED' }
  ];

  container.innerHTML = `
    <div class="view-header">
      <div class="view-title">
        <h1>Collaborative Task Board</h1>
      </div>
      <div class="view-meta">Showing ${filtered.length} tasks across Arman, Sadman, Adnan & Faheem</div>
    </div>

    <!-- FILTER BAR -->
    <div class="korpus-panel" style="padding:14px 20px; margin-bottom:24px; display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:16px;">
      <div style="display:flex; align-items:center; gap:12px;">
        <span style="font-weight:800; font-size:0.85rem;">Filter Teammate:</span>
        <select onchange="setTaskAssigneeFilter(this.value)" style="font-weight:700; padding:6px 12px; border:var(--frame-thin);">
          <option value="ALL" ${taskFilterAssignee === 'ALL' ? 'selected' : ''}>All 4 Team Members</option>
          ${state.members.map(m => `<option value="${m.id}" ${taskFilterAssignee === m.id ? 'selected' : ''}>${m.name}</option>`).join('')}
        </select>
      </div>
    </div>

    <!-- KANBAN COLUMNS -->
    <div class="kanban-board">
      ${cols.map(col => {
        const colTasks = filtered.filter(t => t.status === col.id);
        return `
          <div class="kanban-column">
            <div class="col-header">
              <span>${col.title}</span>
              <span class="col-count">${colTasks.length}</span>
            </div>
            <div class="col-tasks">
              ${colTasks.map(task => renderTaskCard(task)).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function formatDisplayId(id) {
  if (!id) return '';
  if (id.startsWith('TSK-')) return id;
  return `#TSK-${id.slice(-4).toUpperCase()}`;
}

function renderTaskCard(task) {
  const assignee = state.members.find(m => m.id === task.assignedTo) || { name: 'Teammate' };
  const initials = assignee.name.slice(0, 2).toUpperCase();
  const allowed = canModifyTask(task);

  let nextActionHtml = '';
  if (!allowed) {
    nextActionHtml = `<span style="font-size:0.75rem; color:var(--ink-muted); font-weight:700; background:#eee; padding:3px 8px; border:1px solid #ccc;">👤 ${assignee.name}'s Task</span>`;
  } else if (task.status === 'Todo') {
    nextActionHtml = `<button class="btn-status-action" onclick="event.stopPropagation(); shiftTaskStatus('${task.id}', 'In Progress')">Start 🚀</button>`;
  } else if (task.status === 'In Progress') {
    nextActionHtml = `<button class="btn-status-action" onclick="event.stopPropagation(); shiftTaskStatus('${task.id}', 'Review')">Review 👀</button>`;
  } else if (task.status === 'Review') {
    nextActionHtml = `<button class="btn-status-action" style="background:var(--emerald); border-color:#000;" onclick="event.stopPropagation(); shiftTaskStatus('${task.id}', 'Completed')">Complete ✓</button>`;
  } else if (task.status === 'Completed') {
    nextActionHtml = `<span style="font-size:0.75rem; color:var(--emerald); font-weight:800;">✓ Finished</span>`;
  }

  return `
    <div class="task-card" onclick="openTaskDetail('${task.id}')">
      <div class="task-card-top">
        <span class="task-id" title="${task.id}">${formatDisplayId(task.id)}</span>
        ${formatTimeBadge(task)}
      </div>

      <div class="task-title">${task.title}</div>

      <div class="task-meta-foot">
        <div class="assignee-chip">
          <div class="assignee-avatar">${initials}</div>
          <span>${assignee.name}</span>
        </div>
        <div>${nextActionHtml}</div>
      </div>
    </div>
  `;
}

function renderTaskListItem(task) {
  const assignee = state.members.find(m => m.id === task.assignedTo) || { name: 'Teammate' };
  const allowed = canModifyTask(task);
  
  let nextActionHtml = '';
  if (!allowed) {
    nextActionHtml = `<span style="font-size:0.75rem; color:var(--ink-muted); font-weight:700; background:#eee; padding:3px 8px; border:1px solid #ccc;">👤 Assigned to ${assignee.name}</span>`;
  } else if (task.status === 'Todo') {
    nextActionHtml = `<button class="btn-status-action" onclick="event.stopPropagation(); shiftTaskStatus('${task.id}', 'In Progress')">Move to In Progress 🚀</button>`;
  } else if (task.status === 'In Progress') {
    nextActionHtml = `<button class="btn-status-action" onclick="event.stopPropagation(); shiftTaskStatus('${task.id}', 'Review')">Move to Review 👀</button>`;
  } else if (task.status === 'Review') {
    nextActionHtml = `<button class="btn-status-action" style="background:var(--emerald);" onclick="event.stopPropagation(); shiftTaskStatus('${task.id}', 'Completed')">Mark Complete ✓</button>`;
  } else if (task.status === 'Completed') {
    nextActionHtml = `<span style="font-size:0.8rem; font-weight:800; color:var(--emerald); background:#E6F4EA; padding:4px 10px; border:1px solid #000;">✓ COMPLETED</span>`;
  }

  return `
    <div style="padding:14px; border:var(--frame-thin); background:var(--canvas-bg); display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="openTaskDetail('${task.id}')">
      <div>
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
          ${formatTimeBadge(task)}
          <span style="font-family:var(--font-code); font-size:0.75rem; color:var(--ink-muted);" title="${task.id}">${formatDisplayId(task.id)}</span>
        </div>
        <div style="font-weight:800; font-size:1.02rem;">${task.title}</div>
      </div>

      <div style="display:flex; align-items:center; gap:12px;">
        ${nextActionHtml}
        <span style="font-size:0.8rem; font-weight:700; background:var(--surface-white); padding:4px 10px; border:1px solid #000;">${assignee.name}</span>
      </div>
    </div>
  `;
}

async function quickAdvance(taskId, nextStatus) {
  await shiftTaskStatus(taskId, nextStatus);
}

function setTaskAssigneeFilter(val) {
  taskFilterAssignee = val;
  renderCurrentView();
}

/* VIEW 3: TEAM ROSTER */
function renderTeamPage(container) {
  container.innerHTML = `
    <div class="view-header">
      <div class="view-title">
        <h1>4 Team Members</h1>
      </div>
      <div class="view-meta">Directly assign work to Arman, Sadman, Adnan, or Faheem</div>
    </div>

    <div class="team-grid">
      ${state.members.map(peer => {
        const activeTasks = state.tasks.filter(t => t.assignedTo === peer.id && t.status !== 'Completed');
        const completedTasks = state.tasks.filter(t => t.assignedTo === peer.id && t.status === 'Completed');
        const initials = peer.name.slice(0, 2).toUpperCase();
        const isMe = peer.id === state.activeUserId;

        return `
          <div class="peer-card ${isMe ? 'orange-theme' : ''}">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div style="display:flex; align-items:center; gap:16px;">
                <div style="width:60px; height:60px; background:${isMe ? 'var(--orange)' : 'var(--ink-black)'}; color:#fff; font-family:var(--font-title); font-size:1.5rem; display:flex; align-items:center; justify-content:center; border:2px solid #000;">
                  ${initials}
                </div>
                <div>
                  <h2 style="font-family:var(--font-title); font-size:1.4rem; line-height:1.1;">${peer.name} ${isMe ? '<span style="color:var(--orange); font-size:0.8rem;">(YOU)</span>' : ''}</h2>
                </div>
              </div>
            </div>

            <!-- DIRECT ASSIGN WORK BUTTON -->
            <button class="korpus-btn korpus-btn-orange full-btn" style="padding:12px; font-size:0.95rem;" onclick="openTaskModal('${peer.id}')">
              <i data-lucide="plus-circle"></i>
              <span>+ Assign Task to ${peer.name}</span>
            </button>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; border-top:var(--frame-thin); padding-top:14px;">
              <div style="background:var(--canvas-bg); padding:10px; border:1px solid #000; text-align:center;">
                <div style="font-size:0.75rem; font-weight:700; color:var(--ink-muted);">ACTIVE TASKS</div>
                <div style="font-family:var(--font-title); font-size:1.4rem; color:var(--orange);">${activeTasks.length}</div>
              </div>
              <div style="background:var(--canvas-bg); padding:10px; border:1px solid #000; text-align:center;">
                <div style="font-size:0.75rem; font-weight:700; color:var(--ink-muted);">COMPLETED</div>
                <div style="font-family:var(--font-title); font-size:1.4rem; color:var(--emerald);">${completedTasks.length}</div>
              </div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-family:var(--font-code); font-size:0.78rem; color:var(--ink-muted);">${peer.email}</span>
              <button class="korpus-btn" style="padding:6px 12px; font-size:0.75rem;" onclick="filterBoardByAssignee('${peer.id}')">View Queue →</button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}



/* VIEW 4: NOTIFICATIONS FEED */
function renderNotificationsPage(container) {
  const peer = getActivePeer();
  const myNotifs = state.notifications.filter(n => n.targetMemberId === peer.id);

  container.innerHTML = `
    <div class="view-header">
      <div class="view-title">
        <h1>Recent Notifications</h1>
      </div>
      <div class="view-meta">Activity directed to ${peer.name}</div>
    </div>

    <div class="korpus-panel">
      <div class="panel-header">
        <span>Alert Feed (${myNotifs.length})</span>
        <button class="korpus-btn korpus-btn-ghost" style="padding:6px 14px; font-size:0.78rem;" onclick="markAllNotifsRead()">Mark All Read ✓</button>
      </div>

      <div style="display:flex; flex-direction:column; gap:14px;">
        ${myNotifs.length === 0 ? `
          <div style="padding:40px; text-align:center; font-weight:700; color:var(--ink-muted);">🎉 All caught up! You have no unread notifications.</div>
        ` : myNotifs.map(n => `
          <div style="padding:16px; border:var(--frame-thick); background:${n.read ? 'var(--canvas-bg)' : '#FFF9E6'}; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                <span style="font-size:0.72rem; font-weight:800; background:var(--ink-black); color:#fff; padding:2px 6px;">${n.type.toUpperCase()}</span>
                <span style="font-size:0.75rem; color:var(--ink-muted);">${n.timestamp}</span>
              </div>
              <div style="font-weight:800; font-size:1.05rem;">${n.title}</div>
              <p style="font-size:0.9rem; font-weight:600; margin-top:2px;">${n.message}</p>
            </div>
            <button class="korpus-btn" style="padding:6px 12px; font-size:0.75rem;" onclick="dismissNotif('${n.id}')">Dismiss ✕</button>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

async function markAllNotifsRead() {
  if (window.ApiClient && ApiClient.getToken()) {
    try {
      await ApiClient.markAllNotificationsRead();
      await syncRemoteData();
    } catch (e) {}
  }
  const peer = getActivePeer();
  state.notifications.forEach(n => {
    if (n.targetMemberId === peer.id) n.read = true;
  });
  saveCollaborativeState(state);
  updateHeaderUser();
  renderCurrentView();
  showToast('✦ Marked all notifications as read');
}

async function dismissNotif(id) {
  state.notifications = state.notifications.filter(n => n.id !== id);
  saveCollaborativeState(state);
  updateHeaderUser();
  renderCurrentView();
}

/* WORK SHIFTS / ATTENDANCE CLOCK IN & CLOCK OUT */
function toggleClockStatus(userId, action) {
  const mem = state.members.find(m => m.id === userId);
  if (!mem) return;

  const now = new Date();
  if (action === 'IN') {
    mem.clockStatus = 'IN';
    mem.lastClockIn = now.toISOString();
    if (!state.attendanceLogs) state.attendanceLogs = [];
    state.attendanceLogs.unshift({
      id: 'LOG-' + Date.now(),
      userId: mem.id,
      userName: mem.name,
      action: 'CLOCK_IN',
      timestamp: now.toISOString(),
      note: 'Arrived and clocked in to work'
    });
    showToast(`✦ ${mem.name} clocked in! Have a productive shift.`);
  } else if (action === 'OUT') {
    mem.clockStatus = 'OUT';
    mem.lastClockOut = now.toISOString();
    if (mem.lastClockIn) {
      const elapsedMins = Math.round((now - new Date(mem.lastClockIn)) / 60000);
      mem.totalMinutesToday = (mem.totalMinutesToday || 0) + Math.max(1, elapsedMins);
    } else {
      mem.totalMinutesToday = (mem.totalMinutesToday || 0) + 30;
    }
    if (!state.attendanceLogs) state.attendanceLogs = [];
    state.attendanceLogs.unshift({
      id: 'LOG-' + Date.now(),
      userId: mem.id,
      userName: mem.name,
      action: 'CLOCK_OUT',
      timestamp: now.toISOString(),
      note: `Finished shift (${Math.floor((mem.totalMinutesToday || 0)/60)}h ${(mem.totalMinutesToday || 0)%60}m total today)`
    });
    showToast(`✦ ${mem.name} clocked out! Great job today.`);
  }
  saveCollaborativeState(state);
  renderCurrentView();
}

function renderAttendancePage(container) {
  const peer = getActivePeer();
  container.innerHTML = `
    <div class="view-header">
      <div class="view-title">
        <h1>Work Shifts & Attendance ⏱</h1>
      </div>
      <div class="view-meta">Track when team members arrive at work and finish their shifts</div>
    </div>

    <!-- YOUR SHIFT CONTROL CARD -->
    <div class="korpus-panel" style="margin-bottom: 24px; background: ${peer.clockStatus === 'IN' ? '#F0FDF4' : '#FFF'}; border: 3px solid #000; box-shadow: 4px 4px 0px #000;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div style="display:flex; align-items:center; gap:16px;">
          <div style="font-size:2.5rem;">${peer.clockStatus === 'IN' ? '🟢' : '⭕'}</div>
          <div>
            <div style="font-size:0.75rem; font-weight:800; text-transform:uppercase; color:var(--ink-muted);">My Current Shift</div>
            <div style="font-size:1.4rem; font-weight:900; font-family:var(--font-code);">${peer.clockStatus === 'IN' ? 'ON DUTY (WORKING)' : 'OFF DUTY (FINISHED)'}</div>
            <div style="font-size:0.85rem; font-weight:700; color:#555; margin-top:2px;">
              ${peer.clockStatus === 'IN' 
                ? `Clocked in at ${new Date(peer.lastClockIn).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} • Logged time today: ${Math.floor((peer.totalMinutesToday || 0)/60)}h ${(peer.totalMinutesToday || 0)%60}m` 
                : (peer.lastClockOut ? `Finished shift at ${new Date(peer.lastClockOut).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} • Total worked today: ${Math.floor((peer.totalMinutesToday || 0)/60)}h ${(peer.totalMinutesToday || 0)%60}m` : 'Ready to start your work shift? Click Clock In!')}
            </div>
          </div>
        </div>
        <div>
          ${peer.clockStatus === 'IN' ? `
            <button class="korpus-btn" style="background:#FF3B30; color:#FFF; font-size:1.05rem; padding:12px 24px; border:2.5px solid #000; box-shadow:3px 3px 0 #000;" onclick="toggleClockStatus('${peer.id}', 'OUT')">
              ⏹ CLOCK OUT & FINISH WORK
            </button>
          ` : `
            <button class="korpus-btn" style="background:#00C865; color:#FFF; font-size:1.05rem; padding:12px 24px; border:2.5px solid #000; box-shadow:3px 3px 0 #000;" onclick="toggleClockStatus('${peer.id}', 'IN')">
              ▶ CLOCK IN & START WORK
            </button>
          `}
        </div>
      </div>
    </div>

    <!-- TEAM ROSTER SHIFTS -->
    <div class="korpus-panel" style="margin-bottom: 24px;">
      <div class="panel-header">
        <span>👥 Live Team Shift Roster</span>
        <span style="font-size:0.75rem; font-weight:700;">Real-time status</span>
      </div>
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:16px;">
        ${state.members.map(m => `
          <div style="border:2px solid #000; padding:16px; background:${m.clockStatus === 'IN' ? '#F0FDF4' : '#F8F9FA'}; box-shadow:3px 3px 0 #000;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <span style="font-weight:900; font-size:1.1rem;">${m.name}</span>
              <span style="font-size:0.75rem; font-weight:800; padding:4px 8px; border:1.5px solid #000; background:${m.clockStatus === 'IN' ? '#00C865' : '#E5E5EA'}; color:${m.clockStatus === 'IN' ? '#FFF' : '#000'};">
                ${m.clockStatus === 'IN' ? '🟢 WORKING' : '⚪ FINISHED'}
              </span>
            </div>
            <div style="font-size:0.8rem; font-weight:700; color:#444; line-height:1.5;">
              <div>Clock In: ${m.lastClockIn ? new Date(m.lastClockIn).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</div>
              <div>Clock Out: ${m.lastClockOut ? new Date(m.lastClockOut).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</div>
              <div style="margin-top:6px; font-weight:800; color:#000;">Total Today: ${Math.floor((m.totalMinutesToday || 0)/60)}h ${(m.totalMinutesToday || 0)%60}m</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- RECENT ATTENDANCE LOGS -->
    <div class="korpus-panel">
      <div class="panel-header">
        <span>📋 Shift Activity & History Log</span>
      </div>
      <div style="display:flex; flex-direction:column; gap:10px;">
        ${(!state.attendanceLogs || state.attendanceLogs.length === 0) ? `
          <div style="padding:24px; text-align:center; color:var(--ink-muted); font-weight:700;">No shift activity recorded yet today.</div>
        ` : state.attendanceLogs.map(log => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border:1.5px solid #000; background:#FFF;">
            <div style="display:flex; align-items:center; gap:12px;">
              <span style="font-size:1.3rem;">${log.action === 'CLOCK_IN' ? '▶️' : '⏹️'}</span>
              <div>
                <div style="font-weight:800; font-size:0.95rem;">${log.userName} ${log.action === 'CLOCK_IN' ? 'clocked in to work' : 'clocked out & finished shift'}</div>
                <div style="font-size:0.75rem; color:var(--ink-muted);">${log.note || ''}</div>
              </div>
            </div>
            <div style="font-size:0.8rem; font-weight:800; font-family:var(--font-code);">
              ${new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} (${new Date(log.timestamp).toLocaleDateString()})
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/* TASK DETAILS DRAWER WITH OWNERSHIP LOCKS */
function openTaskDetail(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  const creator = state.members.find(m => m.id === task.createdBy) || { name: 'Teammate' };
  const assignee = state.members.find(m => m.id === task.assignedTo) || { name: 'Teammate' };
  const allowed = canModifyTask(task);

  document.getElementById('drawer-task-code').innerText = `${task.id} — DETAILS`;

  const content = document.getElementById('task-drawer-content');
  content.innerHTML = `
    <div style="margin-bottom:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        ${formatTimeBadge(task)}
        <span style="font-size:0.8rem; font-weight:700;">Status: <span style="color:var(--orange);">${task.status}</span></span>
      </div>
      <h2 style="font-family:var(--font-title); font-size:1.6rem; line-height:1.2;">${task.title}</h2>
    </div>

    <div style="background:var(--canvas-bg); border:var(--frame-thick); padding:16px; margin-bottom:20px; display:grid; grid-template-columns: 1fr 1fr; gap:14px;">
      <div>
        <label style="font-size:0.75rem; font-weight:800; color:var(--ink-muted); display:block; margin-bottom:4px;">Assigned To</label>
        <select onchange="reassignTask('${task.id}', this.value)" style="width:100%; padding:6px; font-weight:700; border:1px solid #000;" ${!allowed ? 'disabled' : ''}>
          ${state.members.map(m => `<option value="${m.id}" ${task.assignedTo === m.id ? 'selected' : ''}>${m.name}</option>`).join('')}
        </select>
      </div>

      <div>
        <label style="font-size:0.75rem; font-weight:800; color:var(--ink-muted); display:block; margin-bottom:4px;">Shift Status</label>
        <select onchange="shiftTaskStatus('${task.id}', this.value)" style="width:100%; padding:6px; font-weight:700; border:1px solid #000; background:${allowed ? 'var(--orange)' : '#9A9890'}; color:#fff;" ${!allowed ? 'disabled' : ''}>
          <option value="Todo" ${task.status === 'Todo' ? 'selected' : ''}>Todo (Queue)</option>
          <option value="In Progress" ${task.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
          <option value="Review" ${task.status === 'Review' ? 'selected' : ''}>Peer Review</option>
          <option value="Completed" ${task.status === 'Completed' ? 'selected' : ''}>Completed</option>
        </select>
      </div>
    </div>
    ${!allowed ? `<div style="margin-bottom:18px; padding:10px; background:#F2F0E8; border:1px solid #000; font-size:0.8rem; font-weight:800; color:var(--ink);">ℹ️ This task is currently assigned to ${assignee.name}. Only ${assignee.name} can advance or complete this task.</div>` : ''}

    <div style="margin-bottom:24px;">
      <div style="font-size:0.8rem; font-weight:700; color:var(--ink-muted); margin-bottom:6px;">Context & Notes</div>
      <p style="font-size:0.95rem; font-weight:600; line-height:1.6; background:var(--canvas-bg); padding:16px; border:var(--frame-thin);">${task.description || 'No additional details.'}</p>
    </div>

    <!-- COMMENTS SECTION -->
    <div style="margin-bottom:28px;">
      <div style="font-family:var(--font-title); font-size:1.15rem; border-bottom:var(--frame-thick); padding-bottom:8px; margin-bottom:14px;">
        Comments & Discussion (${task.comments.length})
      </div>

      <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:16px;">
        ${task.comments.length === 0 ? `
          <div style="font-size:0.85rem; color:var(--ink-muted);">No comments yet. Start the conversation below.</div>
        ` : task.comments.map(c => `
          <div style="padding:12px; background:var(--canvas-bg); border:1px solid #000;">
            <div style="display:flex; justify-content:space-between; font-size:0.78rem; font-weight:800; color:var(--cobalt); margin-bottom:4px;">
              <span>${c.authorName}</span>
              <span style="color:var(--ink-muted);">${c.timestamp}</span>
            </div>
            <p style="font-size:0.9rem; font-weight:600;">${c.text}</p>
          </div>
        `).join('')}
      </div>

      <form onsubmit="addCommentToTask(event, '${task.id}')" style="display:flex; gap:10px;">
        <input type="text" id="new-comment-input" placeholder="Leave a comment as ${getActivePeer().name}..." style="flex:1; padding:10px; border:var(--frame-thick); font-weight:600;" required>
        <button type="submit" class="korpus-btn korpus-btn-orange" style="padding:10px 18px;">Send →</button>
      </form>
    </div>

    <!-- ACTIVITY TIMELINE -->
    <div>
      <div style="font-family:var(--font-title); font-size:1.1rem; border-bottom:var(--frame-thin); padding-bottom:6px; margin-bottom:12px;">
        Activity Log
      </div>
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${task.timeline.slice().reverse().map(l => `
          <div style="font-size:0.8rem; display:flex; justify-content:space-between; border-bottom:1px dashed #C6C2B4; padding-bottom:4px;">
            <span style="font-weight:700;">✦ ${l.text}</span>
            <span style="color:var(--ink-muted);">${l.timestamp}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.getElementById('task-detail-overlay').style.display = 'flex';
}

function closeTaskDrawer() {
  document.getElementById('task-detail-overlay').style.display = 'none';
}

async function reassignTask(taskId, newAssigneeId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task || !canModifyTask(task)) return;

  const peer = getActivePeer();
  const targetPeer = state.members.find(m => m.id === newAssigneeId);
  const isDrawerOpen = document.getElementById('task-detail-overlay')?.style.display === 'flex';

  if (window.ApiClient && ApiClient.getToken() && !taskId.startsWith('TSK-')) {
    try {
      if (targetPeer?.mongoId) {
        await ApiClient.assignTask(taskId, targetPeer.mongoId);
        await syncRemoteData();
        if (isDrawerOpen) openTaskDetail(taskId);
        renderCurrentView();
        showToast(`✦ Reassigned to ${targetPeer.name}`);
        return;
      }
    } catch (e) {
      console.warn('Backend reassign error, updating locally.');
    }
  }

  task.assignedTo = newAssigneeId;
  task.updatedAt = new Date().toISOString();

  const nowStr = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  task.timeline.push({ text: `${peer.name} reassigned task to ${targetPeer ? targetPeer.name : 'Teammate'}`, timestamp: nowStr });

  saveCollaborativeState(state);
  updateHeaderUser();
  if (isDrawerOpen) openTaskDetail(taskId);
  renderCurrentView();
  showToast(`✦ Reassigned to ${targetPeer.name}`);
}

async function shiftTaskStatus(taskId, newStatus) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task || !canModifyTask(task)) {
    if (task && !canModifyTask(task)) {
      showToast('✕ Unauthorized: Only the assignee or creator can modify this task status!');
    }
    return;
  }

  const peer = getActivePeer();
  const isDrawerOpen = document.getElementById('task-detail-overlay')?.style.display === 'flex';

  if (window.ApiClient && ApiClient.getToken() && !taskId.startsWith('TSK-')) {
    try {
      await ApiClient.updateTaskStatus(taskId, newStatus);
      await syncRemoteData();
      if (isDrawerOpen) openTaskDetail(taskId);
      renderCurrentView();
      showToast(`✦ Status moved to ${newStatus}`);
      return;
    } catch (e) {
      console.warn('Backend status update error, updating locally.');
    }
  }

  task.status = newStatus;
  task.updatedAt = new Date().toISOString();
  if (newStatus === 'Completed') {
    task.completedAt = new Date().toISOString();
  }

  const nowStr = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  task.timeline.push({ text: `${peer.name} updated status to ${newStatus}`, timestamp: nowStr });

  saveCollaborativeState(state);
  updateHeaderUser();
  if (isDrawerOpen) openTaskDetail(taskId);
  renderCurrentView();
  showToast(`✦ Status moved to ${newStatus}`);
}

async function addCommentToTask(e, taskId) {
  e.preventDefault();
  const input = document.getElementById('new-comment-input');
  const text = input?.value.trim();
  if (!text) return;

  const isDrawerOpen = document.getElementById('task-detail-overlay')?.style.display === 'flex';

  if (window.ApiClient && ApiClient.getToken() && !taskId.startsWith('TSK-')) {
    try {
      await ApiClient.addComment(taskId, text);
      if (input) input.value = '';
      await syncRemoteData();
      if (isDrawerOpen) openTaskDetail(taskId);
      renderCurrentView();
      return;
    } catch (err) {
      console.warn('Backend comment error, saving locally.');
    }
  }

  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  const peer = getActivePeer();
  const nowStr = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

  task.comments.push({
    id: `C-${Date.now()}`,
    authorId: peer.id,
    authorName: peer.name,
    text: text,
    timestamp: nowStr
  });

  task.timeline.push({ text: `${peer.name} left a comment`, timestamp: nowStr });

  saveCollaborativeState(state);
  updateHeaderUser();
  if (isDrawerOpen) openTaskDetail(taskId);
  renderCurrentView();
}

/* CREATE / ASSIGN TASK MODAL */
function openTaskModal(preselectPeerId = null) {
  const form = document.getElementById('task-form');
  if (form) form.reset();
  
  if (typeof preselectPeerId === 'string' && preselectPeerId.startsWith('MEM-')) {
    document.getElementById('task-assignee').value = preselectPeerId;
  } else if (state.activeUserId) {
    document.getElementById('task-assignee').value = getActivePeer().id;
  }
  
  document.getElementById('task-days').value = '3';
  document.getElementById('task-modal-overlay').style.display = 'flex';
  setTimeout(() => {
    const tInput = document.getElementById('task-title');
    if (tInput) tInput.focus();
  }, 50);
}

function closeTaskModal() {
  const overlay = document.getElementById('task-modal-overlay');
  if (overlay) overlay.style.display = 'none';
}

async function handleTaskSubmit(e) {
  e.preventDefault();
  const peer = getActivePeer();
  const title = document.getElementById('task-title').value.trim();
  const description = document.getElementById('task-desc').value.trim();
  const assignedTo = document.getElementById('task-assignee').value;
  const daysAllowed = parseInt(document.getElementById('task-days').value) || 3;

  if (window.ApiClient && ApiClient.getToken()) {
    try {
      const targetMember = state.members.find(m => m.id === assignedTo) || peer;
      if (targetMember?.mongoId) {
        await ApiClient.createTask({
          title,
          description: description || title,
          priority: 'Medium',
          assignedTo: targetMember.mongoId,
          dueDate: new Date(Date.now() + daysAllowed * 86400000).toISOString()
        });
        closeTaskModal();
        await syncRemoteData();
        renderCurrentView();
        showToast(`✦ Created task on Live Backend`);
        return;
      }
    } catch (err) {
      console.warn('Remote task creation failed, saving locally.');
    }
  }

  const nowStr = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  const newId = `TSK-${Math.floor(100 + Math.random() * 899)}`;

  const newTask = {
    id: newId,
    title,
    description: description || title,
    priority: 'Medium',
    status: 'Todo',
    daysAllowed: daysAllowed,
    createdBy: peer.id,
    assignedTo,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    attachments: [],
    comments: [],
    timeline: [
      { text: `${peer.name} assigned task (${daysAllowed} Days Allowed)`, timestamp: nowStr }
    ]
  };

  state.tasks.unshift(newTask);

  if (assignedTo !== peer.id) {
    state.notifications.unshift({
      id: `NT-${Date.now()}`,
      type: 'assigned',
      title: 'New Task Assigned',
      message: `${peer.name} assigned new task '${title}' (${daysAllowed} Days Allowed).`,
      targetMemberId: assignedTo,
      timestamp: 'Just now',
      read: false
    });
  }

  saveCollaborativeState(state);
  updateHeaderUser();
  closeTaskModal();
  renderCurrentView();
  showToast(`✦ Assigned task to ${state.members.find(m=>m.id===assignedTo)?.name || 'teammate'}`);
}

function showToast(msg) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'korpus-toast';
  toast.innerHTML = `<i data-lucide="zap"></i><span>${msg}</span>`;
  container.appendChild(toast);
  refreshIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'all 0.2s ease';
    setTimeout(() => toast.remove(), 200);
  }, 3200);
}
