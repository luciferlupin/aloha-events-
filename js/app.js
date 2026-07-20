// Aloah Events - Core Application Controller
import { DB } from './db.js';
import { generateQRCode } from './qr.js';
import { startScanner, stopScanner } from './scanner.js';

let supabase = null;

// Application State
const getInitialRole = () => {
  const user = JSON.parse(localStorage.getItem('aloah_logged_in_user')) || null;
  return user ? user.role : 'Admin';
};

const state = {
  loggedInUser: JSON.parse(localStorage.getItem('aloah_logged_in_user')) || null,
  authMode: 'login',
  activeRole: getInitialRole(),
  activeEventId: null,
  currentView: 'dashboard',
  searchQuery: '',
  categoryFilter: 'All',
  rsvpFilter: 'All',
  taskFilter: 'All',
  selectedGuestId: null,
  adminSubTab: 'general'
};

// DOM Elements Cache
const DOM = {
  viewport: document.getElementById('viewport'),
  roleBtn: document.getElementById('role-badge-btn'),
  roleLabel: document.getElementById('current-role-label'),
  roleDropdown: document.getElementById('role-dropdown'),
  eventSelector: document.getElementById('global-event-selector'),
  globalFab: document.getElementById('global-fab'),
  modalOverlay: document.getElementById('modal-overlay'),
  modalContent: document.getElementById('modal-content'),
  toastContainer: document.getElementById('toast-container'),
  navHome: document.getElementById('nav-btn-home'),
  navEvents: document.getElementById('nav-btn-events'),
  navGuests: document.getElementById('nav-btn-guests'),
  navTasks: document.getElementById('nav-btn-tasks'),
  navProfile: document.getElementById('nav-btn-profile')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  DB.init();
  initSupabase();
  setupLogin();
  setupProfileMenu();
  setupNavigation();
  setupFAB();
  setupModalDismissal();
  
  // Load view context if user is signed in
  if (state.loggedInUser) {
    syncUserSessionUI();
    updateNavigationPermissions();
    initEventSelector();
    renderView('dashboard');
  } else {
    syncUserSessionUI();
  }
  
  // Dynamic updates simulation (mimics real-time event updates)
  setInterval(simulateRealtimeUpdates, 20000);
});

// Setup the Event Context Selector in Header
function initEventSelector() {
  const events = DB.getEvents();
  const allowedEvents = getAccessibleEvents(events);
  
  DOM.eventSelector.innerHTML = allowedEvents.map((evt, idx) => 
    `<option value="${evt.id}" ${idx === 0 ? 'selected' : ''}>${evt.name}</option>`
  ).join('');

  if (allowedEvents.length > 0) {
    state.activeEventId = allowedEvents[0].id;
  }

  DOM.eventSelector.addEventListener('change', (e) => {
    state.activeEventId = e.target.value;
    showToast(`Switched context to ${e.target.options[e.target.selectedIndex].text}`);
    renderView(state.currentView);
  });
}

function getAccessibleEvents(allEvents) {
  if (state.activeRole === 'Admin') {
    return allEvents;
  }
  // Filter for assigned employee events
  const employees = DB.getEmployees();
  const currentEmp = employees.find(e => e.role === state.activeRole) || employees.find(e => e.name === 'Prabal Sharma');
  if (currentEmp) {
    return allEvents.filter(evt => evt.assignedTeam.includes(currentEmp.id));
  }
  return allEvents;
}

// Authentication & Login System
function setupLogin() {
  const loginForm = document.getElementById('login-form');
  const toggleBtn = document.getElementById('auth-toggle-btn');
  const toggleMsg = document.getElementById('auth-toggle-msg');
  const submitBtn = document.getElementById('btn-login-submit');

  function toggleAuthMode(mode) {
    state.authMode = mode;
    if (mode === 'signup') {
      submitBtn.textContent = 'Create Account';
      toggleMsg.textContent = 'Already have an account?';
      toggleBtn.textContent = 'Sign In';
    } else {
      submitBtn.textContent = 'Access Dashboard';
      toggleMsg.textContent = "Don't have an account?";
      toggleBtn.textContent = 'Sign Up';
    }
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      toggleAuthMode(state.authMode === 'login' ? 'signup' : 'login');
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const pass = document.getElementById('login-password').value;
      
      if (state.authMode === 'signup') {
        if (supabase) {
          showToast('Creating Supabase account...');
          let assignedRole = 'Event Manager';
          if (email.toLowerCase() === 'jaigoel2206@gmail.com') {
            assignedRole = 'Admin';
          }
          
          const { data, error } = await supabase.auth.signUp({
            email: email,
            password: pass,
            options: {
              data: {
                name: email.split('@')[0],
                role: assignedRole
              }
            }
          });
          
          if (error) {
            showToast(error.message, 'error');
            return;
          }
          
          showToast('Account registered! Please check email or try signing in.', 'success');
          toggleAuthMode('login');
        } else {
          showToast('Sign up is only supported on live Supabase connections.', 'error');
        }
        return;
      }

      if (supabase) {
        showToast('Signing in via Supabase...');
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: pass
        });
        
        if (error) {
          // Fallback: Check if employee was registered locally by Admin
          const employees = DB.getEmployees();
          const matched = employees.find(emp => emp.email.toLowerCase() === email.toLowerCase() && emp.password === pass);
          
          if (matched) {
            state.loggedInUser = matched;
            state.activeRole = matched.role;
            localStorage.setItem('aloah_logged_in_user', JSON.stringify(matched));
            
            showToast(`Signed in locally as ${matched.name}`);
            syncUserSessionUI();
            updateNavigationPermissions();
            initEventSelector();
            renderView('dashboard');
            return;
          }
          
          showToast(error.message, 'error');
          return;
        }

        // Fetch employee profile row directly from Supabase profiles table
        let matched = null;
        try {
          const { data: profile, error: pError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (!pError && profile) {
            matched = {
              id: profile.id,
              name: profile.name,
              email: profile.email,
              phone: profile.phone || '',
              role: profile.role
            };
          }
        } catch (pErr) {
          console.error("Supabase profiles query failed", pErr);
        }

        // Fallback: Check if employee is in local database seeds
        if (!matched) {
          const employees = DB.getEmployees();
          matched = employees.find(emp => emp.email.toLowerCase() === email.toLowerCase());
        }

        // Final default fallback
        if (!matched) {
          matched = {
            id: data.user.id,
            name: data.user.email.split('@')[0],
            email: data.user.email,
            role: 'Event Manager'
          };
        }

        // Dynamic caching check: add to local storage if they aren't seeded yet
        const localEmployees = DB.getEmployees();
        if (!localEmployees.some(emp => emp.email.toLowerCase() === matched.email.toLowerCase())) {
          DB.addEmployee({
            id: matched.id,
            name: matched.name,
            email: matched.email,
            role: matched.role,
            phone: matched.phone || '',
            password: pass,
            assignedEvents: []
          });
        }

        state.loggedInUser = matched;
        state.activeRole = matched.role;
        localStorage.setItem('aloah_logged_in_user', JSON.stringify(matched));
        
        showToast(`Signed in via Supabase as ${matched.name}`);
        syncUserSessionUI();
        updateNavigationPermissions();
        initEventSelector();
        renderView('dashboard');
      } else {
        // Fallback to local simulation
        const employees = DB.getEmployees();
        const matched = employees.find(emp => emp.email.toLowerCase() === email.toLowerCase() && emp.password === pass);
        
        if (matched) {
          state.loggedInUser = matched;
          state.activeRole = matched.role;
          localStorage.setItem('aloah_logged_in_user', JSON.stringify(matched));
          
          showToast(`Signed in as ${matched.name}`);
          syncUserSessionUI();
          updateNavigationPermissions();
          initEventSelector();
          renderView('dashboard');
        } else {
          showToast('Invalid credentials provided', 'error');
        }
      }
    });
  }

  // Connect Supabase Save Listener
  const btnSaveSb = document.getElementById('btn-save-sb');
  if (btnSaveSb) {
    btnSaveSb.addEventListener('click', () => {
      const url = document.getElementById('sb-url').value.trim();
      const key = document.getElementById('sb-key').value.trim();
      
      if (url && key) {
        localStorage.removeItem('supabase_disconnected');
        localStorage.setItem('supabase_url', url);
        localStorage.setItem('supabase_key', key);
        initSupabase();
        showToast('Supabase linked successfully');
      } else {
        localStorage.setItem('supabase_disconnected', 'true');
        localStorage.removeItem('supabase_url');
        localStorage.removeItem('supabase_key');
        initSupabase();
        showToast('Returned to Offline Simulation Mode');
      }
    });
  }

  // Autofill helpers
  document.querySelectorAll('.demo-credentials').forEach(cred => {
    cred.addEventListener('click', () => {
      document.getElementById('login-email').value = cred.dataset.email;
      document.getElementById('login-password').value = cred.dataset.pass;
      loginForm.dispatchEvent(new Event('submit'));
    });
  });
}

function setupProfileMenu() {
  DOM.roleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    DOM.roleDropdown.classList.toggle('show');
  });

  document.addEventListener('click', () => {
    DOM.roleDropdown.classList.remove('show');
  });

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      state.loggedInUser = null;
      localStorage.removeItem('aloah_logged_in_user');
      showToast('Logged out of session');
      syncUserSessionUI();
    });
  }
}

function syncUserSessionUI() {
  const loginWrapper = document.getElementById('login-container');
  const appContainer = document.getElementById('app-container');
  
  if (state.loggedInUser) {
    loginWrapper.style.display = 'none';
    appContainer.style.display = 'block';
    
    // Set headers
    document.getElementById('current-user-name').textContent = state.loggedInUser.name;
    document.getElementById('current-role-label').textContent = state.loggedInUser.role;
    document.getElementById('dropdown-email').textContent = state.loggedInUser.email;
  } else {
    loginWrapper.style.display = 'flex';
    appContainer.style.display = 'none';
    
    // Clear inputs
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';

    // Toggle demo tray visibility depending on Supabase connection state
    const demoTray = document.querySelector('.demo-tray');
    if (demoTray) {
      demoTray.style.display = supabase ? 'none' : 'block';
    }
  }
}

// Route Switcher / Navigation
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const btn = e.currentTarget;
      const view = btn.dataset.view;
      renderView(view);
    });
  });
}

// Action Button configurations depending on views and permissions
function setupFAB() {
  DOM.globalFab.addEventListener('click', () => {
    if (state.currentView === 'guests') {
      openAddGuestModal();
    } else if (state.currentView === 'tasks') {
      openAddTaskModal();
    } else if (state.currentView === 'events') {
      openAddEventModal();
    }
  });
}

// Modal Dismiss
function setupModalDismissal() {
  DOM.modalOverlay.addEventListener('click', (e) => {
    if (e.target === DOM.modalOverlay || e.target.classList.contains('sheet-handle')) {
      closeModal();
    }
  });
}

// Navigation Router UI mapping
function renderView(viewName) {
  // Role-based permissions routing gate
  const permissions = {
    'Admin': ['dashboard', 'events', 'guests', 'tasks', 'finances', 'profile', 'scan'],
    'Event Manager': ['dashboard', 'events', 'guests', 'tasks', 'profile', 'scan'],
    'Finance Team': ['dashboard', 'events', 'finances', 'profile']
  };

  const allowed = permissions[state.activeRole] || ['dashboard', 'events', 'profile'];
  if (!allowed.includes(viewName)) {
    renderView('dashboard');
    return;
  }

  state.currentView = viewName;
  stopScanner(); // Automatically deactivate camera scans when switching away from custom pages

  // Highlight active nav items (handles both desktop and mobile buttons)
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.dataset.view === viewName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Update FAB visibility
  const canWrite = state.activeRole === 'Admin' || state.activeRole === 'Event Manager';
  if ((viewName === 'guests' && canWrite) ||
      (viewName === 'tasks' && canWrite) ||
      (viewName === 'events' && state.activeRole === 'Admin')) {
    DOM.globalFab.style.display = 'flex';
  } else {
    DOM.globalFab.style.display = 'none';
  }

  // Fade viewport transition
  DOM.viewport.classList.remove('view-enter');
  void DOM.viewport.offsetWidth; // Trigger reflow
  DOM.viewport.classList.add('view-enter');

  switch (viewName) {
    case 'dashboard':
      renderDashboard();
      break;
    case 'events':
      renderEvents();
      break;
    case 'guests':
      renderGuests();
      break;
    case 'tasks':
      renderTasks();
      break;
    case 'finances':
      renderFinancesView();
      break;
    case 'profile':
      renderProfile();
      break;
    case 'scan':
      renderScannerView();
      break;
    default:
      renderDashboard();
  }
}

// RENDER: Dashboard View
function renderDashboard() {
  if (state.activeRole === 'Admin') {
    renderAdminDashboard();
    return;
  }

  const ana = DB.getAnalytics(state.activeEventId);
  const activeEvent = DB.getEvents().find(e => e.id === state.activeEventId);
  const notifications = DB.getNotifications().slice(0, 3);

  DOM.viewport.innerHTML = `
    <div style="margin-bottom: 24px;">
      <h1 style="font-weight: 800; font-size: 26px;">Overview</h1>
      <p style="color: var(--text-muted); font-size: 13px;">${activeEvent ? activeEvent.name : 'All Events Dashboard'}</p>
    </div>

    <!-- Quick Scan Banner for Check-in Staff / Admins -->
    <div class="card" style="background-color: var(--text-primary); color: var(--bg-primary); border: none; padding: 18px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <div>
          <h3 style="font-size: 16px; font-weight: 700; color: #fff;">Venue Check-In</h3>
          <p style="color: var(--text-light); font-size: 11px; margin-top: 2px;">Scan guest credentials at entry gates</p>
        </div>
        <svg style="width: 24px; height: 24px; stroke: #fff; fill: none;" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m0 11v2m4-6h-1m-4 0H9m12-4a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <button class="btn btn-primary" id="launch-scan-btn" style="background-color: #fff; color: var(--text-primary); border: none; width: 100%; font-weight: 700;">
        Launch Camera Scanner
      </button>
    </div>

    <!-- Analytics Dashboard Counter Grid -->
    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-label">Attended / Expected</span>
        <span class="stat-value">${ana.checkedInAttendees} / ${ana.expectedAttendees}</span>
        <span class="stat-desc">${ana.checkedInGuests} guest profiles check-in</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Attendance Rate</span>
        <span class="stat-value">${ana.attendanceRate}%</span>
        <div style="width:100%; background:#e4e4e7; height:4px; border-radius:2px; margin-top:4px; overflow:hidden;">
          <div style="background:#09090b; width:${ana.attendanceRate}%; height:100%;"></div>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-label">Guest RSVP List</span>
        <span class="stat-value">${ana.totalGuests}</span>
        <span class="stat-desc">${ana.rsvpConfirmed} RSVPs, ${ana.rsvpPending} Pending</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Operational Tasks</span>
        <span class="stat-value">${ana.completedTasks} / ${ana.totalTasks}</span>
        <span class="stat-desc">${ana.taskCompletionRate}% Checklist complete</span>
      </div>
    </div>

    <!-- Live updates Section -->
    <div class="section-header" style="margin-top: 10px;">
      <h2>Activity Monitor</h2>
      <button class="btn btn-text" style="font-size: 11px; padding: 2px 8px; min-height: 28px;" id="mark-notifs-btn">Mark read</button>
    </div>
    
    <div class="activity-feed">
      ${notifications.length === 0 ? '<div class="card" style="text-align: center; padding: 20px; color: var(--text-muted);">No activity logged yet.</div>' : ''}
      ${notifications.map(n => `
        <div class="card" style="padding: 12px; margin-bottom: 8px; border-left: ${n.read ? '1px solid var(--border-color)' : '3px solid var(--text-primary)'}">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <strong style="font-size: 12px; font-weight: 600;">${n.title}</strong>
            <span style="font-size: 10px; color: var(--text-light);">${formatTime(n.timestamp)}</span>
          </div>
          <p style="font-size: 11px; color: var(--text-muted);">${n.message}</p>
        </div>
      `).join('')}
    </div>
  `;

  // Attach quick events
  document.getElementById('launch-scan-btn').addEventListener('click', () => {
    renderView('scan');
  });

  document.getElementById('mark-notifs-btn').addEventListener('click', () => {
    DB.markNotificationsRead();
    showToast('Activity marks read');
    renderDashboard();
  });
}

// RENDER: Events View
function renderEvents() {
  const events = DB.getEvents();
  const allowedEvents = getAccessibleEvents(events);
  
  DOM.viewport.innerHTML = `
    <div style="margin-bottom: 16px;">
      <h1 style="font-weight: 800;">Events Context</h1>
      <p style="color: var(--text-muted); font-size: 13px;">Manage client schedule and allocations</p>
    </div>

    <div class="events-list">
      ${allowedEvents.map(evt => {
        const isLive = evt.status === 'Live';
        const isSelected = evt.id === state.activeEventId;
        return `
          <div class="card" style="${isSelected ? 'border: 2px solid var(--text-primary);' : ''} cursor: pointer;" data-id="${evt.id}">
            <div class="card-header">
              <div>
                <span class="badge status ${evt.status.toLowerCase()}">${evt.status}</span>
                <h3 class="card-title" style="margin-top: 6px; font-size: 16px;">${evt.name}</h3>
                <span class="card-subtitle">${evt.clientName}</span>
              </div>
              ${isLive ? '<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#22c55e; box-shadow: 0 0 6px #22c55e;"></span>' : ''}
            </div>
            
            <div class="card-body" style="margin-top: 8px;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <svg style="width: 14px; height: 14px; stroke: currentColor; fill:none;" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                <span>${evt.venue}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <svg style="width: 14px; height: 14px; stroke: currentColor; fill:none;" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span>${new Date(evt.dateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </div>
            </div>
            
            <div class="card-footer">
              <div style="font-size: 11px; color: var(--text-muted);">
                Budget: <strong>${evt.budget}</strong>
              </div>
              <button class="btn btn-text" style="min-height: 28px; padding: 2px 8px; font-size: 11px;" data-id="${evt.id}">
                Configure
              </button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Attach card click handlers
  DOM.viewport.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', (e) => {
      // If config button was clicked
      if (e.target.closest('button')) {
        e.stopPropagation();
        openEditEventModal(card.dataset.id);
        return;
      }
      
      const evtId = card.dataset.id;
      DOM.eventSelector.value = evtId;
      state.activeEventId = evtId;
      document.getElementById('global-event-selector').value = evtId;
      showToast("Selected Event: " + DB.getEvents().find(ev => ev.id === evtId).name);
      renderEventDetail(evtId);
    });
  });
}

// RENDER: Guests View
function renderGuests() {
  const guests = DB.getGuests().filter(g => g.eventId === state.activeEventId);
  const activeEvent = DB.getEvents().find(e => e.id === state.activeEventId);
  
  // Apply filtering
  const filteredGuests = guests.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
                          g.phone.includes(state.searchQuery) ||
                          g.company.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
                          g.email.toLowerCase().includes(state.searchQuery.toLowerCase());
    
    const matchesCategory = state.categoryFilter === 'All' || g.category === state.categoryFilter;
    const matchesRSVP = state.rsvpFilter === 'All' || g.rsvpStatus === state.rsvpFilter;
    
    return matchesSearch && matchesCategory && matchesRSVP;
  });

  const categories = ['All', 'VVIP', 'VIP', 'Media', 'General'];
  const rsvps = ['All', 'Confirmed', 'Pending', 'Declined'];

  DOM.viewport.innerHTML = `
    <div style="margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h1 style="font-weight: 800;">Guests Registry</h1>
          <p style="color: var(--text-muted); font-size: 13px;">RSVPs for ${activeEvent ? activeEvent.name : 'Selected Event'}</p>
        </div>
        ${state.activeRole === 'Admin' || state.activeRole === 'Event Manager' ? 
          `<button class="btn btn-text" id="csv-import-btn" style="min-height: 36px; padding: 4px 12px; font-size: 12px; border: 1px solid var(--border-color);">Import Excel</button>` : ''}
      </div>
    </div>

    <!-- Search and Filters Section -->
    <div class="search-filter-box">
      <div class="search-input-wrapper">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <input type="text" class="search-input" id="guest-search" placeholder="Search by name, company, number..." value="${state.searchQuery}">
      </div>

      <!-- Categories Pills Scroll -->
      <div class="filter-pills-scroll">
        ${categories.map(c => `
          <button class="filter-pill ${state.categoryFilter === c ? 'active' : ''}" data-type="category" data-val="${c}">${c}</button>
        `).join('')}
      </div>

      <!-- RSVP Pills Scroll -->
      <div class="filter-pills-scroll">
        ${rsvps.map(r => `
          <button class="filter-pill ${state.rsvpFilter === r ? 'active' : ''}" data-type="rsvp" data-val="${r}">${r}</button>
        `).join('')}
      </div>
    </div>

    <!-- Guests List Rows -->
    <div class="card" style="padding: 0 16px;">
      ${filteredGuests.length === 0 ? '<div style="text-align: center; padding: 30px; color: var(--text-muted); font-size: 13px;">No guests found matching parameters.</div>' : ''}
      ${filteredGuests.map(g => {
        const isChecked = g.checkInStatus === 'Checked In';
        return `
          <div class="guest-item" data-id="${g.id}">
            <div class="guest-name-col">
              <div style="display: flex; align-items: center; gap: 6px;">
                <strong style="font-size: 14px; font-weight: 600;">${g.name}</strong>
                <span class="badge ${g.category.toLowerCase()}">${g.category}</span>
              </div>
              <div class="guest-meta-row">
                <span>${g.company || 'Private'}</span>
                <span>•</span>
                <span>Pax: ${g.attendeesCount}</span>
              </div>
            </div>
            
            <div class="guest-action-col">
              ${isChecked ? `
                <span style="color: #166534; background-color: #f0fdf4; font-size: 10px; font-weight:700; padding:4px 8px; border-radius:6px; display:inline-flex; align-items:center; gap:3px;">
                  <span style="width:5px; height:5px; border-radius:50%; background-color:#22c55e;"></span>
                  IN ${new Date(g.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              ` : (['Admin', 'Event Manager'].includes(state.activeRole) ? `
                <button class="btn btn-primary checkin-direct-btn" style="min-height: 28px; padding: 2px 8px; font-size: 11px;" data-id="${g.id}">
                  Check-In
                </button>
              ` : `
                <span class="badge" style="background-color: var(--bg-tertiary); color: var(--text-muted); font-size:9px; padding:4px 8px; border-radius:6px; text-transform:capitalize;">
                  ${g.rsvpStatus}
                </span>
              `)}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Attach search triggers
  const sInput = document.getElementById('guest-search');
  sInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    // Don't full re-render on fast keystrokes, just let debounce/filter work or simply update list:
    clearTimeout(state.searchDebounce);
    state.searchDebounce = setTimeout(() => {
      renderGuests();
    }, 300);
  });
  sInput.focus();
  sInput.setSelectionRange(sInput.value.length, sInput.value.length);

  // Attach filter buttons
  DOM.viewport.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      const type = e.target.dataset.type;
      const val = e.target.dataset.val;
      if (type === 'category') state.categoryFilter = val;
      if (type === 'rsvp') state.rsvpFilter = val;
      renderGuests();
    });
  });

  // Bulk CSV Trigger
  const csvBtn = document.getElementById('csv-import-btn');
  if (csvBtn) {
    csvBtn.addEventListener('click', () => openCsvImportModal());
  }

  // Row selection (Details Sheet)
  DOM.viewport.querySelectorAll('.guest-item').forEach(item => {
    item.addEventListener('click', (e) => {
      // If direct check-in clicked
      if (e.target.classList.contains('checkin-direct-btn')) {
        e.stopPropagation();
        const gid = e.target.dataset.id;
        const res = DB.checkInGuest(gid, state.activeEventId, 'Quick-Tap');
        if (res.success) {
          showToast(`Welcome ${res.guest.name}`);
        } else {
          showToast(res.message, 'error');
        }
        renderGuests();
        return;
      }
      openGuestDetailsModal(item.dataset.id);
    });
  });
}

// RENDER: Tasks View
function renderTasks() {
  const tasks = DB.getTasks().filter(t => t.eventId === state.activeEventId);
  const employees = DB.getEmployees();
  
  const filteredTasks = tasks.filter(t => {
    if (state.taskFilter === 'All') return true;
    if (state.taskFilter === 'Pending') return t.status !== 'Completed';
    return t.status === state.taskFilter; // In Progress, Completed
  });

  const filterStates = ['All', 'Pending', 'In Progress', 'Completed'];

  DOM.viewport.innerHTML = `
    <div style="margin-bottom: 16px;">
      <h1 style="font-weight: 800;">Operational Checklist</h1>
      <p style="color: var(--text-muted); font-size: 13px;">Task delegations and completion status</p>
    </div>

    <!-- Filter Pills -->
    <div class="filter-pills-scroll" style="margin-bottom: 16px;">
      ${filterStates.map(s => `
        <button class="filter-pill ${state.taskFilter === s ? 'active' : ''}" data-status="${s}">${s}</button>
      `).join('')}
    </div>

    <div class="tasks-board">
      ${filteredTasks.length === 0 ? '<div class="card" style="text-align: center; padding: 30px; color: var(--text-muted); font-size: 13px;">No tasks on checklist.</div>' : ''}
      ${filteredTasks.map(t => {
        const emp = employees.find(e => e.id === t.assignedEmployeeId);
        const isCompleted = t.status === 'Completed';
        
        return `
          <div class="task-row" style="opacity: ${isCompleted ? '0.7' : '1'}">
            <div class="task-checkbox-col">
              <input type="checkbox" class="task-checkbox" data-id="${t.id}" ${isCompleted ? 'checked' : ''} aria-label="Mark task complete">
            </div>
            
            <div class="task-content-col" style="cursor: pointer;" data-id="${t.id}">
              <span class="task-title" style="text-decoration: ${isCompleted ? 'line-through' : 'none'}">${t.title}</span>
              <span class="task-desc">${t.description}</span>
              
              <div class="task-meta">
                <span class="badge priority ${t.priority.toLowerCase()}">${t.priority}</span>
                <span>•</span>
                <span>Assignee: <strong>${emp ? emp.name : 'Unassigned'}</strong></span>
                <span>•</span>
                <span>Due: ${new Date(t.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Filter triggers
  DOM.viewport.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      state.taskFilter = e.target.dataset.status;
      renderTasks();
    });
  });

  // Task check trigger
  DOM.viewport.querySelectorAll('.task-checkbox').forEach(box => {
    box.addEventListener('change', (e) => {
      const tid = e.target.dataset.id;
      const allTasks = DB.getTasks();
      const task = allTasks.find(t => t.id === tid);
      if (task) {
        task.status = e.target.checked ? 'Completed' : 'Pending';
        DB.updateTask(task);
        showToast(e.target.checked ? `Completed: "${task.title}"` : `Pending: "${task.title}"`);
        renderTasks();
      }
    });
  });

  // Task details click
  DOM.viewport.querySelectorAll('.task-content-col').forEach(col => {
    col.addEventListener('click', () => {
      openEditTaskModal(col.dataset.id);
    });
  });
}

// RENDER: Profile & Team view
function renderProfile() {
  const employees = DB.getEmployees();
  const isAdmin = state.activeRole === 'Admin';
  const currentUser = employees.find(e => e.role === state.activeRole) || employees.find(e => e.name === 'Prabal Sharma');

  DOM.viewport.innerHTML = `
    <div style="margin-bottom: 20px;">
      <h1 style="font-weight: 800;">Management Port</h1>
      <p style="color: var(--text-muted); font-size: 13px;">Team profile and global configurations</p>
    </div>

    <!-- Profile Details Card -->
    <div class="card" style="padding: 20px; display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
      <div style="width: 60px; height: 60px; border-radius: 50%; background-color: var(--text-primary); color: var(--bg-primary); display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700;">
        ${currentUser ? currentUser.name.split(' ').map(n => n[0]).join('') : 'A'}
      </div>
      <div>
        <h3 style="font-size: 18px; font-weight: 700;">${currentUser ? currentUser.name : 'Aloah Coordinator'}</h3>
        <span class="badge" style="background-color: var(--text-primary); color:#fff; font-size:9px; margin-top:4px;">${state.activeRole}</span>
        <div style="font-size: 12px; color: var(--text-muted); margin-top: 6px;">
          ${currentUser ? currentUser.email : 'contact@aloahevents.com'} | ${currentUser ? currentUser.phone : '+91 99999 99999'}
        </div>
      </div>
    </div>

    <!-- Team management section (Admin Only) -->
    ${isAdmin ? `
      <div class="section-header">
        <h2>Personnel Registry</h2>
        <button class="btn btn-primary" id="add-employee-btn" style="min-height: 32px; padding: 4px 12px; font-size: 11px;">Add Employee</button>
      </div>

      <div class="employees-list" style="margin-bottom: 24px;">
        ${employees.map(e => `
          <div class="card" style="padding: 12px; margin-bottom: 8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <strong style="font-size: 13px; font-weight: 600;">${e.name}</strong>
                <div style="font-size: 11px; color:var(--text-muted); margin-top:2px;">Role: <strong>${e.role}</strong></div>
              </div>
              <button class="btn btn-text edit-emp-btn" style="min-height:28px; padding:2px 8px; font-size:11px;" data-id="${e.id}">Edit</button>
            </div>
          </div>
        `).join('')}
      </div>
    ` : ''}

  `;

  if (isAdmin) {
    document.getElementById('add-employee-btn').addEventListener('click', () => openAddEmployeeModal());
    DOM.viewport.querySelectorAll('.edit-emp-btn').forEach(btn => {
      btn.addEventListener('click', () => openEditEmployeeModal(btn.dataset.id));
    });
  }
}

// RENDER: QR Scanner View
function renderScannerView() {
  const nonCheckedGuests = DB.getGuests().filter(g => g.eventId === state.activeEventId && g.checkInStatus !== 'Checked In');

  DOM.viewport.innerHTML = `
    <div style="margin-bottom: 16px;">
      <h1 style="font-weight: 800;">Terminal Gate Check-in</h1>
      <p style="color: var(--text-muted); font-size: 13px;">Align ticket barcodes inside target</p>
    </div>

    <!-- Active Camera Frame HUD -->
    <div id="scanner-wrapper">
      <div id="camera-scan-view"></div>
      <div class="scanner-overlay-laser">
        <div class="scanner-laser-line"></div>
      </div>
    </div>

    <!-- Interactive Desktop Simulation tool -->
    <div class="simulator-panel">
      <div class="simulator-title">Simulate QR Scan (Desktop Testing)</div>
      
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <select class="simulator-select" id="simulator-guest-select">
          <option value="" disabled selected>-- Select a Guest to Scan --</option>
          ${nonCheckedGuests.map(g => `
            <option value="${g.id}">${g.name} (${g.category})</option>
          `).join('')}
        </select>
        
        <button class="btn btn-primary" id="simulator-scan-action-btn" style="width: 100%; min-height: 38px;">
          Submit Mock scan QR
        </button>
      </div>
    </div>

    <!-- Scanner Stats -->
    <div class="card" style="margin-top: 16px; padding: 12px; font-size:12px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span>Checked In:</span>
        <strong id="scanner-ratio-label">0 / 0</strong>
      </div>
    </div>
  `;

  // Update scanner ratios
  const guests = DB.getGuests().filter(g => g.eventId === state.activeEventId);
  const checkedIn = guests.filter(g => g.checkInStatus === 'Checked In').length;
  document.getElementById('scanner-ratio-label').textContent = `${checkedIn} / ${guests.length}`;

  // Start QR stream
  startScanner(
    state.activeEventId, 
    (decodedToken) => {
      // On QR Scan Success
      handleScanResult(decodedToken);
    },
    () => {
      // Frame scanning failure (expected noise)
    }
  );

  // Trigger simulator
  const simBtn = document.getElementById('simulator-scan-action-btn');
  const simSelect = document.getElementById('simulator-guest-select');
  simBtn.addEventListener('click', () => {
    const gid = simSelect.value;
    if (!gid) {
      showToast('Please select a mock guest to check-in', 'error');
      return;
    }
    handleScanResult(gid);
  });
}

function handleScanResult(token) {
  stopScanner();
  const res = DB.checkInGuest(token, state.activeEventId, 'QR Scan HUD');
  
  if (res.success) {
    showToast(`SUCCESS: ${res.guest.name} checked in!`);
    openGuestCheckinSuccessModal(res.guest);
  } else if (res.needsOverride) {
    // Shows option to override declined RSVP
    openOverrideRSVPModal(res.guest);
  } else {
    showToast(res.message, 'error');
    // Refresh scanner screen
    renderScannerView();
  }
}

// Visual Alert Toast controller
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  if (type === 'error') {
    toast.style.backgroundColor = '#991b1b'; // Red accent
  }

  toast.innerHTML = `
    <span>${message}</span>
    <button class="toast-close">✕</button>
  `;

  DOM.toastContainer.appendChild(toast);
  
  // Trigger animation next frame
  setTimeout(() => toast.classList.add('show'), 50);

  const removeToast = () => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  };

  toast.querySelector('.toast-close').addEventListener('click', removeToast);
  setTimeout(removeToast, 4000);
}

// Dynamic real-time simulated alerts
function simulateRealtimeUpdates() {
  const events = DB.getEvents();
  const guests = DB.getGuests().filter(g => g.eventId === state.activeEventId && g.checkInStatus === 'Pending' && g.rsvpStatus === 'Confirmed');
  if (guests.length === 0) return;

  // Pick a random guest to simulate arrivals
  const idx = Math.floor(Math.random() * guests.length);
  const randomGuest = guests[idx];

  // Perform simulated check-in
  const res = DB.checkInGuest(randomGuest.id, state.activeEventId, 'Auto Gate-3');
  if (res.success) {
    showToast(`Real-Time Update: ${res.guest.name} (${res.guest.category}) has arrived!`);
    // If currently looking at dashboard or guests list, refresh
    if (state.currentView === 'dashboard' || state.currentView === 'guests' || state.currentView === 'scan') {
      renderView(state.currentView);
    }
  }
}

// Modal Helpers
function showModal(contentHtml, onOpen) {
  DOM.modalContent.innerHTML = contentHtml;
  DOM.modalOverlay.classList.add('show');
  if (onOpen) onOpen();
}

function closeModal() {
  DOM.modalOverlay.classList.remove('show');
  // Refresh standard states
  renderView(state.currentView);
}

// ----------------------------------------------------
// MODAL FORMS BUILDERS
// ----------------------------------------------------

function openGuestDetailsModal(guestId) {
  const guests = DB.getGuests();
  const g = guests.find(gst => gst.id === guestId);
  if (!g) return;

  const isChecked = g.checkInStatus === 'Checked In';

  const html = `
    <div class="sheet-header">
      <span class="badge ${g.category.toLowerCase()}">${g.category} Guest</span>
      <button class="btn btn-text" id="close-sheet-btn" style="min-height:32px; padding:4px;">Close</button>
    </div>

    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="font-size: 22px; font-weight:700; margin-bottom: 2px;">${g.name}</h2>
      <p style="color: var(--text-muted); font-size:13px;">${g.company || 'Private Participant'}</p>
    </div>

    <!-- QR Code Canvas element -->
    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; background-color: var(--bg-secondary); border: 1px dashed var(--border-color); padding: 20px; border-radius: 16px; margin-bottom: 20px;">
      <canvas id="guest-details-qr-canvas" style="width: 160px; height: 160px; background:#fff;"></canvas>
      <span style="font-size: 10px; color: var(--text-light); font-family: monospace;">TOKEN: ${g.id}</span>
    </div>

    <!-- Info details -->
    <div class="card" style="margin-bottom: 20px;">
      <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap: 12px; font-size: 12px; margin-bottom:12px;">
        <div>
          <span style="color: var(--text-light); display:block; margin-bottom:2px;">RSVP Status</span>
          <strong style="text-transform: capitalize;">${g.rsvpStatus}</strong>
        </div>
        <div>
          <span style="color: var(--text-light); display:block; margin-bottom:2px;">Party Size</span>
          <strong>${g.attendeesCount} pax</strong>
        </div>
      </div>
      <div style="font-size:12px; margin-bottom:12px;">
        <span style="color: var(--text-light); display:block; margin-bottom:2px;">Contact Information</span>
        <strong>${g.phone}</strong><br/>
        <strong>${g.email}</strong>
      </div>
      <div style="font-size:12px;">
        <span style="color: var(--text-light); display:block; margin-bottom:2px;">Guest Notes</span>
        <span>${g.notes || 'None'}</span>
      </div>
    </div>

    <!-- Action Bar -->
    <div style="display: flex; gap: 10px;">
      ${['Admin', 'Event Manager'].includes(state.activeRole) ? (
        isChecked ? `
          <button class="btn btn-primary" id="modal-checkout-btn" style="flex:1; background-color: var(--text-muted); border-color:var(--text-muted);">
            Undo Check-in
          </button>
        ` : `
          <button class="btn btn-primary" id="modal-checkin-btn" style="flex:1;">
            Check-In Guest
          </button>
        `
      ) : ''}
      ${['Admin', 'Event Manager'].includes(state.activeRole) ? `
        <button class="btn" id="modal-edit-guest-btn" style="flex:1;">Edit Guest</button>
      ` : ''}
    </div>
  `;

  showModal(html, () => {
    // Generate QR Canvas dynamically
    const canvas = document.getElementById('guest-details-qr-canvas');
    generateQRCode(canvas, g.id);

    document.getElementById('close-sheet-btn').addEventListener('click', closeModal);
    
    const checkinBtn = document.getElementById('modal-checkin-btn');
    if (checkinBtn) {
      checkinBtn.addEventListener('click', () => {
        const res = DB.checkInGuest(g.id, state.activeEventId, 'Manual Sheet');
        if (res.success) {
          showToast(`Welcome ${res.guest.name}`);
          closeModal();
        } else {
          showToast(res.message, 'error');
        }
      });
    }

    const checkoutBtn = document.getElementById('modal-checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        g.checkInStatus = 'Pending';
        delete g.checkedInAt;
        const all = DB.getGuests();
        DB.saveGuests(all.map(x => x.id === g.id ? g : x));
        
        // Remove from logs
        const logs = DB.getCheckIns().filter(ch => ch.guestId !== g.id);
        DB.saveCheckIns(logs);

        showToast(`Checked out ${g.name}`);
        closeModal();
      });
    }

    const editBtn = document.getElementById('modal-edit-guest-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        openAddGuestModal(g);
      });
    }
  });
}

function openGuestCheckinSuccessModal(guest) {
  const html = `
    <div style="text-align: center; padding: 20px 0;">
      <div style="width:64px; height:64px; border-radius:50%; background-color:#dcfce7; color:#15803d; display:flex; align-items:center; justify-content:center; margin:0 auto 16px auto;">
        <svg style="width:36px; height:36px; fill:none; stroke:currentColor;" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <span class="badge ${guest.category.toLowerCase()}" style="margin-bottom:8px;">${guest.category} Class</span>
      <h2 style="font-size:24px; font-weight:800; margin-bottom:4px;">Check-In Success</h2>
      <p style="font-size:16px; font-weight:600; color:var(--text-primary);">${guest.name}</p>
      <p style="font-size:12px; color:var(--text-muted); margin-top:2px;">Company: ${guest.company || 'Private'}</p>

      <div class="card" style="margin:20px 0; text-align:left; background-color:var(--bg-secondary); padding:12px;">
        <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:6px;">
          <span>Arrival Time:</span>
          <strong>${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:6px;">
          <span>Attendees:</span>
          <strong>${guest.attendeesCount} Person(s)</strong>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:12px;">
          <span>Seating Notes:</span>
          <strong>${guest.notes || 'No notes'}</strong>
        </div>
      </div>

      <button class="btn btn-primary" id="confirm-success-close-btn" style="width:100%;">
        Proceed to Next Scan
      </button>
    </div>
  `;

  showModal(html, () => {
    document.getElementById('confirm-success-close-btn').addEventListener('click', closeModal);
  });
}

function openOverrideRSVPModal(guest) {
  const html = `
    <div style="text-align: center; padding: 20px 0;">
      <div style="width:64px; height:64px; border-radius:50%; background-color:#fee2e2; color:#991b1b; display:flex; align-items:center; justify-content:center; margin:0 auto 16px auto;">
        <svg style="width:36px; height:36px; fill:none; stroke:currentColor;" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>

      <h2 style="font-size:20px; font-weight:800; margin-bottom:4px;">RSVP Alert</h2>
      <p style="font-size:14px; color:var(--text-muted);">${guest.name} RSVP status is declined.</p>

      <div style="display:flex; flex-direction:column; gap:10px; margin-top:24px;">
        <button class="btn btn-danger" id="override-checkin-btn">
          Override & Check-In
        </button>
        <button class="btn btn-text" id="cancel-override-btn">
          Cancel Scan
        </button>
      </div>
    </div>
  `;

  showModal(html, () => {
    document.getElementById('override-checkin-btn').addEventListener('click', () => {
      // Force change status to Confirmed first, then check-in
      const guests = DB.getGuests();
      const g = guests.find(x => x.id === guest.id);
      if (g) {
        g.rsvpStatus = 'Confirmed';
        DB.saveGuests(guests);
      }
      const res = DB.checkInGuest(guest.id, state.activeEventId, 'Override entry');
      if (res.success) {
        showToast('Guest Overridden!');
        openGuestCheckinSuccessModal(res.guest);
      } else {
        showToast(res.message, 'error');
        closeModal();
      }
    });

    document.getElementById('cancel-override-btn').addEventListener('click', closeModal);
  });
}

function openAddGuestModal(existingGuest = null) {
  const isEdit = !!existingGuest;
  const html = `
    <div class="sheet-header">
      <h2>${isEdit ? 'Edit Guest Profile' : 'Add Guest Profile'}</h2>
      <button class="btn btn-text" id="close-g-modal" style="min-height:32px; padding:4px;">Cancel</button>
    </div>

    <form id="guest-form">
      <div class="form-group">
        <label class="form-label">Full Name</label>
        <input type="text" class="form-control" id="g-name" required value="${isEdit ? existingGuest.name : ''}">
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Phone Number</label>
          <input type="tel" class="form-control" id="g-phone" required placeholder="+91" value="${isEdit ? existingGuest.phone : ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Email Address</label>
          <input type="email" class="form-control" id="g-email" required placeholder="name@domain.com" value="${isEdit ? existingGuest.email : ''}">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Company Name</label>
          <input type="text" class="form-control" id="g-company" value="${isEdit ? existingGuest.company : ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Attendees (Pax)</label>
          <input type="number" class="form-control" id="g-pax" min="1" required value="${isEdit ? existingGuest.attendeesCount : '1'}">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Guest Classification</label>
          <select class="form-control" id="g-category" style="background:#fff;">
            <option value="General" ${isEdit && existingGuest.category === 'General' ? 'selected' : ''}>General</option>
            <option value="VIP" ${isEdit && existingGuest.category === 'VIP' ? 'selected' : ''}>VIP</option>
            <option value="VVIP" ${isEdit && existingGuest.category === 'VVIP' ? 'selected' : ''}>VVIP</option>
            <option value="Media" ${isEdit && existingGuest.category === 'Media' ? 'selected' : ''}>Media</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">RSVP Status</label>
          <select class="form-control" id="g-rsvp" style="background:#fff;">
            <option value="Pending" ${isEdit && existingGuest.rsvpStatus === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Confirmed" ${isEdit && existingGuest.rsvpStatus === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
            <option value="Declined" ${isEdit && existingGuest.rsvpStatus === 'Declined' ? 'selected' : ''}>Declined</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Hospitality & Seating Notes</label>
        <textarea class="form-control" id="g-notes">${isEdit ? existingGuest.notes : ''}</textarea>
      </div>

      <div style="display:flex; gap:10px; margin-top:20px;">
        ${isEdit ? `
          <button type="button" class="btn btn-danger" id="delete-g-btn" style="flex:1;">Delete</button>
          <button type="submit" class="btn btn-primary" style="flex:2;">Save Profile</button>
        ` : `
          <button type="submit" class="btn btn-primary" style="width:100%;">Create Guest Profile</button>
        `}
      </div>
    </form>
  `;

  showModal(html, () => {
    document.getElementById('close-g-modal').addEventListener('click', closeModal);
    
    if (isEdit) {
      document.getElementById('delete-g-btn').addEventListener('click', () => {
        if (confirm(`Remove guest ${existingGuest.name}?`)) {
          DB.deleteGuest(existingGuest.id, state.activeEventId);
          showToast('Guest profile deleted');
          closeModal();
        }
      });
    }

    document.getElementById('guest-form').addEventListener('submit', (e) => {
      e.preventDefault();
      
      const guestData = {
        eventId: state.activeEventId,
        name: document.getElementById('g-name').value,
        phone: document.getElementById('g-phone').value,
        email: document.getElementById('g-email').value,
        company: document.getElementById('g-company').value,
        attendeesCount: parseInt(document.getElementById('g-pax').value),
        category: document.getElementById('g-category').value,
        rsvpStatus: document.getElementById('g-rsvp').value,
        notes: document.getElementById('g-notes').value,
        checkInStatus: isEdit ? existingGuest.checkInStatus : 'Pending'
      };

      if (isEdit) {
        guestData.id = existingGuest.id;
        if (existingGuest.checkedInAt) guestData.checkedInAt = existingGuest.checkedInAt;
        DB.updateGuest(guestData);
        showToast('Guest details updated');
      } else {
        DB.addGuest(guestData);
        showToast('New guest registered');
      }

      closeModal();
    });
  });
}

function openCsvImportModal() {
  const html = `
    <div class="sheet-header">
      <h2>Bulk Excel/CSV Import</h2>
      <button class="btn btn-text" id="close-csv-modal" style="min-height:32px; padding:4px;">Cancel</button>
    </div>

    <div style="font-size:12px; color:var(--text-muted); margin-bottom:12px; line-height:1.4;">
      Paste rows copy-pasted directly from Excel or a text file. Format:
      <pre style="background:var(--bg-secondary); padding:8px; border-radius:6px; margin:6px 0; overflow-x:auto; font-family:monospace;">
Name, Phone, Email, Company, Category(VIP/VVIP/Media/General)
Alexander Wright, +1 415 555 2671, alex@vogue.com, Vogue US, VVIP
Sonam Kapoor, +91 99999 11111, sonam@kapoor.in, Agency, VIP</pre>
    </div>

    <div class="form-group">
      <label class="form-label">Excel Data block</label>
      <textarea class="form-control" id="csv-paste-area" style="height:150px; font-family:monospace; font-size:11px;" placeholder="Paste rows here..."></textarea>
    </div>

    <button class="btn btn-primary" id="submit-csv-btn" style="width:100%;">
      Parse & Bulk Register
    </button>
  `;

  showModal(html, () => {
    document.getElementById('close-csv-modal').addEventListener('click', closeModal);
    
    document.getElementById('submit-csv-btn').addEventListener('click', () => {
      const paste = document.getElementById('csv-paste-area').value.trim();
      if (!paste) {
        showToast('No copy-pasted data detected', 'error');
        return;
      }

      const lines = paste.split('\n');
      let successCount = 0;
      let failCount = 0;

      lines.forEach(line => {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 3 && parts[0] !== 'Name') {
          try {
            DB.addGuest({
              eventId: state.activeEventId,
              name: parts[0],
              phone: parts[1] || '',
              email: parts[2] || '',
              company: parts[3] || '',
              category: parts[4] || 'General',
              rsvpStatus: 'Confirmed',
              attendeesCount: 1,
              checkInStatus: 'Pending',
              notes: 'Imported via CSV'
            });
            successCount++;
          } catch (e) {
            failCount++;
          }
        } else {
          failCount++;
        }
      });

      showToast(`Import completed. Success: ${successCount}, Skipped/Error: ${failCount}`);
      closeModal();
    });
  });
}

function openAddTaskModal(existingTask = null) {
  const isEdit = !!existingTask;
  const employees = DB.getEmployees();

  const html = `
    <div class="sheet-header">
      <h2>${isEdit ? 'Edit Operational Task' : 'Register Task'}</h2>
      <button class="btn btn-text" id="close-t-modal" style="min-height:32px; padding:4px;">Cancel</button>
    </div>

    <form id="task-form">
      <div class="form-group">
        <label class="form-label">Task Title</label>
        <input type="text" class="form-control" id="t-title" required value="${isEdit ? existingTask.title : ''}">
      </div>

      <div class="form-group">
        <label class="form-label">Task Description</label>
        <textarea class="form-control" id="t-desc" required>${isEdit ? existingTask.description : ''}</textarea>
      </div>

      <div class="form-group">
        <label class="form-label">Assigned Employee</label>
        <select class="form-control" id="t-employee" style="background:#fff;">
          ${employees.map(e => `
            <option value="${e.id}" ${isEdit && existingTask.assignedEmployeeId === e.id ? 'selected' : ''}>${e.name} (${e.role})</option>
          `).join('')}
        </select>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Priority</label>
          <select class="form-control" id="t-priority" style="background:#fff;">
            <option value="Low" ${isEdit && existingTask.priority === 'Low' ? 'selected' : ''}>Low</option>
            <option value="Medium" ${isEdit && existingTask.priority === 'Medium' ? 'selected' : ''}>Medium</option>
            <option value="High" ${isEdit && existingTask.priority === 'High' ? 'selected' : ''}>High</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Due Date</label>
          <input type="datetime-local" class="form-control" id="t-date" required value="${isEdit ? existingTask.dueDate : new Date(Date.now() + 86400000).toISOString().slice(0, 16)}">
        </div>
      </div>

      ${isEdit ? `
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-control" id="t-status" style="background:#fff;">
            <option value="Pending" ${existingTask.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="In Progress" ${existingTask.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Completed" ${existingTask.status === 'Completed' ? 'selected' : ''}>Completed</option>
          </select>
        </div>
      ` : ''}

      <button type="submit" class="btn btn-primary" style="width:100%; margin-top:10px;">
        ${isEdit ? 'Save Task' : 'Register Task'}
      </button>
    </form>
  `;

  showModal(html, () => {
    document.getElementById('close-t-modal').addEventListener('click', closeModal);
    
    document.getElementById('task-form').addEventListener('submit', (e) => {
      e.preventDefault();
      
      const tData = {
        eventId: state.activeEventId,
        title: document.getElementById('t-title').value,
        description: document.getElementById('t-desc').value,
        assignedEmployeeId: document.getElementById('t-employee').value,
        priority: document.getElementById('t-priority').value,
        dueDate: document.getElementById('t-date').value,
        status: isEdit ? document.getElementById('t-status').value : 'Pending'
      };

      if (isEdit) {
        tData.id = existingTask.id;
        DB.updateTask(tData);
        showToast('Task updated');
      } else {
        DB.addTask(tData);
        showToast('New task delegated');
      }

      closeModal();
    });
  });
}

function openEditTaskModal(taskId) {
  const task = DB.getTasks().find(t => t.id === taskId);
  if (task) openAddTaskModal(task);
}

function openAddEventModal() {
  const html = `
    <div class="sheet-header">
      <h2>Create Event</h2>
      <button class="btn btn-text" id="close-e-modal" style="min-height:32px; padding:4px;">Cancel</button>
    </div>

    <form id="event-form">
      <div class="form-group">
        <label class="form-label">Event Name</label>
        <input type="text" class="form-control" id="e-name" required placeholder="e.g. Vogue Luxury Gala">
      </div>

      <div class="form-group">
        <label class="form-label">Client Name</label>
        <input type="text" class="form-control" id="e-client" required placeholder="Client company name">
      </div>

      <div class="form-group">
        <label class="form-label">Venue Location</label>
        <input type="text" class="form-control" id="e-venue" required placeholder="e.g. Taj Palace, Delhi">
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Date & Time</label>
          <input type="datetime-local" class="form-control" id="e-date" required>
        </div>
        <div class="form-group">
          <label class="form-label">Budget Allocated</label>
          <input type="text" class="form-control" id="e-budget" required placeholder="₹">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Event Stage</label>
        <select class="form-control" id="e-status" style="background:#fff;">
          <option value="Planning">Planning</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Live">Live</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Event Brief / Notes</label>
        <textarea class="form-control" id="e-notes"></textarea>
      </div>

      <button type="submit" class="btn btn-primary" style="width:100%; margin-top:10px;">
        Generate Event Context
      </button>
    </form>
  `;

  showModal(html, () => {
    document.getElementById('close-e-modal').addEventListener('click', closeModal);
    
    document.getElementById('event-form').addEventListener('submit', (e) => {
      e.preventDefault();
      
      const nEvt = DB.addEvent({
        name: document.getElementById('e-name').value,
        clientName: document.getElementById('e-client').value,
        venue: document.getElementById('e-venue').value,
        dateTime: document.getElementById('e-date').value,
        budget: document.getElementById('e-budget').value,
        status: document.getElementById('e-status').value,
        notes: document.getElementById('e-notes').value,
        assignedTeam: ['emp-1'] // Assign Admin by default
      });

      showToast(`Created Event "${nEvt.name}"`);
      initEventSelector(); // Refresh
      closeModal();
    });
  });
}

function openEditEventModal(eventId) {
  const events = DB.getEvents();
  const evt = events.find(e => e.id === eventId);
  if (!evt) return;

  const html = `
    <div class="sheet-header">
      <h2>Configure Event</h2>
      <button class="btn btn-text" id="close-e-modal" style="min-height:32px; padding:4px;">Cancel</button>
    </div>

    <form id="event-edit-form">
      <div class="form-group">
        <label class="form-label">Event Status</label>
        <select class="form-control" id="edit-e-status" style="background:#fff;">
          <option value="Planning" ${evt.status === 'Planning' ? 'selected' : ''}>Planning</option>
          <option value="Confirmed" ${evt.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
          <option value="Live" ${evt.status === 'Live' ? 'selected' : ''}>Live</option>
          <option value="Completed" ${evt.status === 'Completed' ? 'selected' : ''}>Completed</option>
          <option value="Cancelled" ${evt.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Venue Location</label>
        <input type="text" class="form-control" id="edit-e-venue" required value="${evt.venue}">
      </div>

      <div class="form-group">
        <label class="form-label">Event Description & Notes</label>
        <textarea class="form-control" id="edit-e-notes">${evt.notes}</textarea>
      </div>

      <button type="submit" class="btn btn-primary" style="width:100%; margin-top:10px;">
        Apply Changes
      </button>
    </form>
  `;

  showModal(html, () => {
    document.getElementById('close-e-modal').addEventListener('click', closeModal);
    
    document.getElementById('event-edit-form').addEventListener('submit', (e) => {
      e.preventDefault();
      
      evt.status = document.getElementById('edit-e-status').value;
      evt.venue = document.getElementById('edit-e-venue').value;
      evt.notes = document.getElementById('edit-e-notes').value;
      
      DB.updateEvent(evt);
      showToast('Event settings applied');
      initEventSelector();
      closeModal();
    });
  });
}

function openAddEmployeeModal(existingEmp = null) {
  const isEdit = !!existingEmp;
  const html = `
    <div class="sheet-header">
      <h2>${isEdit ? 'Configure Employee Permissions' : 'Register Employee'}</h2>
      <button class="btn btn-text" id="close-emp-modal" style="min-height:32px; padding:4px;">Cancel</button>
    </div>

    <form id="emp-form">
      <div class="form-group">
        <label class="form-label">Full Name</label>
        <input type="text" class="form-control" id="emp-name" required value="${isEdit ? existingEmp.name : ''}">
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" class="form-control" id="emp-email" required value="${isEdit ? existingEmp.email : ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Phone</label>
          <input type="tel" class="form-control" id="emp-phone" required placeholder="+91" value="${isEdit ? existingEmp.phone : ''}">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group" style="flex: 1;">
          <label class="form-label">Access Role Permission</label>
          <select class="form-control" id="emp-role" style="background:#fff;">
            <option value="Admin" ${isEdit && existingEmp.role === 'Admin' ? 'selected' : ''}>Admin (Founder/Manager)</option>
            <option value="Event Manager" ${isEdit && existingEmp.role === 'Event Manager' ? 'selected' : ''}>Event Manager</option>
            <option value="Finance Team" ${isEdit && existingEmp.role === 'Finance Team' ? 'selected' : ''}>Finance Team</option>
          </select>
        </div>
        <div class="form-group" style="flex: 1;">
          <label class="form-label">Password</label>
          <input type="text" class="form-control" id="emp-password" required value="${isEdit ? existingEmp.password : 'welcome123'}" placeholder="Enter access password">
        </div>
      </div>

      <button type="submit" class="btn btn-primary" style="width:100%; margin-top:10px;">
        ${isEdit ? 'Save Settings' : 'Create Personnel profile'}
      </button>
    </form>
  `;

  showModal(html, () => {
    document.getElementById('close-emp-modal').addEventListener('click', closeModal);
    
    document.getElementById('emp-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const eData = {
        name: document.getElementById('emp-name').value,
        email: document.getElementById('emp-email').value,
        phone: document.getElementById('emp-phone').value,
        role: document.getElementById('emp-role').value,
        password: document.getElementById('emp-password').value,
        assignedEvents: isEdit ? existingEmp.assignedEvents : [state.activeEventId]
      };

      if (supabase && !isEdit) {
        showToast('Syncing employee to Supabase...');
        try {
          const url = localStorage.getItem('supabase_url') || 'https://josxubvlvwcjtuxiqwhg.supabase.co';
          const key = localStorage.getItem('supabase_key') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impvc3h1YnZsdndjanR1eGlxd2hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1MzY1NjcsImV4cCI6MjA5ODExMjU2N30.dSFIEFfU9dYa2U69tWGb0RkO57eu2oZH0GX1HlVSIOQ';
          
          const tempClient = window.supabase.createClient(url, key, {
            auth: { persistSession: false }
          });
          
          const { data, error } = await tempClient.auth.signUp({
            email: eData.email,
            password: eData.password,
            options: {
              data: {
                name: eData.name,
                role: eData.role,
                phone: eData.phone
              }
            }
          });
          
          if (error) {
            showToast('Supabase Sync Failed: ' + error.message, 'error');
            return;
          }
          
          if (data && data.user) {
            eData.id = data.user.id;
          }
          showToast('Employee synced to Supabase Auth');
        } catch (err) {
          console.error("Supabase user creation failed", err);
          showToast('Failed to sync to Supabase: ' + err.message, 'error');
          return;
        }
      }

      if (isEdit) {
        eData.id = existingEmp.id;
        DB.updateEmployee(eData);
        showToast('Personnel profile updated');
      } else {
        DB.addEmployee(eData);
        showToast('New employee registered');
      }

      closeModal();
      if (state.currentView === 'admin') {
        renderView('admin');
      }
    });
  });
}

function openEditEmployeeModal(empId) {
  const employees = DB.getEmployees();
  const emp = employees.find(x => x.id === empId);
  if (emp) openAddEmployeeModal(emp);
}

// Format Utilities
function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ----------------------------------------------------
// ADMIN DASHBOARD CORE RENDERING FUNCTIONS
// ----------------------------------------------------

function renderAdminDashboard() {
  const activeEvent = DB.getEvents().find(e => e.id === state.activeEventId);
  const subTab = state.adminSubTab || 'general';

  let subTabsHtml = `
    <div style="margin-bottom: 20px;">
      <h1 style="font-weight: 800; font-size: 26px;">Admin Terminal</h1>
      <p style="color: var(--text-muted); font-size: 13px;">Management Control: <strong>${activeEvent ? activeEvent.name : 'System view'}</strong></p>
    </div>

    <div class="admin-tab-bar">
      <button class="admin-tab-btn ${subTab === 'general' ? 'active' : ''}" data-tab="general">General & Analytics</button>
      <button class="admin-tab-btn ${subTab === 'finances' ? 'active' : ''}" data-tab="finances">Revenue & Expenses</button>
      <button class="admin-tab-btn ${subTab === 'crm' ? 'active' : ''}" data-tab="crm">Clients & Vendors</button>
      <button class="admin-tab-btn ${subTab === 'logs' ? 'active' : ''}" data-tab="logs">Activity Logs</button>
      <button class="admin-tab-btn ${subTab === 'exports' ? 'active' : ''}" data-tab="exports">Reports & Exports</button>
    </div>

    <div id="admin-sub-viewport"></div>
  `;

  DOM.viewport.innerHTML = subTabsHtml;
  const subViewport = document.getElementById('admin-sub-viewport');

  switch (subTab) {
    case 'general':
      renderAdminGeneral(subViewport);
      break;
    case 'finances':
      renderAdminFinances(subViewport);
      break;
    case 'crm':
      renderAdminCRM(subViewport);
      break;
    case 'logs':
      renderAdminLogs(subViewport);
      break;
    case 'exports':
      renderAdminExports(subViewport);
      break;
  }

  // Bind sub-tabs clicks
  DOM.viewport.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      state.adminSubTab = e.currentTarget.dataset.tab;
      renderAdminDashboard();
    });
  });
}

function renderAdminGeneral(container) {
  const ana = DB.getAnalytics(state.activeEventId);
  const guests = DB.getGuests().filter(g => g.eventId === state.activeEventId);
  
  // Categories breakdown
  const categories = ['VVIP', 'VIP', 'Media', 'General'];
  const breakdown = categories.map(cat => {
    const list = guests.filter(g => g.category === cat);
    const confirmed = list.filter(g => g.rsvpStatus === 'Confirmed').length;
    const checked = list.filter(g => g.checkInStatus === 'Checked In').length;
    return { cat, total: list.length, confirmed, checked };
  });

  // Team workload performance
  const tasks = DB.getTasks().filter(t => t.eventId === state.activeEventId);
  const employees = DB.getEmployees();
  const performance = employees.map(emp => {
    const empTasks = tasks.filter(t => t.assignedEmployeeId === emp.id);
    const completed = empTasks.filter(t => t.status === 'Completed').length;
    const rate = empTasks.length > 0 ? Math.round((completed / empTasks.length) * 100) : 0;
    return { name: emp.name, role: emp.role, total: empTasks.length, completed, rate };
  });

  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-label">Checked-In / Expected</span>
        <span class="stat-value">${ana.checkedInAttendees} / ${ana.expectedAttendees}</span>
        <span class="stat-desc">Checked-in heads total</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Attendance Rate</span>
        <span class="stat-value">${ana.attendanceRate}%</span>
        <div style="width:100%; background:#e4e4e7; height:4px; border-radius:2px; margin-top:4px; overflow:hidden;">
          <div style="background:#09090b; width:${ana.attendanceRate}%; height:100%;"></div>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-label">Total Invitations</span>
        <span class="stat-value">${ana.totalGuests}</span>
        <span class="stat-desc">Confirmed RSVPs: ${ana.rsvpConfirmed}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Task Checklist</span>
        <span class="stat-value">${ana.completedTasks} / ${ana.totalTasks}</span>
        <span class="stat-desc">${ana.taskCompletionRate}% Operational Tasks</span>
      </div>
    </div>

    <div class="tasks-board" style="margin-top: 20px;">
      <div>
        <h2>Guest Segment Analytics</h2>
        <div class="admin-table-container">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>RSVPs</th>
                <th>Checked In</th>
                <th>Arrival Ratio</th>
              </tr>
            </thead>
            <tbody>
              ${breakdown.map(b => {
                const ratio = b.confirmed > 0 ? Math.round((b.checked / b.confirmed) * 100) : 0;
                return `
                  <tr>
                    <td><span class="badge ${b.cat.toLowerCase()}">${b.cat}</span></td>
                    <td><strong>${b.confirmed}</strong> <span style="color:var(--text-light)">/ ${b.total}</span></td>
                    <td><strong>${b.checked}</strong></td>
                    <td><strong>${ratio}%</strong></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2>Team Workload Tracker</h2>
        <div class="admin-table-container">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Tasks Completed</th>
                <th>Efficiency</th>
              </tr>
            </thead>
            <tbody>
              ${performance.map(p => `
                <tr>
                  <td><strong>${p.name}</strong></td>
                  <td><span style="font-size:11px; color:var(--text-muted);">${p.role}</span></td>
                  <td><strong>${p.completed}</strong> <span style="color:var(--text-light)">/ ${p.total}</span></td>
                  <td>
                    <span style="font-weight:700; color: ${p.rate > 70 ? '#166534' : p.rate > 30 ? '#9a3412' : '#991b1b'}">${p.rate}%</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="card" style="background-color: var(--text-primary); color: var(--bg-primary); border: none; padding: 18px; margin-top: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <div>
          <h3 style="font-size: 16px; font-weight: 700; color: #fff;">Venue Gate Scanning</h3>
          <p style="color: var(--text-light); font-size: 11px; margin-top: 2px;">Launch real-time check-in HUD to scan QR codes</p>
        </div>
      </div>
      <button class="btn btn-primary" id="admin-gate-btn" style="background-color: #fff; color: var(--text-primary); border: none; width: 100%; font-weight: 700;">
        Launch Camera HUD
      </button>
    </div>
  `;

  document.getElementById('admin-gate-btn').addEventListener('click', () => {
    renderView('scan');
  });
}

function renderAdminFinances(container) {
  const finances = DB.getFinances().filter(f => f.eventId === state.activeEventId);
  const revenueTotal = finances.filter(f => f.type === 'revenue').reduce((sum, r) => sum + r.amount, 0);
  const expenseTotal = finances.filter(f => f.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
  const netProfit = revenueTotal - expenseTotal;
  const margin = revenueTotal > 0 ? Math.round((netProfit / revenueTotal) * 100) : 0;

  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-label">Total Revenue</span>
        <span class="stat-value" style="color: #166534;">₹${revenueTotal.toLocaleString()}</span>
        <span class="stat-desc">Sponsorship & Booking Contract</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Total Expenses</span>
        <span class="stat-value" style="color: #991b1b;">₹${expenseTotal.toLocaleString()}</span>
        <span class="stat-desc">Venue, Catering & AV Cost</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Net Balance Profit</span>
        <span class="stat-value" style="color: ${netProfit >= 0 ? '#166534' : '#991b1b'};">₹${netProfit.toLocaleString()}</span>
        <span class="stat-desc">Net profit balance</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Profit Margin</span>
        <span class="stat-value">${margin}%</span>
        <div style="width:100%; background:#e4e4e7; height:4px; border-radius:2px; margin-top:4px; overflow:hidden;">
          <div style="background:${netProfit >= 0 ? '#22c55e' : '#ef4444'}; width:${Math.max(0, Math.min(100, margin))}%; height:100%;"></div>
        </div>
      </div>
    </div>

    <div class="section-header" style="margin-top:20px;">
      <h2>Financial Ledger Sheet</h2>
      <button class="btn btn-primary" id="add-finance-btn" style="min-height:32px; padding:4px 12px; font-size:11px;">Add Ledger Entry</button>
    </div>

    <div class="admin-table-container">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Category</th>
            <th>Description</th>
            <th>Amount</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${finances.length === 0 ? '<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text-muted);">No transaction logs recorded.</td></tr>' : ''}
          ${finances.map(f => `
            <tr>
              <td>${new Date(f.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</td>
              <td>
                <span class="badge" style="background-color: ${f.type === 'revenue' ? '#dcfce7' : '#fee2e2'}; color: ${f.type === 'revenue' ? '#166534' : '#991b1b'}; font-size:9px;">
                  ${f.type}
                </span>
              </td>
              <td><strong>${f.category}</strong></td>
              <td style="color: var(--text-muted);">${f.description}</td>
              <td style="font-weight:700; color: ${f.type === 'revenue' ? '#166534' : '#991b1b'}">
                ₹${f.amount.toLocaleString()}
              </td>
              <td>
                <button class="btn btn-text delete-fin-btn" style="min-height:24px; padding:2px 8px; color:#991b1b; font-size:10px;" data-id="${f.id}">
                  Remove
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('add-finance-btn').addEventListener('click', () => openAddFinanceModal());
  container.querySelectorAll('.delete-fin-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (confirm('Delete this financial log record?')) {
        DB.deleteFinanceRecord(e.target.dataset.id);
        showToast('Ledger record removed');
        renderAdminFinances(container);
      }
    });
  });
}

function renderAdminCRM(container) {
  const clients = DB.getClients();
  const vendors = DB.getVendors();

  container.innerHTML = `
    <div class="tasks-board">
      <div>
        <div class="section-header">
          <h2>Client Directory</h2>
          <button class="btn btn-primary" id="add-client-btn" style="min-height:32px; padding:4px 12px; font-size:11px;">Register Client</button>
        </div>

        <div class="admin-table-container">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Contact</th>
                <th>Events Managed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${clients.length === 0 ? '<tr><td colspan="5" style="text-align:center; padding:20px;">No registered clients.</td></tr>' : ''}
              ${clients.map(c => `
                <tr>
                  <td><strong>${c.name}</strong></td>
                  <td>${c.company}</td>
                  <td>
                    <span style="font-size:11px; color:var(--text-muted);">${c.email}</span><br/>
                    <span style="font-size:10px; color:var(--text-light);">${c.phone}</span>
                  </td>
                  <td><strong>${c.totalEvents} Total</strong></td>
                  <td>
                    <button class="btn btn-text delete-cli-btn" style="min-height:24px; padding:2px 8px; color:#991b1b; font-size:10px;" data-id="${c.id}">Remove</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div class="section-header">
          <h2>Contracted Vendors</h2>
          <button class="btn btn-primary" id="add-vendor-btn" style="min-height:32px; padding:4px 12px; font-size:11px;">Contract Vendor</button>
        </div>

        <div class="admin-table-container">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Category</th>
                <th>Contact Person</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${vendors.length === 0 ? '<tr><td colspan="5" style="text-align:center; padding:20px;">No contracted vendors.</td></tr>' : ''}
              ${vendors.map(v => `
                <tr>
                  <td><strong>${v.name}</strong></td>
                  <td><span class="badge general">${v.category}</span></td>
                  <td>
                    <strong>${v.contactPerson}</strong><br/>
                    <span style="font-size:10px; color:var(--text-muted);">${v.phone}</span>
                  </td>
                  <td>
                    <span class="badge" style="background-color: ${v.status === 'Active' ? '#f0fdf4' : '#f4f4f5'}; color: ${v.status === 'Active' ? '#166534' : '#3f3f46'};">
                      ${v.status}
                    </span>
                  </td>
                  <td>
                    <button class="btn btn-text delete-ven-btn" style="min-height:24px; padding:2px 8px; color:#991b1b; font-size:10px;" data-id="${v.id}">Remove</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.getElementById('add-client-btn').addEventListener('click', () => openAddClientModal());
  document.getElementById('add-vendor-btn').addEventListener('click', () => openAddVendorModal());
  
  container.querySelectorAll('.delete-cli-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (confirm('Delete client record?')) {
        DB.deleteClient(e.target.dataset.id);
        showToast('Client profile removed');
        renderAdminCRM(container);
      }
    });
  });

  container.querySelectorAll('.delete-ven-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (confirm('Delete vendor record?')) {
        DB.deleteVendor(e.target.dataset.id);
        showToast('Vendor profile removed');
        renderAdminCRM(container);
      }
    });
  });
}

function renderAdminLogs(container) {
  const logs = DB.getActivityLogs();

  container.innerHTML = `
    <h2>Security Audit Activity Logs</h2>
    <p style="color:var(--text-muted); font-size:12px; margin-bottom:12px;">Chronological system audit trail details</p>

    <div class="admin-table-container">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Operator</th>
            <th>Action</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          ${logs.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding:20px;">No logs recorded yet.</td></tr>' : ''}
          ${logs.map(l => `
            <tr>
              <td style="white-space:nowrap; color:var(--text-muted);">
                ${new Date(l.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
              </td>
              <td><strong>${l.user}</strong></td>
              <td>
                <span class="badge" style="background-color:var(--text-primary); color:#fff; font-size:9px; font-weight:700; border-radius:4px;">
                  ${l.action}
                </span>
              </td>
              <td style="color:var(--text-muted); font-size:11px;">${l.details}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderAdminExports(container) {
  container.innerHTML = `
    <h2>Exports and Reports</h2>
    <p style="color: var(--text-muted); font-size:12px; margin-bottom:16px;">Download system rosters directly to CSV files ready for Microsoft Excel or Google Sheets.</p>

    <div class="tasks-board">
      <div class="card" style="padding: 20px;">
        <h3 style="font-size:15px; font-weight:700; margin-bottom:6px;">Guests Attendance Roster</h3>
        <p style="font-size:12px; color:var(--text-muted); margin-bottom:16px;">Roster details containing RSVPs, attendee numbers, categories, check-in timestamps.</p>
        <button class="btn btn-primary" id="exp-guests-btn" style="width:100%;">Download Guests CSV</button>
      </div>

      <div class="card" style="padding: 20px;">
        <h3 style="font-size:15px; font-weight:700; margin-bottom:6px;">Finances Ledger Sheet</h3>
        <p style="font-size:12px; color:var(--text-muted); margin-bottom:16px;">Complete financial spreadsheet log showing transaction dates, categories, types, amounts.</p>
        <button class="btn btn-primary" id="exp-finances-btn" style="width:100%;">Download Ledger CSV</button>
      </div>

      <div class="card" style="padding: 20px;">
        <h3 style="font-size:15px; font-weight:700; margin-bottom:6px;">Operational Task checklist</h3>
        <p style="font-size:12px; color:var(--text-muted); margin-bottom:16px;">Operational status tracker containing task titles, priorities, assignees, deadlines.</p>
        <button class="btn btn-primary" id="exp-tasks-btn" style="width:100%;">Download Checklist CSV</button>
      </div>

      <div class="card" style="padding: 20px;">
        <h3 style="font-size:15px; font-weight:700; margin-bottom:6px;">System Audit Activity Logs</h3>
        <p style="font-size:12px; color:var(--text-muted); margin-bottom:16px;">Chronological audit feed details documenting operators, actions, and timestamps.</p>
        <button class="btn btn-primary" id="exp-logs-btn" style="width:100%;">Download Audit Logs CSV</button>
      </div>
    </div>
  `;

  // Bind Export Actions
  document.getElementById('exp-guests-btn').addEventListener('click', () => {
    const list = DB.getGuests().filter(g => g.eventId === state.activeEventId);
    let csv = 'ID,Name,Phone,Email,Company,Category,RSVP,Attendees,Check-In,Arrival-Time,Notes\n';
    list.forEach(g => {
      csv += `"${g.id}","${g.name}","${g.phone}","${g.email}","${g.company}","${g.category}","${g.rsvpStatus}",${g.attendeesCount},"${g.checkInStatus}","${g.checkedInAt || ''}","${g.notes || ''}"\n`;
    });
    triggerCSVDownload(csv, 'aloah_guests_roster.csv');
  });

  document.getElementById('exp-finances-btn').addEventListener('click', () => {
    const list = DB.getFinances().filter(f => f.eventId === state.activeEventId);
    let csv = 'ID,Date,Type,Category,Description,Amount\n';
    list.forEach(f => {
      csv += `"${f.id}","${f.date}","${f.type}","${f.category}","${f.description}",${f.amount}\n`;
    });
    triggerCSVDownload(csv, 'aloah_financials.csv');
  });

  document.getElementById('exp-tasks-btn').addEventListener('click', () => {
    const list = DB.getTasks().filter(t => t.eventId === state.activeEventId);
    const employees = DB.getEmployees();
    let csv = 'ID,Title,Description,Priority,Due Date,Assignee,Status\n';
    list.forEach(t => {
      const emp = employees.find(e => e.id === t.assignedEmployeeId);
      csv += `"${t.id}","${t.title}","${t.description}","${t.priority}","${t.dueDate}","${emp ? emp.name : 'Unassigned'}","${t.status}"\n`;
    });
    triggerCSVDownload(csv, 'aloah_operational_checklist.csv');
  });

  document.getElementById('exp-logs-btn').addEventListener('click', () => {
    const list = DB.getActivityLogs();
    let csv = 'ID,Timestamp,User,Action,Details\n';
    list.forEach(l => {
      csv += `"${l.id}","${l.timestamp}","${l.user}","${l.action}","${l.details}"\n`;
    });
    triggerCSVDownload(csv, 'aloah_system_audit_logs.csv');
  });
}

function triggerCSVDownload(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast(`Exported ${filename}`);
}

function openAddFinanceModal() {
  const html = `
    <div class="sheet-header">
      <h2>Add Ledger Entry</h2>
      <button class="btn btn-text" id="close-f-modal" style="min-height:32px; padding:4px;">Cancel</button>
    </div>

    <form id="finance-form">
      <div class="form-group">
        <label class="form-label">Ledger Entry Type</label>
        <select class="form-control" id="fin-type" style="background:#fff;">
          <option value="revenue">Revenue (Income)</option>
          <option value="expense">Expense (Outflow)</option>
        </select>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Category</label>
          <input type="text" class="form-control" id="fin-category" required placeholder="e.g. Catering, AV, Booking">
        </div>
        <div class="form-group">
          <label class="form-label">Amount (INR)</label>
          <input type="number" class="form-control" id="fin-amount" required placeholder="₹">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Transaction Description</label>
        <input type="text" class="form-control" id="fin-desc" required placeholder="Details about this payment...">
      </div>

      <button type="submit" class="btn btn-primary" style="width:100%; margin-top:10px;">
        Save Ledger Record
      </button>
    </form>
  `;

  showModal(html, () => {
    document.getElementById('close-f-modal').addEventListener('click', closeModal);
    
    document.getElementById('finance-form').addEventListener('submit', (e) => {
      e.preventDefault();
      
      DB.addFinanceRecord({
        eventId: state.activeEventId,
        type: document.getElementById('fin-type').value,
        category: document.getElementById('fin-category').value,
        amount: parseFloat(document.getElementById('fin-amount').value),
        description: document.getElementById('fin-desc').value
      });

      showToast('Ledger sheet updated');
      closeModal();
    });
  });
}

function openAddClientModal() {
  const html = `
    <div class="sheet-header">
      <h2>Register Client</h2>
      <button class="btn btn-text" id="close-c-modal" style="min-height:32px; padding:4px;">Cancel</button>
    </div>

    <form id="client-form">
      <div class="form-group">
        <label class="form-label">Client Name</label>
        <input type="text" class="form-control" id="cli-name" required placeholder="First and last name">
      </div>

      <div class="form-group">
        <label class="form-label">Client Company</label>
        <input type="text" class="form-control" id="cli-company" required placeholder="Company name">
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" class="form-control" id="cli-email" required placeholder="name@domain.com">
        </div>
        <div class="form-group">
          <label class="form-label">Phone</label>
          <input type="tel" class="form-control" id="cli-phone" required placeholder="+91">
        </div>
      </div>

      <button type="submit" class="btn btn-primary" style="width:100%; margin-top:10px;">
        Register Client
      </button>
    </form>
  `;

  showModal(html, () => {
    document.getElementById('close-c-modal').addEventListener('click', closeModal);
    
    document.getElementById('client-form').addEventListener('submit', (e) => {
      e.preventDefault();
      
      DB.addClient({
        name: document.getElementById('cli-name').value,
        company: document.getElementById('cli-company').value,
        email: document.getElementById('cli-email').value,
        phone: document.getElementById('cli-phone').value
      });

      showToast('Client directory updated');
      closeModal();
    });
  });
}

function openAddVendorModal() {
  const html = `
    <div class="sheet-header">
      <h2>Contract Vendor</h2>
      <button class="btn btn-text" id="close-v-modal" style="min-height:32px; padding:4px;">Cancel</button>
    </div>

    <form id="vendor-form">
      <div class="form-group">
        <label class="form-label">Vendor Business Name</label>
        <input type="text" class="form-control" id="ven-name" required placeholder="e.g. Star AV systems">
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Service Classification</label>
          <select class="form-control" id="ven-category" style="background:#fff;">
            <option value="Catering">Catering</option>
            <option value="AV/Light">AV/Light</option>
            <option value="Security">Security</option>
            <option value="Floral">Floral</option>
            <option value="Production">Production</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-control" id="ven-status" style="background:#fff;">
            <option value="Active">Active</option>
            <option value="On Hold">On Hold</option>
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Contact Person</label>
          <input type="text" class="form-control" id="ven-contact" required placeholder="Rep Name">
        </div>
        <div class="form-group">
          <label class="form-label">Phone Number</label>
          <input type="tel" class="form-control" id="ven-phone" required placeholder="+91">
        </div>
      </div>

      <button type="submit" class="btn btn-primary" style="width:100%; margin-top:10px;">
        Contract Vendor
      </button>
    </form>
  `;

  showModal(html, () => {
    document.getElementById('close-v-modal').addEventListener('click', closeModal);
    
    document.getElementById('vendor-form').addEventListener('submit', (e) => {
      e.preventDefault();
      
      DB.addVendor({
        name: document.getElementById('ven-name').value,
        category: document.getElementById('ven-category').value,
        status: document.getElementById('ven-status').value,
        contactPerson: document.getElementById('ven-contact').value,
        phone: document.getElementById('ven-phone').value
      });

      showToast('Vendor contracted');
      closeModal();
    });
  });
}

// Dynamic role-based navigation display manager
function updateNavigationPermissions() {
  const role = state.activeRole;
  
  // Tabs visible for each role
  const permissions = {
    'Admin': ['home', 'events', 'guests', 'tasks', 'finances', 'profile'],
    'Event Manager': ['home', 'events', 'guests', 'tasks', 'profile'],
    'Finance Team': ['home', 'events', 'finances', 'profile']
  };

  const allowedTabs = permissions[role] || ['home', 'events', 'profile'];

  // Query and toggle display for both desktop links and bottom mobile buttons
  document.querySelectorAll('.nav-item').forEach(item => {
    const navName = item.dataset.nav;
    if (navName) {
      if (allowedTabs.includes(navName)) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    }
  });
}

function renderFinancesView() {
  DOM.viewport.innerHTML = `
    <div style="margin-bottom: 20px;">
      <h1 style="font-weight: 800; font-size: 26px;">Finances Ledger</h1>
      <p style="color: var(--text-muted); font-size: 13px;">Event financial ledger records and accounts</p>
    </div>
    <div id="finance-sub-viewport"></div>
  `;
  renderAdminFinances(document.getElementById('finance-sub-viewport'));
}

// ----------------------------------------------------
// EVENT MODULE DETAILED SUB-VIEW
// ----------------------------------------------------

function renderEventDetail(eventId) {
  const evt = DB.getEvents().find(e => e.id === eventId);
  if (!evt) {
    renderEvents();
    return;
  }

  // Fetch associations
  const allEmployees = DB.getEmployees();
  const assignedTeam = allEmployees.filter(emp => (evt.assignedTeam || []).includes(emp.id));
  
  const allVendors = DB.getVendors();
  const assignedVendors = allVendors.filter(v => (evt.vendors || []).includes(v.id));

  const guests = DB.getGuests().filter(g => g.eventId === eventId);
  const expectedPax = guests.filter(g => g.rsvpStatus === 'Confirmed').reduce((sum, g) => sum + g.attendeesCount, 0);

  const timelines = DB.getTimelines().filter(t => t.eventId === eventId).sort((a, b) => a.time.localeCompare(b.time));
  const documents = DB.getDocuments().filter(d => d.eventId === eventId);

  const canEdit = ['Admin', 'Event Manager', 'Operations Manager'].includes(state.activeRole);

  let html = `
    <button class="btn btn-text" id="back-to-events-btn" style="min-height:36px; padding:0 8px; margin-bottom:16px;">
      ← Back to Events List
    </button>

    <div class="card" style="padding:24px; margin-bottom:20px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
        <div>
          <span class="badge status ${evt.status.toLowerCase()}">${evt.status}</span>
          <h2 style="font-size:24px; font-weight:800; margin-top:6px; margin-bottom:2px;">${evt.name}</h2>
          <span style="color:var(--text-muted); font-size:13px;">Client: <strong>${evt.clientName}</strong></span>
        </div>
        ${canEdit ? `<button class="btn btn-text" id="edit-event-details-btn" style="min-height:32px; padding:4px 12px; font-size:11px; border:1px solid var(--border-color);">Settings</button>` : ''}
      </div>

      <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:12px; font-size:12px; margin-top:16px; padding-top:16px; border-top:1px solid var(--border-color);">
        <div>
          <span style="color:var(--text-light); display:block; margin-bottom:2px;">Venue Location</span>
          <strong>${evt.venue}</strong>
        </div>
        <div>
          <span style="color:var(--text-light); display:block; margin-bottom:2px;">Event Schedule</span>
          <strong>${new Date(evt.dateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</strong>
        </div>
        <div>
          <span style="color:var(--text-light); display:block; margin-bottom:2px;">Budget Allocated</span>
          <strong>${evt.budget}</strong>
        </div>
        <div>
          <span style="color:var(--text-light); display:block; margin-bottom:2px;">Guest Registry</span>
          <strong>${guests.length} profiles (${expectedPax} Expected Pax)</strong>
        </div>
      </div>
      
      <div style="font-size:12px; margin-top:12px;">
        <span style="color:var(--text-light); display:block; margin-bottom:2px;">Event Brief & Notes</span>
        <span>${evt.notes || 'No description notes.'}</span>
      </div>
    </div>

    <!-- Details Sections Grid -->
    <div class="tasks-board">
      
      <!-- Team Crew and Vendors -->
      <div style="display:flex; flex-direction:column; gap:20px;">
        <!-- Team Crew Card -->
        <div class="card" style="margin-bottom:0;">
          <div class="section-header" style="margin-bottom:12px;">
            <h3 style="font-size:15px; font-weight:700;">Assigned Team Crew</h3>
            ${canEdit ? `<button class="btn btn-text" id="assign-crew-btn" style="min-height:28px; padding:2px 8px; font-size:10px; border:1px solid var(--border-color);">Allocate</button>` : ''}
          </div>
          
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${assignedTeam.length === 0 ? '<div style="color:var(--text-muted); font-size:11px;">No crew allocated yet.</div>' : ''}
            ${assignedTeam.map(t => `
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; padding:4px 0;">
                <strong>${t.name}</strong>
                <span style="color:var(--text-muted); font-size:11px;">${t.role}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Vendor Allocation Card -->
        <div class="card" style="margin-bottom:0;">
          <div class="section-header" style="margin-bottom:12px;">
            <h3 style="font-size:15px; font-weight:700;">Hired Event Vendors</h3>
            ${canEdit ? `<button class="btn btn-text" id="assign-vendor-btn" style="min-height:28px; padding:2px 8px; font-size:10px; border:1px solid var(--border-color);">Contract</button>` : ''}
          </div>

          <div style="display:flex; flex-direction:column; gap:8px;">
            ${assignedVendors.length === 0 ? '<div style="color:var(--text-muted); font-size:11px;">No vendor contracted for this event.</div>' : ''}
            ${assignedVendors.map(v => `
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; padding:4px 0;">
                <div>
                  <strong>${v.name}</strong>
                  <span style="display:block; font-size:10px; color:var(--text-light);">${v.category}</span>
                </div>
                <span class="badge" style="background-color:#f0fdf4; color:#166534; font-size:9px;">Active</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Schedule Timeline Milestones -->
      <div class="card" style="margin-bottom:0;">
        <div class="section-header" style="margin-bottom:12px;">
          <h3 style="font-size:15px; font-weight:700;">Schedule Milestones</h3>
          ${canEdit ? `<button class="btn btn-text" id="add-timeline-btn" style="min-height:28px; padding:2px 8px; font-size:10px; border:1px solid var(--border-color);">Add Stage</button>` : ''}
        </div>

        <div style="display:flex; flex-direction:column; gap:10px;">
          ${timelines.length === 0 ? '<div style="color:var(--text-muted); font-size:11px;">No milestones scheduled.</div>' : ''}
          ${timelines.map(t => {
            const isCompleted = t.status === 'Completed';
            return `
              <div class="task-row" style="padding:10px; margin-bottom:0; opacity:${isCompleted ? '0.7' : '1'}">
                <input type="checkbox" class="timeline-checkbox" data-id="${t.id}" ${isCompleted ? 'checked' : ''} ${!canEdit ? 'disabled' : ''} aria-label="Mark schedule item complete">
                <div style="flex:1; display:flex; flex-direction:column; font-size:12px; gap:2px;">
                  <span style="font-weight:700; text-decoration:${isCompleted ? 'line-through' : 'none'};">${t.time} - ${t.title}</span>
                </div>
                ${canEdit ? `<button class="btn btn-text delete-timeline-btn" style="min-height:24px; padding:0 4px; font-size:10px; color:#991b1b;" data-id="${t.id}">✕</button>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>

    </div>

    <!-- Document Vault Card (Spans full width below) -->
    <div class="card" style="margin-top:20px; padding:20px;">
      <div class="section-header" style="margin-bottom:16px;">
        <h3 style="font-size:15px; font-weight:700;">Document Vault</h3>
        <button class="btn btn-primary" id="upload-doc-btn" style="min-height:32px; padding:4px 12px; font-size:11px;">Upload Agreement</button>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:12px;">
        ${documents.length === 0 ? '<div style="color:var(--text-muted); font-size:11px; grid-column: 1/-1;">No documents uploaded.</div>' : ''}
        ${documents.map(d => {
          let fileColor = '#3b82f6'; // Blue for PDF fallback
          if (d.type === 'xlsx') fileColor = '#10b981'; // Green Excel
          if (d.type === 'pdf') fileColor = '#ef4444'; // Red PDF
          
          return `
            <div class="card" style="margin-bottom:0; padding:12px; display:flex; align-items:center; gap:12px; background-color:var(--bg-secondary);">
              <div style="width:36px; height:36px; border-radius:8px; background-color:${fileColor}22; color:${fileColor}; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:10px; text-transform:uppercase;">
                ${d.type}
              </div>
              <div style="flex:1; min-width:0; font-size:12px;">
                <strong style="display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${d.name}">${d.name}</strong>
                <span style="font-size:10px; color:var(--text-muted);">${d.size} • ${new Date(d.uploadedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
              </div>
              <button class="btn btn-text delete-doc-btn" style="min-height:28px; padding:0 8px; font-size:11px; color:#991b1b;" data-id="${d.id}">Delete</button>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  DOM.viewport.innerHTML = html;

  // Bind Actions
  document.getElementById('back-to-events-btn').addEventListener('click', () => {
    renderView('events');
  });

  if (canEdit) {
    document.getElementById('edit-event-details-btn').addEventListener('click', () => {
      openEditEventModal(eventId);
    });

    document.getElementById('assign-crew-btn').addEventListener('click', () => {
      openAssignTeamModal(evt);
    });

    document.getElementById('assign-vendor-btn').addEventListener('click', () => {
      openAssignVendorModal(evt);
    });

    document.getElementById('add-timeline-btn').addEventListener('click', () => {
      openAddTimelineModal(eventId);
    });

    // Milestone Toggles
    DOM.viewport.querySelectorAll('.timeline-checkbox').forEach(box => {
      box.addEventListener('change', (e) => {
        DB.toggleTimelineItem(e.target.dataset.id);
        renderEventDetail(eventId);
      });
    });

    // Milestone Deletions
    DOM.viewport.querySelectorAll('.delete-timeline-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        DB.deleteTimelineItem(e.target.dataset.id);
        renderEventDetail(eventId);
      });
    });
  }

  // Upload Document Trigger
  document.getElementById('upload-doc-btn').addEventListener('click', () => {
    openUploadDocModal(eventId);
  });

  // Delete Document Trigger
  DOM.viewport.querySelectorAll('.delete-doc-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (confirm('Delete this file from document vault?')) {
        DB.deleteDocument(e.target.dataset.id);
        showToast('Document removed');
        renderEventDetail(eventId);
      }
    });
  });
}

function openAssignTeamModal(evt) {
  const employees = DB.getEmployees();
  
  const html = `
    <div class="sheet-header">
      <h2>Allocate Crew Members</h2>
      <button class="btn btn-text" id="close-team-alloc" style="min-height:32px; padding:4px;">Cancel</button>
    </div>

    <form id="team-alloc-form">
      <div style="max-height:250px; overflow-y:auto; display:flex; flex-direction:column; gap:10px; margin-bottom:20px;">
        ${employees.map(emp => {
          const isAllocated = (evt.assignedTeam || []).includes(emp.id);
          return `
            <label style="display:flex; align-items:center; gap:12px; font-size:13px; cursor:pointer;">
              <input type="checkbox" name="crew" value="${emp.id}" ${isAllocated ? 'checked' : ''} style="width:16px; height:16px;">
              <div>
                <strong>${emp.name}</strong><br/>
                <span style="font-size:11px; color:var(--text-muted);">${emp.role}</span>
              </div>
            </label>
          `;
        }).join('')}
      </div>

      <button type="submit" class="btn btn-primary" style="width:100%;">
        Save Team Allocations
      </button>
    </form>
  `;

  showModal(html, () => {
    document.getElementById('close-team-alloc').addEventListener('click', closeModal);
    
    document.getElementById('team-alloc-form').addEventListener('submit', (e) => {
      e.preventDefault();
      
      const selectedCrew = Array.from(e.target.elements.crew)
        .filter(c => c.checked)
        .map(c => c.value);

      evt.assignedTeam = selectedCrew;
      DB.updateEvent(evt);
      
      showToast('Crew allocations saved');
      closeModal();
      renderEventDetail(evt.id);
    });
  });
}

function openAssignVendorModal(evt) {
  const vendors = DB.getVendors().filter(v => v.status === 'Active');

  const html = `
    <div class="sheet-header">
      <h2>Contract Vendors</h2>
      <button class="btn btn-text" id="close-ven-alloc" style="min-height:32px; padding:4px;">Cancel</button>
    </div>

    <form id="ven-alloc-form">
      <div style="max-height:250px; overflow-y:auto; display:flex; flex-direction:column; gap:10px; margin-bottom:20px;">
        ${vendors.length === 0 ? '<div style="font-size:12px; color:var(--text-muted);">No active vendors contracted. Contract one in Clients & Vendors.</div>' : ''}
        ${vendors.map(v => {
          const isAllocated = (evt.vendors || []).includes(v.id);
          return `
            <label style="display:flex; align-items:center; gap:12px; font-size:13px; cursor:pointer;">
              <input type="checkbox" name="vendor" value="${v.id}" ${isAllocated ? 'checked' : ''} style="width:16px; height:16px;">
              <div>
                <strong>${v.name}</strong><br/>
                <span style="font-size:11px; color:var(--text-muted);">${v.category} - Rep: ${v.contactPerson}</span>
              </div>
            </label>
          `;
        }).join('')}
      </div>

      <button type="submit" class="btn btn-primary" style="width:100%;">
        Save Vendor Contracts
      </button>
    </form>
  `;

  showModal(html, () => {
    document.getElementById('close-ven-alloc').addEventListener('click', closeModal);
    
    document.getElementById('ven-alloc-form').addEventListener('submit', (e) => {
      e.preventDefault();
      
      const selectedVendors = Array.from(e.target.elements.vendor || [])
        .filter(v => v.checked)
        .map(v => v.value);

      evt.vendors = selectedVendors;
      DB.updateEvent(evt);

      showToast('Vendor contract lists updated');
      closeModal();
      renderEventDetail(evt.id);
    });
  });
}

function openAddTimelineModal(eventId) {
  const html = `
    <div class="sheet-header">
      <h2>Add Schedule Stage</h2>
      <button class="btn btn-text" id="close-time-modal" style="min-height:32px; padding:4px;">Cancel</button>
    </div>

    <form id="timeline-form">
      <div class="form-row">
        <div class="form-group" style="flex:1;">
          <label class="form-label">Time Slot</label>
          <input type="time" class="form-control" id="time-val" required>
        </div>
        <div class="form-group" style="flex:2;">
          <label class="form-label">Milestone / Stage Title</label>
          <input type="text" class="form-control" id="time-title" required placeholder="e.g. Stage welcome panel opens">
        </div>
      </div>

      <button type="submit" class="btn btn-primary" style="width:100%; margin-top:10px;">
        Register Stage Milestone
      </button>
    </form>
  `;

  showModal(html, () => {
    document.getElementById('close-time-modal').addEventListener('click', closeModal);
    
    document.getElementById('timeline-form').addEventListener('submit', (e) => {
      e.preventDefault();
      
      DB.addTimelineItem({
        eventId: eventId,
        time: document.getElementById('time-val').value,
        title: document.getElementById('time-title').value
      });

      showToast('Timeline updated');
      closeModal();
      renderEventDetail(eventId);
    });
  });
}

function openUploadDocModal(eventId) {
  const html = `
    <div class="sheet-header">
      <h2>Upload Document Vault Agreement</h2>
      <button class="btn btn-text" id="close-doc-modal" style="min-height:32px; padding:4px;">Cancel</button>
    </div>

    <form id="doc-upload-form">
      <div class="form-group">
        <label class="form-label">File Title Name</label>
        <input type="text" class="form-control" id="doc-name" required placeholder="e.g. Ballroom_SeatingPlan_V2">
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">File Type Extension</label>
          <select class="form-control" id="doc-type" style="background:#fff;">
            <option value="pdf">PDF Document (.pdf)</option>
            <option value="xlsx">Excel Spreadsheet (.xlsx)</option>
            <option value="png">Image Asset (.png)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Simulated File Size</label>
          <input type="text" class="form-control" id="doc-size" placeholder="e.g. 1.8 MB" required value="1.5 MB">
        </div>
      </div>

      <div class="card" style="padding:20px; text-align:center; border:2px dashed var(--border-color); background-color:var(--bg-secondary); margin-bottom:16px;">
        <svg style="width:32px; height:32px; stroke:var(--text-light); fill:none; margin:0 auto 8px auto;" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <span style="font-size:11px; color:var(--text-muted);">Simulate local file selector attach trigger</span>
      </div>

      <button type="submit" class="btn btn-primary" style="width:100%;">
        Trigger Document Upload
      </button>
    </form>
  `;

  showModal(html, () => {
    document.getElementById('close-doc-modal').addEventListener('click', closeModal);
    
    document.getElementById('doc-upload-form').addEventListener('submit', (e) => {
      e.preventDefault();
      
      const docName = document.getElementById('doc-name').value;
      const docType = document.getElementById('doc-type').value;
      const docSize = document.getElementById('doc-size').value;

      DB.addDocument({
        eventId: eventId,
        name: docName.endsWith('.' + docType) ? docName : docName + '.' + docType,
        type: docType,
        size: docSize
      });

      showToast('Document uploaded successfully');
      closeModal();
      renderEventDetail(eventId);
    });
  });
}

function initSupabase() {
  if (localStorage.getItem('supabase_setup_initialized') !== 'v3') {
    localStorage.removeItem('supabase_disconnected');
    localStorage.removeItem('supabase_url');
    localStorage.removeItem('supabase_key');
    localStorage.setItem('supabase_setup_initialized', 'v3');
  }
  
  const isDisconnected = localStorage.getItem('supabase_disconnected') === 'true';
  const defaultUrl = 'https://josxubvlvwcjtuxiqwhg.supabase.co';
  const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impvc3h1YnZsdndjanR1eGlxd2hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1MzY1NjcsImV4cCI6MjA5ODExMjU2N30.dSFIEFfU9dYa2U69tWGb0RkO57eu2oZH0GX1HlVSIOQ';
  
  const url = isDisconnected ? null : (localStorage.getItem('supabase_url') || defaultUrl);
  const key = isDisconnected ? null : (localStorage.getItem('supabase_key') || defaultKey);
  const badge = document.getElementById('supabase-status-badge');
  
  if (url && key) {
    try {
      if (!window.supabase) {
        throw new Error("Supabase JS SDK library not loaded");
      }
      supabase = window.supabase.createClient(url, key);
      
      if (badge) {
        badge.textContent = 'Connected';
        badge.style.backgroundColor = '#10b981';
      }
      
      if (document.getElementById('sb-url')) document.getElementById('sb-url').value = url;
      if (document.getElementById('sb-key')) document.getElementById('sb-key').value = key;
      return true;
    } catch (e) {
      console.error("Supabase fail", e);
      if (badge) {
        badge.textContent = 'Error';
        badge.style.backgroundColor = '#ef4444';
      }
      supabase = null;
      return false;
    }
  } else {
    if (badge) {
      badge.textContent = 'Offline';
      badge.style.backgroundColor = '#71717a';
    }
    supabase = null;
    return false;
  }
}




