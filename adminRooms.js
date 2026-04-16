(() => {
  'use strict';

  const API = '/api';

  const $ = (sel) => document.querySelector(sel);

  const roomsStatusEl = $('#rooms-status');
  const roomsTbodyEl = $('#rooms-tbody');
  const roomsRefreshBtn = $('#rooms-refresh-btn');

  const bookingsStatusEl = $('#bookings-status');
  const bookingsTbodyEl = $('#bookings-tbody');

  // Booking tabs
  const activeTab = $('#active-tab');
  const historyTab = $('#history-tab');
  let currentBookingStatus = 'active'; // Default to active

  // Pagination state
  let roomsPage = 1;
  let roomsTotalPages = 1;
  let roomsLimit = 10;
  
  // Rooms filter state
  let roomsSearch = '';
  let roomsStatusFilter = '';
  
  let bookingsPage = 1;
  let bookingsTotalPages = 1;
  let bookingsLimit = 10;

  const revenueTodayEl = $('#revenue-today');
  const revenueMonthEl = $('#revenue-month');

  // Notification system
  const notificationBell = $('#notification-bell');
  const notificationBadge = $('#notification-badge');
  const notificationDropdown = $('#notification-dropdown');
  const notificationList = $('#notification-list');
  const notificationClose = $('#notification-close');

  // Rooms filter elements
  const roomsSearchEl = $('#rooms-search');
  const roomsStatusFilterEl = $('#rooms-status-filter');
  const roomsClearFiltersBtn = $('#rooms-clear-filters');

  // Debug: Check if elements exist
  console.log('Notification elements found:', {
    bell: !!notificationBell,
    badge: !!notificationBadge,
    dropdown: !!notificationDropdown,
    list: !!notificationList,
    close: !!notificationClose
  });

  // Walk-in form
  const walkinForm = $('#walkin-form');
  const walkinLocationEl = $('#walkin-location');
  const walkinRoomTypeEl = $('#walkin-room-type');
  const walkinFloorEl = $('#walkin-floor');
  const walkinCheckInEl = $('#walkin-checkin');
  const walkinCheckOutEl = $('#walkin-checkout');
  const walkinErrorEl = $('#walkin-error');
  const walkinSuccessEl = $('#walkin-success');
  const walkinCreateBtn = $('#walkin-create-btn');

  // Summary card elements
  const summaryAvailableEl = $('#summary-available');
  const summaryOccupiedEl = $('#summary-occupied');
  const summaryReservedEl = $('#summary-reserved');
  const summaryCleaningEl = $('#summary-cleaning');

  // Logout button
  const logoutBtn = $('#logout-btn');

  // Keep this mapping aligned with DB enum values (rooms.status)
  const STATUS_LABEL = {
    available: 'Available',
    reserved: 'Reserved',
    occupied: 'Occupied',
    needs_cleaning: 'Needs Cleaning',
  };

  async function apiFetch(endpoint, options = {}) {
    const res = await fetch(`${API}${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw { status: res.status, ...(data || {}) };
    return data;
  }

  function renderRooms(rooms) {
    if (!rooms || rooms.length === 0) {
      roomsTbodyEl.innerHTML = `
        <tr>
          <td colspan="5">
            <div class="empty-state">
              <div class="empty-state-icon">🏨</div>
              <div class="empty-state-title">No Rooms Available</div>
              <div class="empty-state-message">
                All rooms are currently occupied or no rooms match your criteria. Check back later or adjust your filters.
              </div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    roomsTbodyEl.innerHTML = rooms
      .map((room, index) => {
        const label = STATUS_LABEL[room.status] || room.status;
        const pillClass = label === 'Available' ? 'pill pill--gold' : 'pill';

        const showMarkCleaned = room.status === 'needs_cleaning';
        const markCleanedBtn = showMarkCleaned
          ? `<button class="admin-btn" type="button" data-action="mark-cleaned" data-room-id="${room.id}">Mark Cleaned</button>`
          : '';

        return `
          <tr style="animation: slideUp 0.4s ease-out ${index * 0.05}s both;">
            <td>${room.number ?? ''}</td>
            <td>${room.type ?? ''}</td>
            <td>Floor ${room.floor ?? ''}</td>
            <td><span class="${pillClass}">${label}</span></td>
            <td>${markCleanedBtn}</td>
          </tr>
        `;
      })
      .join('');
  }

  function renderBookings(bookings) {
    if (!bookings || bookings.length === 0) {
      const emptyMessage = currentBookingStatus === 'history' 
        ? 'No completed bookings found.'
        : 'No active bookings found.';
      const emptyDescription = currentBookingStatus === 'history'
        ? 'All guest stays are currently ongoing or no guests have checked out yet.'
        : 'All rooms are available or no bookings match the current criteria.';
      
      bookingsTbodyEl.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty-state">
              <div class="empty-state-icon">${currentBookingStatus === 'history' ? '📋' : '🔑'}</div>
              <div class="empty-state-title">${emptyMessage}</div>
              <div class="empty-state-message">
                ${emptyDescription}
              </div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    const isHistory = currentBookingStatus === 'history';

    bookingsTbodyEl.innerHTML = bookings
      .map((row, index) => {
        // Expected shape from backend:
        // { booking: {id, roomId, checkIn, checkOut, status}, room: {status, id} }
        const booking = row.booking || {};
        const room = row.room || {};

        const bookingStatus = booking.status ?? '';
        const roomStatusLabel = STATUS_LABEL[room.status] || room.status || '';

        // For history, don't show action buttons
        if (isHistory) {
          return `
            <tr style="animation: slideUp 0.4s ease-out ${index * 0.05}s both;">
              <td>Room ${room.number ?? ''} (${room.type ?? ''} • Floor ${room.floor ?? ''})</td>
              <td>${booking.checkIn ?? ''}</td>
              <td>${booking.checkOut ?? ''}</td>
              <td><span class="pill">${bookingStatus}</span></td>
              <td><span class="pill">${roomStatusLabel}</span></td>
              <td style="color: var(--admin-muted); font-size: 12px;">
                <span style="opacity: 0.6;">✓ Completed</span>
              </td>
            </tr>
          `;
        }

        const canCheckIn = bookingStatus === 'confirmed';
        const canCheckOut = bookingStatus === 'checked_in';

        const checkInBtn = canCheckIn
          ? `<button class="admin-btn" type="button" data-action="check-in" data-booking-id="${booking.id}">Check-in</button>`
          : `<button class="admin-btn" type="button" disabled style="opacity:0.4;">Check-in</button>`;

        const checkOutBtn = canCheckOut
          ? `<button class="admin-btn" type="button" data-action="check-out" data-booking-id="${booking.id}">Check-out</button>`
          : `<button class="admin-btn" type="button" disabled style="opacity:0.4;">Check-out</button>`;

        const upgradeUI = canCheckOut
          ? `
            <div style="display:flex; gap:8px; align-items:center;">
              <button class="admin-btn" type="button" data-action="upgrade-init" data-booking-id="${booking.id}">Upgrade</button>
              <div id="upgrade-controls-${booking.id}" style="display:none; gap:8px; align-items:center;">
                <select id="upgrade-select-${booking.id}" style="padding: 8px; background: rgba(255,255,255,0.06); color: white; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12); font-size: 14px;">
                  <option value="suite">Suite</option>
                  <option value="penthouse">Penthouse</option>
                </select>
                <button class="admin-btn" type="button" data-action="upgrade-confirm" data-booking-id="${booking.id}">Go</button>
              </div>
            </div>
          `
          : '';

        const extendUI = canCheckOut
          ? `
            <div style="display:flex; gap:8px; align-items:center;">
              <button class="admin-btn" type="button" data-action="extend-init" data-booking-id="${booking.id}">Extend</button>
              <div id="extend-controls-${booking.id}" style="display:none; gap:8px; align-items:center;">
                <input type="date" id="extend-input-${booking.id}" style="padding: 6px; background: rgba(255,255,255,0.06); color: white; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12); font-size: 14px;" min="${booking.checkOut ?? ''}">
                <button class="admin-btn" type="button" data-action="extend-confirm" data-booking-id="${booking.id}">Go</button>
              </div>
            </div>
          `
          : '';

        return `
          <tr style="animation: slideUp 0.4s ease-out ${index * 0.05}s both;">
            <td>Room ${room.number ?? ''} (${room.type ?? ''} • Floor ${room.floor ?? ''})</td>
            <td>${booking.checkIn ?? ''}</td>
            <td>${booking.checkOut ?? ''}</td>
            <td><span class="pill">${bookingStatus}</span></td>
            <td><span class="pill">${roomStatusLabel}</span></td>
            <td style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
              ${checkInBtn}
              ${checkOutBtn}
              ${upgradeUI}
              ${extendUI}
            </td>
          </tr>
        `;
      })
      .join('');
  }

  // Skeleton loading functions
  function showSkeletons() {
    // Room table skeleton
    if (roomsTbodyEl) {
      const roomSkeletons = Array(5).fill(0).map((_, i) => `
        <tr>
          <td><div class="skeleton skeleton-text"></div></td>
          <td><div class="skeleton skeleton-text small"></div></td>
          <td><div class="skeleton skeleton-text small"></div></td>
          <td><div class="skeleton skeleton-text small"></div></td>
          <td><div class="skeleton skeleton-button"></div></td>
        </tr>
      `).join('');
      roomsTbodyEl.innerHTML = roomSkeletons;
    }

    // Bookings table skeleton
    if (bookingsTbodyEl) {
      const bookingSkeletons = Array(4).fill(0).map((_, i) => `
        <tr>
          <td><div class="skeleton skeleton-text"></div></td>
          <td><div class="skeleton skeleton-text small"></div></td>
          <td><div class="skeleton skeleton-text small"></div></td>
          <td><div class="skeleton skeleton-text small"></div></td>
          <td><div class="skeleton skeleton-text small"></div></td>
          <td><div class="skeleton skeleton-button"></div></td>
        </tr>
      `).join('');
      bookingsTbodyEl.innerHTML = bookingSkeletons;
    }
  }

  let isLoading = false;
  let isRefreshing = false;
  async function refreshRoomsAndBookings() {
    if (isRefreshing) return;
    isRefreshing = true;

    // Show skeleton loaders immediately
    showSkeletons();

    if (roomsStatusEl) roomsStatusEl.textContent = 'Loading rooms…';
    if (bookingsStatusEl) bookingsStatusEl.textContent = 'Loading bookings…';

    try {
      // Add a small delay to show skeleton effect
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Fetch rooms with pagination, search and filters
      const searchParam = roomsSearch ? `&search=${encodeURIComponent(roomsSearch)}` : '';
      const statusParam = roomsStatusFilter ? `&status=${encodeURIComponent(roomsStatusFilter)}` : '';
      const roomsData = await apiFetch(`/admin/rooms?page=${roomsPage}&limit=${roomsLimit}${searchParam}${statusParam}`);
      roomsTotalPages = roomsData.totalPages || 1;
      renderRooms(roomsData.data);
      renderRoomsPagination();

      // Fetch bookings with pagination
      const bookingsData = await apiFetch(`/admin/bookings?status=${currentBookingStatus}&page=${bookingsPage}&limit=${bookingsLimit}`);
      bookingsTotalPages = bookingsData.totalPages || 1;
      renderBookings(bookingsData.data);
      renderBookingsPagination();

      // Update tab counts with animation
      if (activeTab && bookingsData.activeCount !== undefined) {
        setTimeout(() => {
          activeTab.innerHTML = `Active Bookings <span class="count">${bookingsData.activeCount}</span>`;
        }, 100);
      }
      if (historyTab && bookingsData.historyCount !== undefined) {
        setTimeout(() => {
          historyTab.innerHTML = `Booking History <span class="count">${bookingsData.historyCount}</span>`;
        }, 150);
      }

      // Fetch summary data
      const summaryData = await apiFetch('/admin/summary');
      if (summaryData) {
        if (summaryAvailableEl) summaryAvailableEl.textContent = summaryData.available || 0;
        if (summaryOccupiedEl) summaryOccupiedEl.textContent = summaryData.occupied || 0;
        if (summaryReservedEl) summaryReservedEl.textContent = summaryData.reserved || 0;
        if (summaryCleaningEl) summaryCleaningEl.textContent = summaryData.cleaning || 0;
      }

      const revenueData = await apiFetch('/admin/revenue');
      if (revenueTodayEl && revenueMonthEl && revenueData) {
        // Animate revenue numbers
        const animateValue = (element, start, end, duration) => {
          const range = end - start;
          const startTime = performance.now();
          const update = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const value = Math.floor(start + range * progress);
            element.textContent = `$${value.toLocaleString()}`;
            if (progress < 1) {
              requestAnimationFrame(update);
            }
          };
          requestAnimationFrame(update);
        };
        
        animateValue(revenueTodayEl, 0, revenueData.todayRevenue || 0, 800);
        animateValue(revenueMonthEl, 0, revenueData.monthRevenue || 0, 1000);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      if (roomsStatusEl) roomsStatusEl.textContent = 'Failed to load';
      if (bookingsStatusEl) bookingsStatusEl.textContent = 'Failed to load';
    } finally {
      if (roomsStatusEl) roomsStatusEl.textContent = '';
      if (bookingsStatusEl) {
        bookingsStatusEl.textContent = currentBookingStatus === 'history' ? 'All past bookings' : '';
      }
      isRefreshing = false;
    }
  }

  // Debounce function for search input
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Fetch rooms with current filters (for individual updates)
  async function fetchRoomsWithFilters() {
    if (roomsStatusEl) roomsStatusEl.textContent = 'Loading rooms…';
    try {
      showSkeletons();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const searchParam = roomsSearch ? `&search=${encodeURIComponent(roomsSearch)}` : '';
      const statusParam = roomsStatusFilter ? `&status=${encodeURIComponent(roomsStatusFilter)}` : '';
      const roomsData = await apiFetch(`/admin/rooms?page=${roomsPage}&limit=${roomsLimit}${searchParam}${statusParam}`);
      
      roomsTotalPages = roomsData.totalPages || 1;
      renderRooms(roomsData.data);
      renderRoomsPagination();
      
      if (roomsStatusEl) roomsStatusEl.textContent = '';
    } catch (err) {
      console.error('Failed to load rooms:', err);
      if (roomsStatusEl) roomsStatusEl.textContent = 'Failed to load';
    }
  }

  // Search input handler with debounce
  const handleSearchInput = debounce((value) => {
    roomsSearch = value;
    roomsPage = 1; // Reset to first page on search
    fetchRoomsWithFilters();
  }, 300);

  // Status filter handler
  function handleStatusFilter(value) {
    roomsStatusFilter = value;
    roomsPage = 1; // Reset to first page on filter change
    fetchRoomsWithFilters();
  }

  // Clear filters handler
  function clearFilters() {
    roomsSearch = '';
    roomsStatusFilter = '';
    roomsPage = 1;
    
    if (roomsSearchEl) roomsSearchEl.value = '';
    if (roomsStatusFilterEl) roomsStatusFilterEl.value = '';
    
    fetchRoomsWithFilters();
  }

  // Event listeners for filter controls
  if (roomsSearchEl) {
    roomsSearchEl.addEventListener('input', (e) => {
      handleSearchInput(e.target.value);
    });
  }

  if (roomsStatusFilterEl) {
    roomsStatusFilterEl.addEventListener('change', (e) => {
      handleStatusFilter(e.target.value);
    });
  }

  if (roomsClearFiltersBtn) {
    roomsClearFiltersBtn.addEventListener('click', clearFilters);
  }

  roomsRefreshBtn.addEventListener('click', () => refreshRoomsAndBookings());

  // Logout functionality
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('adminToken');
      window.location.href = 'admin-login.html';
    });
  }

  // Action delegation: handle clicks on dynamically rendered buttons.
  roomsTbodyEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const roomId = btn.dataset.roomId;
    if (action !== 'mark-cleaned' || !roomId) return;

    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = 'Marking…';

    try {
      await apiFetch(`/admin/rooms/${roomId}/mark-cleaned`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      await refreshRoomsAndBookings();
    } catch (err) {
      console.error('Mark cleaned failed:', err);
      roomsStatusEl.textContent = `Action failed: ${err.code || err.error || 'Unknown error'}`;
      setTimeout(() => {
        roomsStatusEl.textContent = 'Loading rooms…';
      }, 1200);
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });

  bookingsTbodyEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const bookingId = btn.dataset.bookingId;

    if (!bookingId || !action) return;

    if (action === 'upgrade-init') {
      const initBtn = btn;
      const controls = $(`#upgrade-controls-${bookingId}`);
      if (initBtn && controls) {
        initBtn.style.display = 'none';
        controls.style.display = 'flex';
      }
      return;
    }

    if (action === 'upgrade-confirm') {
      const select = $(`#upgrade-select-${bookingId}`);
      const newRoomType = select ? select.value : 'suite';
      
      btn.disabled = true;
      btn.textContent = '...';

      try {
        await apiFetch(`/admin/bookings/${bookingId}/upgrade`, {
          method: 'POST',
          body: JSON.stringify({ newRoomType })
        });
        
        bookingsStatusEl.textContent = 'Room upgraded successfully';
        bookingsStatusEl.style.color = '#2ecc71';
        setTimeout(() => {
          bookingsStatusEl.textContent = 'Loading bookings…';
          bookingsStatusEl.style.color = '';
        }, 3000);
        
        await refreshRoomsAndBookings();
      } catch (err) {
        console.error('Upgrade failed:', err);
        bookingsStatusEl.textContent = `Action failed: ${err.code || err.error || 'Unknown error'}`;
        bookingsStatusEl.style.color = '#e74c3c';
        setTimeout(() => {
          bookingsStatusEl.textContent = 'Loading bookings…';
          bookingsStatusEl.style.color = '';
          refreshRoomsAndBookings();
        }, 3000);
        btn.disabled = false;
        btn.textContent = 'Go';
      }
      return;
    }

    if (action === 'extend-init') {
      const initBtn = btn;
      const controls = $(`#extend-controls-${bookingId}`);
      if (initBtn && controls) {
        initBtn.style.display = 'none';
        controls.style.display = 'flex';
      }
      return;
    }

    if (action === 'extend-confirm') {
      const input = $(`#extend-input-${bookingId}`);
      const newCheckOut = input ? input.value : '';
      
      if (!newCheckOut) {
        bookingsStatusEl.textContent = 'Please select a date';
        bookingsStatusEl.style.color = '#e74c3c';
        setTimeout(() => {
          bookingsStatusEl.textContent = 'Loading bookings…';
          bookingsStatusEl.style.color = '';
        }, 2000);
        return;
      }

      btn.disabled = true;
      btn.textContent = '...';

      try {
        await apiFetch(`/admin/bookings/${bookingId}/extend`, {
          method: 'POST',
          body: JSON.stringify({ newCheckOut })
        });
        
        bookingsStatusEl.textContent = 'Stay extended successfully';
        bookingsStatusEl.style.color = '#2ecc71';
        setTimeout(() => {
          bookingsStatusEl.textContent = 'Loading bookings…';
          bookingsStatusEl.style.color = '';
        }, 3000);
        
        await refreshRoomsAndBookings();
      } catch (err) {
        console.error('Extend failed:', err);
        bookingsStatusEl.textContent = `Action failed: ${err.code || err.error || 'Unknown error'}`;
        bookingsStatusEl.style.color = '#e74c3c';
        setTimeout(() => {
          bookingsStatusEl.textContent = 'Loading bookings…';
          bookingsStatusEl.style.color = '';
          refreshRoomsAndBookings();
        }, 3000);
        btn.disabled = false;
        btn.textContent = 'Go';
      }
      return;
    }

    const url = action === 'check-in'
      ? `/admin/bookings/${bookingId}/check-in`
      : `/admin/bookings/${bookingId}/check-out`;

    btn.disabled = true;
    btn.textContent = action === 'check-in' ? 'Checking-in…' : 'Checking-out…';

    try {
      await apiFetch(url, { method: 'POST', body: JSON.stringify({}) });
      // Simple and reliable: re-fetch after each successful action.
      await refreshRoomsAndBookings();
    } catch (err) {
      console.error('Admin booking action failed:', err);
      // Keep UI consistent: do not update local state when backend rejects.
      bookingsStatusEl.textContent = `Action failed: ${err.code || err.error || 'Unknown error'}`;
      setTimeout(() => {
        bookingsStatusEl.textContent = 'Loading bookings…';
        refreshRoomsAndBookings();
      }, 1200);
      btn.disabled = false;
      btn.textContent = action === 'check-in' ? 'Check-in' : 'Check-out';
    }
  });

  // Simple dynamic updating: periodic refresh (no reloads).
  refreshRoomsAndBookings();
  setInterval(refreshRoomsAndBookings, 30000);

  // Walk-in booking submit handler (no page reloads).
  if (walkinForm && walkinCreateBtn) {
    // Set default min dates (simple UX).
    const today = new Date().toISOString().split('T')[0];
    walkinCheckInEl.min = today;
    walkinCheckOutEl.min = today;

    // Ensure check-out is after check-in.
    walkinCheckInEl.addEventListener('change', () => {
      if (!walkinCheckInEl.value) return;
      const nextDay = new Date(walkinCheckInEl.value);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextStr = nextDay.toISOString().split('T')[0];
      walkinCheckOutEl.min = nextStr;
      if (walkinCheckOutEl.value && new Date(walkinCheckOutEl.value) <= new Date(walkinCheckInEl.value)) {
        walkinCheckOutEl.value = nextStr;
      }
    });

    walkinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isRefreshing) return;

      const location = walkinLocationEl.value;
      const roomType = walkinRoomTypeEl.value;
      const floor = walkinFloorEl.value; // "" means omitted
      const checkIn = walkinCheckInEl.value;
      const checkOut = walkinCheckOutEl.value;

      walkinErrorEl.textContent = '';

      if (!location || !roomType || !checkIn || !checkOut) {
        walkinErrorEl.textContent = 'Please fill in all required fields.';
        return;
      }

      if (new Date(checkOut) <= new Date(checkIn)) {
        walkinErrorEl.textContent = 'Check-out must be after check-in.';
        return;
      }

      const originalText = walkinCreateBtn.textContent;
      walkinCreateBtn.disabled = true;
      walkinCreateBtn.textContent = 'Creating…';

      try {
        const body = {
          location,
          roomType,
          // Only send floor when selected; backend treats it as optional.
          ...(floor ? { floor: Number(floor) } : {}),
          checkIn,
          checkOut,
        };

        const res = await apiFetch('/admin/bookings', {
          method: 'POST',
          body: JSON.stringify(body),
        });

        await refreshRoomsAndBookings();
        walkinErrorEl.textContent = '';
        if (walkinSuccessEl) {
          walkinSuccessEl.textContent = `Booking created successfully! Room ${res.room.number} assigned.`;
          setTimeout(() => {
            walkinSuccessEl.textContent = '';
          }, 3000);
        }
      } catch (err) {
        // Backend returns { error, code } on failure.
        const msg = err.code === 'HOTEL_FULL' ? (err.error || 'Hotel Full') : (err.error || 'Failed to create walk-in booking');
        walkinErrorEl.textContent = msg;
      } finally {
        walkinCreateBtn.disabled = false;
        walkinCreateBtn.textContent = originalText;
      }
    });
  }

  // Notification System Functions
  let notificationInterval;

  function formatNotificationTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  function renderNotifications(notifications) {
    if (!notifications || notifications.length === 0) {
      notificationList.innerHTML = '<div class="notification-empty">No notifications</div>';
      notificationBadge.style.display = 'none';
      return;
    }

    const unreadCount = notifications.filter(n => !n.read).length;
    
    // Update badge
    if (unreadCount > 0) {
      notificationBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
      notificationBadge.style.display = 'block';
    } else {
      notificationBadge.style.display = 'none';
    }

    // Type label configuration
    const typeLabels = {
      booking: { label: 'Booking', color: '#f1c40f' },   // Yellow
      checkout: { label: 'Checkout', color: '#3498db' },  // Blue
      cleaning: { label: 'Cleaning', color: '#2ecc71' }   // Green
    };

    // Render notifications
    notificationList.innerHTML = notifications.map(notification => {
      const typeConfig = typeLabels[notification.type] || { label: notification.type, color: '#888' };
      return `
      <div class="notification-item ${!notification.read ? 'unread' : ''}" data-id="${notification.id}">
        <div class="notification-header-row">
          <span class="notification-type-label" style="background: ${typeConfig.color}20; color: ${typeConfig.color}; border: 1px solid ${typeConfig.color}40;">${typeConfig.label}</span>
          <span class="notification-time">${formatNotificationTime(notification.createdAt)}</span>
        </div>
        <div class="notification-message">${notification.message}</div>
      </div>
    `}).join('');

    // Add click handlers to notifications
    document.querySelectorAll('.notification-item').forEach(item => {
      item.addEventListener('click', async () => {
        const id = item.dataset.id;
        await markNotificationAsRead(id);
        item.classList.remove('unread');
        
        // Update badge
        const currentBadge = notificationBadge.textContent;
        if (currentBadge !== '9+') {
          const newCount = Math.max(0, parseInt(currentBadge) - 1);
          if (newCount > 0) {
            notificationBadge.textContent = newCount;
          } else {
            notificationBadge.style.display = 'none';
          }
        }
      });
    });
  }

  async function fetchNotifications() {
    try {
      const res = await apiFetch('/admin/notifications?unread=false');
      renderNotifications(res.notifications);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }

  async function markNotificationAsRead(id) {
    try {
      await apiFetch(`/admin/notifications/${id}/read`, {
        method: 'PATCH'
      });
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }

  function toggleNotificationDropdown() {
    const isOpen = notificationDropdown.classList.contains('show');
    if (isOpen) {
      notificationDropdown.classList.remove('show');
    } else {
      notificationDropdown.classList.add('show');
      fetchNotifications();
    }
  }

  // Event Listeners
  notificationBell.addEventListener('click', () => {
    console.log('Bell clicked, toggling dropdown');
    toggleNotificationDropdown();
  });
  
  notificationClose.addEventListener('click', () => {
    console.log('Close clicked, hiding dropdown');
    notificationDropdown.classList.remove('show');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!notificationBell.contains(e.target) && !notificationDropdown.contains(e.target)) {
      notificationDropdown.classList.remove('show');
    }
  });

  // Auto-refresh notifications every 5 seconds
  notificationInterval = setInterval(() => {
    if (notificationDropdown.classList.contains('show')) {
      fetchNotifications();
    }
  }, 5000);

  // Pagination functions
  function renderRoomsPagination() {
    const paginationContainer = $('#rooms-pagination');
    if (!paginationContainer) return;

    if (roomsTotalPages <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }

    let html = `
      <div class="pagination-info">Page ${roomsPage} of ${roomsTotalPages}</div>
      <div class="pagination-controls">
        <button class="admin-btn pagination-btn" ${roomsPage <= 1 ? 'disabled' : ''} data-action="rooms-prev">
          ← Previous
        </button>
    `;

    // Show page numbers
    for (let i = 1; i <= roomsTotalPages; i++) {
      if (i === 1 || i === roomsTotalPages || (i >= roomsPage - 1 && i <= roomsPage + 1)) {
        html += `
          <button class="admin-btn pagination-btn ${i === roomsPage ? 'active' : ''}" data-action="rooms-page" data-page="${i}">
            ${i}
          </button>
        `;
      } else if (i === roomsPage - 2 || i === roomsPage + 2) {
        html += `<span class="pagination-ellipsis">…</span>`;
      }
    }

    html += `
        <button class="admin-btn pagination-btn" ${roomsPage >= roomsTotalPages ? 'disabled' : ''} data-action="rooms-next">
          Next →
        </button>
      </div>
    `;

    paginationContainer.innerHTML = html;

    // Add event listeners
    paginationContainer.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const action = e.currentTarget.dataset.action;
        
        if (action === 'rooms-prev' && roomsPage > 1) {
          roomsPage--;
        } else if (action === 'rooms-next' && roomsPage < roomsTotalPages) {
          roomsPage++;
        } else if (action === 'rooms-page') {
          roomsPage = parseInt(e.currentTarget.dataset.page);
        }

        // Fetch only rooms data for this page
        if (roomsStatusEl) roomsStatusEl.textContent = 'Loading rooms…';
        try {
          showSkeletons();
          await new Promise(resolve => setTimeout(resolve, 200));
          
          const searchParam = roomsSearch ? `&search=${encodeURIComponent(roomsSearch)}` : '';
          const statusParam = roomsStatusFilter ? `&status=${encodeURIComponent(roomsStatusFilter)}` : '';
          const roomsData = await apiFetch(`/admin/rooms?page=${roomsPage}&limit=${roomsLimit}${searchParam}${statusParam}`);
          roomsTotalPages = roomsData.totalPages || 1;
          renderRooms(roomsData.data);
          renderRoomsPagination();
          if (roomsStatusEl) roomsStatusEl.textContent = '';
        } catch (err) {
          console.error('Failed to load rooms:', err);
          if (roomsStatusEl) roomsStatusEl.textContent = 'Failed to load';
        }
      });
    });
  }

  function renderBookingsPagination() {
    const paginationContainer = $('#bookings-pagination');
    if (!paginationContainer) return;

    if (bookingsTotalPages <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }

    let html = `
      <div class="pagination-info">Page ${bookingsPage} of ${bookingsTotalPages}</div>
      <div class="pagination-controls">
        <button class="admin-btn pagination-btn" ${bookingsPage <= 1 ? 'disabled' : ''} data-action="bookings-prev">
          ← Previous
        </button>
    `;

    // Show page numbers
    for (let i = 1; i <= bookingsTotalPages; i++) {
      if (i === 1 || i === bookingsTotalPages || (i >= bookingsPage - 1 && i <= bookingsPage + 1)) {
        html += `
          <button class="admin-btn pagination-btn ${i === bookingsPage ? 'active' : ''}" data-action="bookings-page" data-page="${i}">
            ${i}
          </button>
        `;
      } else if (i === bookingsPage - 2 || i === bookingsPage + 2) {
        html += `<span class="pagination-ellipsis">…</span>`;
      }
    }

    html += `
        <button class="admin-btn pagination-btn" ${bookingsPage >= bookingsTotalPages ? 'disabled' : ''} data-action="bookings-next">
          Next →
        </button>
      </div>
    `;

    paginationContainer.innerHTML = html;

    // Add event listeners
    paginationContainer.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const action = e.currentTarget.dataset.action;
        
        if (action === 'bookings-prev' && bookingsPage > 1) {
          bookingsPage--;
        } else if (action === 'bookings-next' && bookingsPage < bookingsTotalPages) {
          bookingsPage++;
        } else if (action === 'bookings-page') {
          bookingsPage = parseInt(e.currentTarget.dataset.page);
        }

        // Fetch only bookings data for this page
        if (bookingsStatusEl) bookingsStatusEl.textContent = 'Loading bookings…';
        try {
          showSkeletons();
          await new Promise(resolve => setTimeout(resolve, 200));
          
          const bookingsData = await apiFetch(`/admin/bookings?status=${currentBookingStatus}&page=${bookingsPage}&limit=${bookingsLimit}`);
          bookingsTotalPages = bookingsData.totalPages || 1;
          renderBookings(bookingsData.data);
          renderBookingsPagination();
          if (bookingsStatusEl) bookingsStatusEl.textContent = '';
        } catch (err) {
          console.error('Failed to load bookings:', err);
          if (bookingsStatusEl) bookingsStatusEl.textContent = 'Failed to load';
        }
      });
    });
  }

  // Tab switching event listeners
  function switchTab(status) {
    currentBookingStatus = status;
    bookingsPage = 1; // Reset to first page when switching tabs
    
    // Update tab active states
    if (status === 'active') {
      activeTab.classList.add('active');
      historyTab.classList.remove('active');
    } else {
      activeTab.classList.remove('active');
      historyTab.classList.add('active');
    }
    
    // Refresh bookings with new status
    refreshRoomsAndBookings();
  }

  activeTab.addEventListener('click', () => switchTab('active'));
  historyTab.addEventListener('click', () => switchTab('history'));

  // Initial fetch
  fetchNotifications();
})();
