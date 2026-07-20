// Aloah Events - LocalStorage Database Manager & Seed Data

const DB_KEYS = {
  EMPLOYEES: 'aloah_employees',
  EVENTS: 'aloah_events',
  GUESTS: 'aloah_guests',
  TASKS: 'aloah_tasks',
  NOTIFICATIONS: 'aloah_notifications',
  CHECKINS: 'aloah_checkins',
  CLIENTS: 'aloah_clients',
  VENDORS: 'aloah_vendors',
  FINANCES: 'aloah_finances',
  ACTIVITY_LOGS: 'aloah_activity_logs',
  TIMELINES: 'aloah_timelines',
  DOCUMENTS: 'aloah_documents'
};

// Seed Data
const DEFAULT_EMPLOYEES = [
  { id: 'emp-1', name: 'Jai Goel', role: 'Admin', phone: '+91 98765 43210', email: 'jaigoel2206@gmail.com', password: 'jaigoel2006', assignedEvents: ['evt-1', 'evt-2', 'evt-3'] },
  { id: 'emp-2', name: 'Rohan Mehta', role: 'Event Manager', phone: '+91 98123 45678', email: 'rohan@aloahevents.com', password: 'manager123', assignedEvents: ['evt-1', 'evt-2'] },
  { id: 'emp-3', name: 'Rajesh Gupta', role: 'Finance Team', phone: '+91 93344 55667', email: 'rajesh@aloahevents.com', password: 'finance123', assignedEvents: ['evt-1', 'evt-2'] }
];

const DEFAULT_EVENTS = [
  {
    id: 'evt-1',
    name: 'Vogue Luxury Gala 2026',
    clientName: 'Condé Nast India',
    venue: 'Taj Palace, New Delhi',
    dateTime: '2026-06-27T19:30',
    status: 'Live',
    assignedTeam: ['emp-1', 'emp-2', 'emp-3', 'emp-4'],
    guestCount: 22,
    notes: 'Premium luxury styling requested. Champagne reception followed by award ceremony.',
    budget: '₹4,500,000'
  },
  {
    id: 'evt-2',
    name: 'Sotheby Art Auction & Dinner',
    clientName: 'Sotheby’s South Asia',
    venue: 'The Oberoi, Mumbai',
    dateTime: '2026-06-29T18:00',
    status: 'Confirmed',
    assignedTeam: ['emp-1', 'emp-2', 'emp-4', 'emp-5'],
    guestCount: 12,
    notes: 'Seated dinner for elite collectors. Setup high security for art displays.',
    budget: '₹2,800,000'
  },
  {
    id: 'evt-3',
    name: 'Porsche Taycan launch Party',
    clientName: 'Porsche India',
    venue: 'Grand Hyatt, Goa',
    dateTime: '2026-07-15T20:00',
    status: 'Planning',
    assignedTeam: ['emp-1', 'emp-5'],
    guestCount: 8,
    notes: 'Laser light show, high profile guests, influencers and auto-journalists.',
    budget: '₹6,000,000'
  }
];

const DEFAULT_GUESTS = [
  // Guests for Vogue Luxury Gala (evt-1)
  { id: 'gst-101', eventId: 'evt-1', name: 'Alexander Wright', phone: '+1 415 555 2671', email: 'alex.wright@vogue.com', company: 'Vogue US', category: 'VVIP', rsvpStatus: 'Confirmed', attendeesCount: 2, checkInStatus: 'Pending', notes: 'Front row seating. Vegan food restriction.' },
  { id: 'gst-102', eventId: 'evt-1', name: 'Deepika Padukone', phone: '+91 99999 88888', email: 'deepika.p@agency.com', company: 'KA Enterprises', category: 'VVIP', rsvpStatus: 'Confirmed', attendeesCount: 3, checkInStatus: 'Checked In', checkedInAt: '2026-06-27T18:45', notes: 'Backstage entry permitted. Security escort required.' },
  { id: 'gst-103', eventId: 'evt-1', name: 'Karan Johar', phone: '+91 98888 77777', email: 'karan@dharmaprod.com', company: 'Dharma Productions', category: 'VIP', rsvpStatus: 'Confirmed', attendeesCount: 2, checkInStatus: 'Pending', notes: 'Sits at Table 1.' },
  { id: 'gst-104', eventId: 'evt-1', name: 'Ananya Birla', phone: '+91 97777 66666', email: 'ananya@birla.com', company: 'Birla Group', category: 'VIP', rsvpStatus: 'Confirmed', attendeesCount: 1, checkInStatus: 'Pending', notes: 'Prefers sparkling water.' },
  { id: 'gst-105', eventId: 'evt-1', name: 'Rajeev Masand', phone: '+91 96666 55555', email: 'rajeev@masandmedia.com', company: 'Media Express', category: 'Media', rsvpStatus: 'Confirmed', attendeesCount: 1, checkInStatus: 'Checked In', checkedInAt: '2026-06-27T19:05', notes: 'Needs camera pass.' },
  { id: 'gst-106', eventId: 'evt-1', name: 'Nisha Singhania', phone: '+91 95555 44444', email: 'nisha@singhaniacorp.co', company: 'Singhania Group', category: 'General', rsvpStatus: 'Confirmed', attendeesCount: 2, checkInStatus: 'Pending', notes: '' },
  { id: 'gst-107', eventId: 'evt-1', name: 'Kabir Bedi', phone: '+91 94444 33333', email: 'kabir@bedi.com', company: 'Bedi Ventures', category: 'VIP', rsvpStatus: 'Declined', attendeesCount: 0, checkInStatus: 'Pending', notes: 'Sent apologies due to travel.' },
  { id: 'gst-108', eventId: 'evt-1', name: 'Meera Rajput', phone: '+91 93333 22222', email: 'meera.r@lifestyle.in', company: 'Lifestyle India', category: 'Media', rsvpStatus: 'Pending', attendeesCount: 2, checkInStatus: 'Pending', notes: 'Awaiting confirmation.' },
  
  // Guests for Sotheby Art Auction (evt-2)
  { id: 'gst-201', eventId: 'evt-2', name: 'Kiran Nadar', phone: '+91 92222 11111', email: 'kiran@knma.org', company: 'Kiran Nadar Museum', category: 'VVIP', rsvpStatus: 'Confirmed', attendeesCount: 2, checkInStatus: 'Pending', notes: 'Important collector. Bid paddle #1.' },
  { id: 'gst-202', eventId: 'evt-2', name: 'Adi Godrej', phone: '+91 91111 00000', email: 'adi@godrej.com', company: 'Godrej Industries', category: 'VVIP', rsvpStatus: 'Confirmed', attendeesCount: 2, checkInStatus: 'Pending', notes: 'Table 2.' },
  { id: 'gst-203', eventId: 'evt-2', name: 'Mallika Sarabhai', phone: '+91 90000 99999', email: 'mallika@sarabhai.org', company: 'Darpana Academy', category: 'VIP', rsvpStatus: 'Pending', attendeesCount: 1, checkInStatus: 'Pending', notes: '' },
  
  // Guests for Porsche Launch (evt-3)
  { id: 'gst-301', eventId: 'evt-3', name: 'Sachin Tendulkar', phone: '+91 99990 00099', email: 'sachin@sachin.in', company: 'SRT Sports', category: 'VVIP', rsvpStatus: 'Confirmed', attendeesCount: 2, checkInStatus: 'Pending', notes: 'Key guest. Presenting the car keys.' }
];

const DEFAULT_TASKS = [
  { id: 'tsk-1', eventId: 'evt-1', title: 'Verify Sound System & Acoustics', description: 'Test the microphone levels and stage acoustics with DJ check.', assignedEmployeeId: 'emp-2', dueDate: '2026-06-27T17:00', status: 'Completed', priority: 'High' },
  { id: 'tsk-2', eventId: 'evt-1', title: 'VVIP Welcome Protocol Briefing', description: 'Brief hospitality crew regarding VVIP escort routes and security protocols.', assignedEmployeeId: 'emp-3', dueDate: '2026-06-27T18:00', status: 'Completed', priority: 'High' },
  { id: 'tsk-3', eventId: 'evt-1', title: 'Setup QR Scanner Terminals', description: 'Install scanner tablets at Entrance A and B. Run tests.', assignedEmployeeId: 'emp-4', dueDate: '2026-06-27T19:00', status: 'In Progress', priority: 'Medium' },
  { id: 'tsk-4', eventId: 'evt-1', title: 'Arrange Red Carpet Backdrops', description: 'Verify branding wall printing and alignment. Take photos.', assignedEmployeeId: 'emp-2', dueDate: '2026-06-27T18:30', status: 'Pending', priority: 'Low' },
  
  { id: 'tsk-5', eventId: 'evt-2', title: 'Set up Bid Paddle Terminals', description: 'Test electronic paddles and assign to collectors.', assignedEmployeeId: 'emp-5', dueDate: '2026-06-29T15:00', status: 'Pending', priority: 'High' },
  { id: 'tsk-6', eventId: 'evt-2', title: 'Verify Catering Seating Plan', description: 'Final check on table markers and allergy lists.', assignedEmployeeId: 'emp-2', dueDate: '2026-06-29T16:00', status: 'Pending', priority: 'Medium' }
];

const DEFAULT_NOTIFICATIONS = [
  { id: 'not-1', title: 'Task Completed', message: 'Rohan Mehta completed: "Verify Sound System & Acoustics"', timestamp: '2026-06-27T17:05:00', read: false },
  { id: 'not-2', title: 'VVIP Guest Checked In', message: 'Deepika Padukone checked in at Taj Palace', timestamp: '2026-06-27T18:45:00', read: false },
  { id: 'not-3', title: 'RSVP Update', message: 'Alexander Wright confirmed RSVP for Vogue Luxury Gala', timestamp: '2026-06-27T10:12:00', read: true }
];

const DEFAULT_CHECKINS = [
  { id: 'ch-1', guestId: 'gst-102', eventId: 'evt-1', guestName: 'Deepika Padukone', category: 'VVIP', timestamp: '2026-06-27T18:45:00', method: 'QR Code' },
  { id: 'ch-2', guestId: 'gst-105', eventId: 'evt-1', guestName: 'Rajeev Masand', category: 'Media', timestamp: '2026-06-27T19:05:00', method: 'Search Check-In' }
];

const DEFAULT_CLIENTS = [
  { id: 'cli-1', name: 'Kabir Kapoor', company: 'Condé Nast India', email: 'kabir.kapoor@condenast.in', phone: '+91 99100 88221', totalEvents: 1 },
  { id: 'cli-2', name: 'Ayesha Merchant', company: 'Sotheby’s South Asia', email: 'ayesha@sothebys.com', phone: '+91 98200 11223', totalEvents: 1 },
  { id: 'cli-3', name: 'Manish Malhotra', company: 'Manish Malhotra Designs', email: 'manish@malhotra.in', phone: '+91 98330 44556', totalEvents: 0 }
];

const DEFAULT_VENDORS = [
  { id: 'ven-1', name: 'Bhoomi Catering Co.', category: 'Catering', contactPerson: 'Chef Ajay', phone: '+91 98112 34455', status: 'Active' },
  { id: 'ven-2', name: 'Star AV & Sound Systems', category: 'AV/Light', contactPerson: 'Rahul Roy', phone: '+91 99334 55667', status: 'Active' },
  { id: 'ven-3', name: 'Securitas Event Guards', category: 'Security', contactPerson: 'Col. Khanna', phone: '+91 95551 22334', status: 'Active' },
  { id: 'ven-4', name: 'Spring Blooms Florals', category: 'Floral', contactPerson: 'Nita Shah', phone: '+91 91223 34455', status: 'On Hold' }
];

const DEFAULT_FINANCES = [
  { id: 'fin-1', eventId: 'evt-1', type: 'revenue', amount: 3500000, category: 'Sponsorship', description: 'Vogue India Title Sponsor', date: '2026-06-25' },
  { id: 'fin-2', eventId: 'evt-1', type: 'revenue', amount: 1500000, category: 'Booking Contract', description: 'Condé Nast Event Booking Fee', date: '2026-06-20' },
  { id: 'fin-3', eventId: 'evt-1', type: 'expense', amount: 1800000, category: 'Venue', description: 'Taj Palace banquet hall rental', date: '2026-06-21' },
  { id: 'fin-4', eventId: 'evt-1', type: 'expense', amount: 800000, category: 'AV / Production', description: 'Banquet lighting and projection systems', date: '2026-06-26' },
  { id: 'fin-5', eventId: 'evt-1', type: 'expense', amount: 1000000, category: 'Catering', description: 'Premium menu buffet and wine service', date: '2026-06-27' },
  { id: 'fin-6', eventId: 'evt-1', type: 'expense', amount: 200000, category: 'Hospitality', description: 'Bouncer escorts and floral backdrops', date: '2026-06-27' },

  { id: 'fin-7', eventId: 'evt-2', type: 'revenue', amount: 3000000, category: 'Booking Contract', description: 'Sotheby’s Auction management contract', date: '2026-06-24' },
  { id: 'fin-8', eventId: 'evt-2', type: 'expense', amount: 1200000, category: 'Venue', description: 'The Oberoi Mumbai reservation', date: '2026-06-25' },
  { id: 'fin-9', eventId: 'evt-2', type: 'expense', amount: 600000, category: 'Catering', description: 'Fine dine plated dinner course', date: '2026-06-29' },
  { id: 'fin-10', eventId: 'evt-2', type: 'expense', amount: 300000, category: 'Security', description: 'Armed security guards for art storage', date: '2026-06-28' }
];

const DEFAULT_ACTIVITY_LOGS = [
  { id: 'act-1', timestamp: '2026-06-27T08:12:00.000Z', user: 'Admin Operator', action: 'System Initialize', details: 'Database setup completed and standard metrics verified.' },
  { id: 'act-2', timestamp: '2026-06-27T08:30:00.000Z', user: 'Guest Relations Operator', action: 'Update RSVP', details: 'Confirmed VVIP invitation for Alexander Wright.' },
  { id: 'act-3', timestamp: '2026-06-27T09:05:00.000Z', user: 'Check-in Operator', action: 'Guest Checked-In', details: 'Checked in Rajeev Masand (Media) at Gate Entry 1.' },
  { id: 'act-4', timestamp: '2026-06-27T09:45:00.000Z', user: 'Event Manager Operator', action: 'Task Complete', details: 'Marked sound check checklist task as complete.' }
];

const DEFAULT_TIMELINES = [
  { id: 'time-1', eventId: 'evt-1', time: '08:00', title: 'Banquet Hall production setup', status: 'Completed' },
  { id: 'time-2', eventId: 'evt-1', time: '12:00', title: 'Acoustics check & sound dry run', status: 'Completed' },
  { id: 'time-3', eventId: 'evt-1', time: '17:00', title: 'Escort gate credentials inspection', status: 'Pending' },
  { id: 'time-4', eventId: 'evt-1', time: '19:30', title: 'Champagne lounge registration opens', status: 'Pending' },
  { id: 'time-5', eventId: 'evt-1', time: '21:00', title: 'Main awards presentation segment', status: 'Pending' },

  { id: 'time-6', eventId: 'evt-2', time: '10:00', title: 'Art displays positioning', status: 'Completed' },
  { id: 'time-7', eventId: 'evt-2', time: '16:00', title: 'Bid paddles electronic checking', status: 'Pending' },
  { id: 'time-8', eventId: 'evt-2', time: '18:00', title: 'Banquet welcome reception', status: 'Pending' }
];

const DEFAULT_DOCUMENTS = [
  { id: 'doc-1', eventId: 'evt-1', name: 'FloorPlan_TajBanquet_V1.pdf', type: 'pdf', size: '2.4 MB', uploadedAt: '2026-06-25T14:20:00.000Z' },
  { id: 'doc-2', eventId: 'evt-1', name: 'Vogue_Gala_CateringMenu.xlsx', type: 'xlsx', size: '1.2 MB', uploadedAt: '2026-06-26T10:10:00.000Z' },
  { id: 'doc-3', eventId: 'evt-1', name: 'VVIP_Welcome_EscortProtocol.pdf', type: 'pdf', size: '450 KB', uploadedAt: '2026-06-27T08:05:00.000Z' },

  { id: 'doc-4', eventId: 'evt-2', name: 'Sothebys_Auction_Catalogue.pdf', type: 'pdf', size: '5.8 MB', uploadedAt: '2026-06-28T09:30:00.000Z' }
];

// DB Operations Layer
export const DB = {
  // Initialization
  init() {
    // Self-migration: clear and reseed if legacy roles exist, or if Jai Goel account is missing
    const cachedEmp = JSON.parse(localStorage.getItem(DB_KEYS.EMPLOYEES)) || [];
    const hasLegacy = cachedEmp.some(emp => !['Admin', 'Event Manager', 'Finance Team'].includes(emp.role) || !emp.password) || !cachedEmp.some(emp => emp.email === 'jaigoel2206@gmail.com');
    if (hasLegacy) {
      localStorage.clear();
    }

    if (!localStorage.getItem(DB_KEYS.EMPLOYEES)) {
      localStorage.setItem(DB_KEYS.EMPLOYEES, JSON.stringify(DEFAULT_EMPLOYEES));
    }
    if (!localStorage.getItem(DB_KEYS.EVENTS)) {
      localStorage.setItem(DB_KEYS.EVENTS, JSON.stringify(DEFAULT_EVENTS));
    }
    if (!localStorage.getItem(DB_KEYS.GUESTS)) {
      localStorage.setItem(DB_KEYS.GUESTS, JSON.stringify(DEFAULT_GUESTS));
    }
    if (!localStorage.getItem(DB_KEYS.TASKS)) {
      localStorage.setItem(DB_KEYS.TASKS, JSON.stringify(DEFAULT_TASKS));
    }
    if (!localStorage.getItem(DB_KEYS.NOTIFICATIONS)) {
      localStorage.setItem(DB_KEYS.NOTIFICATIONS, JSON.stringify(DEFAULT_NOTIFICATIONS));
    }
    if (!localStorage.getItem(DB_KEYS.CHECKINS)) {
      localStorage.setItem(DB_KEYS.CHECKINS, JSON.stringify(DEFAULT_CHECKINS));
    }
    if (!localStorage.getItem(DB_KEYS.CLIENTS)) {
      localStorage.setItem(DB_KEYS.CLIENTS, JSON.stringify(DEFAULT_CLIENTS));
    }
    if (!localStorage.getItem(DB_KEYS.VENDORS)) {
      localStorage.setItem(DB_KEYS.VENDORS, JSON.stringify(DEFAULT_VENDORS));
    }
    if (!localStorage.getItem(DB_KEYS.FINANCES)) {
      localStorage.setItem(DB_KEYS.FINANCES, JSON.stringify(DEFAULT_FINANCES));
    }
    if (!localStorage.getItem(DB_KEYS.ACTIVITY_LOGS)) {
      localStorage.setItem(DB_KEYS.ACTIVITY_LOGS, JSON.stringify(DEFAULT_ACTIVITY_LOGS));
    }
    if (!localStorage.getItem(DB_KEYS.TIMELINES)) {
      localStorage.setItem(DB_KEYS.TIMELINES, JSON.stringify(DEFAULT_TIMELINES));
    }
    if (!localStorage.getItem(DB_KEYS.DOCUMENTS)) {
      localStorage.setItem(DB_KEYS.DOCUMENTS, JSON.stringify(DEFAULT_DOCUMENTS));
    }
  },

  // Reset to seed data
  reset() {
    localStorage.removeItem(DB_KEYS.EMPLOYEES);
    localStorage.removeItem(DB_KEYS.EVENTS);
    localStorage.removeItem(DB_KEYS.GUESTS);
    localStorage.removeItem(DB_KEYS.TASKS);
    localStorage.removeItem(DB_KEYS.NOTIFICATIONS);
    localStorage.removeItem(DB_KEYS.CHECKINS);
    localStorage.removeItem(DB_KEYS.CLIENTS);
    localStorage.removeItem(DB_KEYS.VENDORS);
    localStorage.removeItem(DB_KEYS.FINANCES);
    localStorage.removeItem(DB_KEYS.ACTIVITY_LOGS);
    localStorage.removeItem(DB_KEYS.TIMELINES);
    localStorage.removeItem(DB_KEYS.DOCUMENTS);
    this.init();
  },

  // Read helpers
  getEmployees() {
    return JSON.parse(localStorage.getItem(DB_KEYS.EMPLOYEES)) || [];
  },

  getEvents() {
    return JSON.parse(localStorage.getItem(DB_KEYS.EVENTS)) || [];
  },

  getGuests() {
    return JSON.parse(localStorage.getItem(DB_KEYS.GUESTS)) || [];
  },

  getTasks() {
    return JSON.parse(localStorage.getItem(DB_KEYS.TASKS)) || [];
  },

  getNotifications() {
    return JSON.parse(localStorage.getItem(DB_KEYS.NOTIFICATIONS)) || [];
  },

  getCheckIns() {
    return JSON.parse(localStorage.getItem(DB_KEYS.CHECKINS)) || [];
  },

  // Create/Update helpers
  saveEmployees(list) {
    localStorage.setItem(DB_KEYS.EMPLOYEES, JSON.stringify(list));
  },

  saveEvents(list) {
    localStorage.setItem(DB_KEYS.EVENTS, JSON.stringify(list));
  },

  saveGuests(list) {
    localStorage.setItem(DB_KEYS.GUESTS, JSON.stringify(list));
  },

  saveTasks(list) {
    localStorage.setItem(DB_KEYS.TASKS, JSON.stringify(list));
  },

  saveNotifications(list) {
    localStorage.setItem(DB_KEYS.NOTIFICATIONS, JSON.stringify(list));
  },

  saveCheckIns(list) {
    localStorage.setItem(DB_KEYS.CHECKINS, JSON.stringify(list));
  },

  getClients() {
    return JSON.parse(localStorage.getItem(DB_KEYS.CLIENTS)) || [];
  },

  saveClients(list) {
    localStorage.setItem(DB_KEYS.CLIENTS, JSON.stringify(list));
  },

  getVendors() {
    return JSON.parse(localStorage.getItem(DB_KEYS.VENDORS)) || [];
  },

  saveVendors(list) {
    localStorage.setItem(DB_KEYS.VENDORS, JSON.stringify(list));
  },

  getFinances() {
    return JSON.parse(localStorage.getItem(DB_KEYS.FINANCES)) || [];
  },

  saveFinances(list) {
    localStorage.setItem(DB_KEYS.FINANCES, JSON.stringify(list));
  },

  getActivityLogs() {
    return JSON.parse(localStorage.getItem(DB_KEYS.ACTIVITY_LOGS)) || [];
  },

  saveActivityLogs(list) {
    localStorage.setItem(DB_KEYS.ACTIVITY_LOGS, JSON.stringify(list));
  },

  // Operations
  addEmployee(emp) {
    const list = this.getEmployees();
    emp.id = 'emp-' + (list.length + 1) + '-' + Math.random().toString(36).substr(2, 4);
    list.push(emp);
    this.saveEmployees(list);
    return emp;
  },

  updateEmployee(updatedEmp) {
    let list = this.getEmployees();
    list = list.map(e => e.id === updatedEmp.id ? updatedEmp : e);
    this.saveEmployees(list);
  },

  addEvent(event) {
    const list = this.getEvents();
    event.id = 'evt-' + (list.length + 1) + '-' + Math.random().toString(36).substr(2, 4);
    event.guestCount = 0;
    list.push(event);
    this.saveEvents(list);
    return event;
  },

  updateEvent(updatedEvt) {
    let list = this.getEvents();
    list = list.map(e => e.id === updatedEvt.id ? updatedEvt : e);
    this.saveEvents(list);
  },

  addGuest(guest) {
    const list = this.getGuests();
    guest.id = 'gst-' + (list.length + 1) + '-' + Math.random().toString(36).substr(2, 4);
    list.push(guest);
    this.saveGuests(list);

    // Update guestCount in the event
    this.recalculateEventGuestCounts(guest.eventId);
    return guest;
  },

  updateGuest(updatedGst) {
    let list = this.getGuests();
    list = list.map(g => g.id === updatedGst.id ? updatedGst : g);
    this.saveGuests(list);
    this.recalculateEventGuestCounts(updatedGst.eventId);
  },

  deleteGuest(guestId, eventId) {
    let list = this.getGuests();
    list = list.filter(g => g.id !== guestId);
    this.saveGuests(list);
    this.recalculateEventGuestCounts(eventId);
  },

  addTask(task) {
    const list = this.getTasks();
    task.id = 'tsk-' + (list.length + 1) + '-' + Math.random().toString(36).substr(2, 4);
    list.push(task);
    this.saveTasks(list);

    // Create a notification
    this.addNotification({
      title: 'Task Assigned',
      message: `Task "${task.title}" has been assigned to employee.`,
      timestamp: new Date().toISOString(),
      read: false
    });

    return task;
  },

  updateTask(updatedTsk) {
    let list = this.getTasks();
    const oldTask = list.find(t => t.id === updatedTsk.id);
    list = list.map(t => t.id === updatedTsk.id ? updatedTsk : t);
    this.saveTasks(list);

    // Create notifications for milestones
    if (oldTask && oldTask.status !== updatedTsk.status) {
      const emp = this.getEmployees().find(e => e.id === updatedTsk.assignedEmployeeId);
      const name = emp ? emp.name : 'Someone';
      this.addNotification({
        title: 'Task Updated',
        message: `${name} updated task "${updatedTsk.title}" to ${updatedTsk.status}.`,
        timestamp: new Date().toISOString(),
        read: false
      });
    }
  },

  addNotification(notif) {
    const list = this.getNotifications();
    notif.id = 'not-' + (list.length + 1) + '-' + Math.random().toString(36).substr(2, 4);
    list.unshift(notif); // Add to top
    if (list.length > 50) list.pop(); // Cap size
    this.saveNotifications(list);
  },

  markNotificationsRead() {
    let list = this.getNotifications();
    list = list.map(n => ({ ...n, read: true }));
    this.saveNotifications(list);
  },

  // QR Scanning & Check-in Business Logic
  checkInGuest(guestId, eventId, method = 'QR Code') {
    const guests = this.getGuests();
    const guest = guests.find(g => g.id === guestId);
    
    if (!guest) {
      return { success: false, message: 'Invalid guest code' };
    }

    if (guest.eventId !== eventId) {
      // Find event details
      const events = this.getEvents();
      const currentEvt = events.find(e => e.id === eventId);
      const guestEvt = events.find(e => e.id === guest.eventId);
      return { 
        success: false, 
        message: `Guest is registered for another event: "${guestEvt ? guestEvt.name : 'Unknown'}" instead of "${currentEvt ? currentEvt.name : 'this'}"` 
      };
    }

    if (guest.checkInStatus === 'Checked In') {
      return { 
        success: false, 
        message: `Already checked in at ${new Date(guest.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        guest 
      };
    }

    // Check RSVP Status
    if (guest.rsvpStatus === 'Declined') {
      return {
        success: false,
        message: 'This guest RSVP status is "Declined". Overwrite to check in?',
        guest,
        needsOverride: true
      };
    }

    // Perform Check-in
    guest.checkInStatus = 'Checked In';
    guest.checkedInAt = new Date().toISOString();
    this.saveGuests(guests);

    // Record check-in activity log
    const checkins = this.getCheckIns();
    const ch = {
      id: 'ch-' + (checkins.length + 1) + '-' + Math.random().toString(36).substr(2, 4),
      guestId: guest.id,
      eventId: eventId,
      guestName: guest.name,
      category: guest.category,
      timestamp: guest.checkedInAt,
      method: method
    };
    checkins.unshift(ch);
    this.saveCheckIns(checkins);

    // Create Notification
    this.addNotification({
      title: `${guest.category} Checked In`,
      message: `${guest.name} (${guest.category}) checked in via ${method}.`,
      timestamp: guest.checkedInAt,
      read: false
    });

    return { success: true, message: 'Check-in successful', guest };
  },

  // Recalculates guest counts in cache
  recalculateEventGuestCounts(eventId) {
    const guests = this.getGuests().filter(g => g.eventId === eventId);
    const count = guests.reduce((total, g) => total + (g.rsvpStatus === 'Confirmed' ? 1 : 0), 0);
    const events = this.getEvents();
    const updatedEvents = events.map(e => {
      if (e.id === eventId) {
        return { ...e, guestCount: guests.length };
      }
      return e;
    });
    this.saveEvents(updatedEvents);
  },

  // Analytics calculator
  getAnalytics(eventId = null) {
    const events = this.getEvents();
    const guests = this.getGuests();
    const tasks = this.getTasks();
    const checkins = this.getCheckIns();

    if (eventId) {
      // Event Specific Analytics
      const eventGuests = guests.filter(g => g.eventId === eventId);
      const eventTasks = tasks.filter(t => t.eventId === eventId);
      const eventCheckins = checkins.filter(c => c.eventId === eventId);

      const confirmedRSVPs = eventGuests.filter(g => g.rsvpStatus === 'Confirmed');
      const totalAttendeesExpected = confirmedRSVPs.reduce((acc, g) => acc + (g.attendeesCount || 1), 0);
      
      const checkedInGuests = eventGuests.filter(g => g.checkInStatus === 'Checked In');
      const checkedInCount = checkedInGuests.reduce((acc, g) => acc + (g.attendeesCount || 1), 0);

      const completedTasks = eventTasks.filter(t => t.status === 'Completed').length;

      return {
        totalGuests: eventGuests.length,
        rsvpConfirmed: confirmedRSVPs.length,
        rsvpPending: eventGuests.filter(g => g.rsvpStatus === 'Pending').length,
        rsvpDeclined: eventGuests.filter(g => g.rsvpStatus === 'Declined').length,
        expectedAttendees: totalAttendeesExpected,
        checkedInGuests: checkedInGuests.length,
        checkedInAttendees: checkedInCount,
        attendanceRate: totalAttendeesExpected > 0 ? Math.round((checkedInCount / totalAttendeesExpected) * 100) : 0,
        totalTasks: eventTasks.length,
        completedTasks: completedTasks,
        pendingTasks: eventTasks.filter(t => t.status !== 'Completed').length,
        taskCompletionRate: eventTasks.length > 0 ? Math.round((completedTasks / eventTasks.length) * 100) : 0
      };
    } else {
      // Global Workspace Analytics
      const activeEvents = events.filter(e => e.status === 'Live' || e.status === 'Confirmed').length;
      
      const confirmedRSVPs = guests.filter(g => g.rsvpStatus === 'Confirmed');
      const totalAttendeesExpected = confirmedRSVPs.reduce((acc, g) => acc + (g.attendeesCount || 1), 0);
      
      const checkedInGuests = guests.filter(g => g.checkInStatus === 'Checked In');
      const checkedInCount = checkedInGuests.reduce((acc, g) => acc + (g.attendeesCount || 1), 0);
      
      const completedTasks = tasks.filter(t => t.status === 'Completed').length;

      return {
        totalEvents: events.length,
        activeEvents: activeEvents,
        totalGuests: guests.length,
        rsvpConfirmed: confirmedRSVPs.length,
        expectedAttendees: totalAttendeesExpected,
        checkedInGuests: checkedInGuests.length,
        checkedInAttendees: checkedInCount,
        attendanceRate: totalAttendeesExpected > 0 ? Math.round((checkedInCount / totalAttendeesExpected) * 100) : 0,
        totalTasks: tasks.length,
        completedTasks: completedTasks,
        pendingTasks: tasks.length - completedTasks,
        taskCompletionRate: tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0
      };
    }
  },

  addClient(client) {
    const list = this.getClients();
    client.id = 'cli-' + (list.length + 1) + '-' + Math.random().toString(36).substr(2, 4);
    client.totalEvents = 0;
    list.push(client);
    this.saveClients(list);
    this.addActivityLog('Add Client', `Registered client "${client.name}" (${client.company})`);
    return client;
  },

  updateClient(updatedCli) {
    let list = this.getClients();
    list = list.map(c => c.id === updatedCli.id ? updatedCli : c);
    this.saveClients(list);
    this.addActivityLog('Update Client', `Updated details for client "${updatedCli.name}"`);
  },

  deleteClient(id) {
    let list = this.getClients();
    const cli = list.find(c => c.id === id);
    list = list.filter(c => c.id !== id);
    this.saveClients(list);
    if (cli) this.addActivityLog('Delete Client', `Removed client "${cli.name}" from database`);
  },

  addVendor(vendor) {
    const list = this.getVendors();
    vendor.id = 'ven-' + (list.length + 1) + '-' + Math.random().toString(36).substr(2, 4);
    list.push(vendor);
    this.saveVendors(list);
    this.addActivityLog('Add Vendor', `Contracted vendor "${vendor.name}" for "${vendor.category}"`);
    return vendor;
  },

  updateVendor(updatedVen) {
    let list = this.getVendors();
    list = list.map(v => v.id === updatedVen.id ? updatedVen : v);
    this.saveVendors(list);
    this.addActivityLog('Update Vendor', `Updated credentials for vendor "${updatedVen.name}"`);
  },

  deleteVendor(id) {
    let list = this.getVendors();
    const ven = list.find(v => v.id === id);
    list = list.filter(v => v.id !== id);
    this.saveVendors(list);
    if (ven) this.addActivityLog('Delete Vendor', `Removed vendor "${ven.name}"`);
  },

  addFinanceRecord(record) {
    const list = this.getFinances();
    record.id = 'fin-' + (list.length + 1) + '-' + Math.random().toString(36).substr(2, 4);
    record.date = new Date().toISOString().split('T')[0];
    list.push(record);
    this.saveFinances(list);
    const typeLabel = record.type === 'revenue' ? 'Revenue' : 'Expense';
    this.addActivityLog('Financial Entry', `Recorded ${typeLabel} of ₹${record.amount.toLocaleString()} for ${record.category}`);
    return record;
  },

  deleteFinanceRecord(id) {
    let list = this.getFinances();
    const rec = list.find(r => r.id === id);
    list = list.filter(r => r.id !== id);
    this.saveFinances(list);
    if (rec) this.addActivityLog('Delete Finance Entry', `Removed financial ledger item: ${rec.description}`);
  },

  addActivityLog(action, details) {
    const list = this.getActivityLogs();
    const activeRole = localStorage.getItem('aloah_active_role') || 'Admin';
    const log = {
      id: 'act-' + (list.length + 1) + '-' + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString(),
      user: `${activeRole} Operator`,
      action: action,
      details: details
    };
    list.unshift(log);
    if (list.length > 100) list.pop();
    this.saveActivityLogs(list);
  },

  getTimelines() {
    return JSON.parse(localStorage.getItem(DB_KEYS.TIMELINES)) || [];
  },

  saveTimelines(list) {
    localStorage.setItem(DB_KEYS.TIMELINES, JSON.stringify(list));
  },

  getDocuments() {
    return JSON.parse(localStorage.getItem(DB_KEYS.DOCUMENTS)) || [];
  },

  saveDocuments(list) {
    localStorage.setItem(DB_KEYS.DOCUMENTS, JSON.stringify(list));
  },

  addTimelineItem(item) {
    const list = this.getTimelines();
    item.id = 'time-' + (list.length + 1) + '-' + Math.random().toString(36).substr(2, 4);
    item.status = 'Pending';
    list.push(item);
    this.saveTimelines(list);
    this.addActivityLog('Add Timeline', `Added schedule item "${item.time} - ${item.title}"`);
    return item;
  },

  toggleTimelineItem(itemId) {
    let list = this.getTimelines();
    const item = list.find(t => t.id === itemId);
    if (item) {
      item.status = item.status === 'Completed' ? 'Pending' : 'Completed';
      this.saveTimelines(list);
      this.addActivityLog('Toggle Timeline', `Marked timeline milestone "${item.title}" as ${item.status}`);
    }
    return item;
  },

  deleteTimelineItem(itemId) {
    let list = this.getTimelines();
    list = list.filter(t => t.id !== itemId);
    this.saveTimelines(list);
  },

  addDocument(doc) {
    const list = this.getDocuments();
    doc.id = 'doc-' + (list.length + 1) + '-' + Math.random().toString(36).substr(2, 4);
    doc.uploadedAt = new Date().toISOString();
    list.push(doc);
    this.saveDocuments(list);
    this.addActivityLog('Upload Document', `Uploaded contract file "${doc.name}"`);
    return doc;
  },

  deleteDocument(docId) {
    let list = this.getDocuments();
    const doc = list.find(d => d.id === docId);
    list = list.filter(d => d.id !== docId);
    this.saveDocuments(list);
    if (doc) this.addActivityLog('Delete Document', `Deleted file "${doc.name}"`);
  }
};
