/* ═══════════════════════════════════════════════
   AURUM HOTELS — Application Logic
   ═══════════════════════════════════════════════ */

(() => {
  'use strict';

  /* ─────────────────────────────────────────────
     ROOM DATA (fallback for static mode)
     ───────────────────────────────────────────── */
  const ROOM_META = {
    deluxe: {
      type: 'Deluxe Room',
      detail: '42 m² · City View',
      price: 450,
      image: 'assets/room-deluxe.png',
      description:
        'A refined retreat featuring floor-to-ceiling windows with sweeping city views, a king-size bed with Egyptian cotton linens, and a rain shower with heated marble floors.',
      amenities: [
        'King Bed',
        'City View',
        'Rain Shower',
        'Mini Bar',
        'Wi-Fi',
        '24h Room Service',
      ],
    },
    suite: {
      type: 'Executive Suite',
      detail: '78 m² · Ocean View',
      price: 850,
      image: 'assets/room-suite.png',
      description:
        'An expansive suite with a separate living area, private balcony overlooking the ocean, walk-in closet, and a deep soaking tub with curated bath amenities.',
      amenities: [
        'King Bed',
        'Ocean View',
        'Living Area',
        'Private Balcony',
        'Soaking Tub',
        'Butler Service',
      ],
    },
    penthouse: {
      type: 'Penthouse',
      detail: '145 m² · Skyline Panorama',
      price: 1800,
      image: 'assets/room-penthouse.png',
      description:
        'The pinnacle of luxury — a sprawling penthouse with 360° skyline panorama, private terrace with plunge pool, grand living and dining areas, and a personal concierge.',
      amenities: [
        'Master Suite',
        'Panoramic View',
        'Private Terrace',
        'Plunge Pool',
        'Dining Area',
        'Personal Concierge',
      ],
    },
  };

  const PRICES = { deluxe: 450, suite: 850, penthouse: 1800 };

  /* ─────────────────────────────────────────────
     TAG FORMATTING
     ───────────────────────────────────────────── */
  function formatTags(tags) {
    if (!tags || tags.length === 0) return '';
    
    const tagLabels = {
      best_value: 'Best Value',
      best_view: 'Best View', 
      best_for_couples: 'Best for Couples'
    };
    
    // Limit to max 2 tags per room
    const limitedTags = tags.slice(0, 2);
    
    return limitedTags.map(tag => 
      `<span class="room-card__tag">${tagLabels[tag] || tag}</span>`
    ).join('');
  }

  /* ─────────────────────────────────────────────
     DOM REFERENCES
     ───────────────────────────────────────────── */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // Nav
  const nav = $('#nav');
  const menuToggle = $('#menu-toggle');

  // Booking bar
  const locationSelect = $('#location');
  const checkinInput = $('#checkin');
  const checkoutInput = $('#checkout');
  const roomTypeSelect = $('#room-type');
  const floorPrefSelect = $('#floor-pref');
  const bookingStatus = $('#booking-status');
  const statusText = $('#status-text');

  // Room grid
  const roomsGrid = $('.rooms__grid');

  // Modals
  const bookingModal = $('#booking-modal');
  const successModal = $('#success-modal');

  // Booking modal elements
  const modalImg = $('#modal-room-img');
  const modalTitle = $('#modal-title');
  const modalDetail = $('#modal-room-detail');
  const modalDesc = $('#modal-room-desc');
  const modalAmenities = $('#modal-amenities');
  const modalPrice = $('#modal-room-price');
  const confirmBtn = $('#confirm-booking');
  const bookingModalClose = $('#booking-modal-close');

  // Success modal elements
  const successDetails = $('#success-details');
  const successModalClose = $('#success-modal-close');
  const successCloseBtn = $('#success-close-btn');
  const successTitle = $('#success-title');

  // Auth elements
  const navAuth = $('#nav-auth');
  const navUser = $('#nav-user');
  const navLoginBtn = $('#nav-login-btn');
  const navSignupBtn = $('#nav-signup-btn');
  const navLogoutBtn = $('#nav-logout-btn');
  const userNameEl = $('#user-name');

  // Auth modals
  const signupModal = $('#signup-modal');
  const loginModal = $('#login-modal');
  const signupForm = $('#signup-form');
  const loginForm = $('#login-form');
  const signupModalClose = $('#signup-modal-close');
  const loginModalClose = $('#login-modal-close');
  const signupToLogin = $('#signup-to-login');
  const loginToSignup = $('#login-to-signup');
  const signupError = $('#signup-error');
  const loginError = $('#login-error');

  // Auth state
  let currentUser = null;

  // State
  let selectedRoom = null;
  let liveRooms = [];
  let isBackendAvailable = false;

  /* ─────────────────────────────────────────────
     API HELPERS
     ───────────────────────────────────────────── */
  const API = '/api';

  async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    console.log('TOKEN USED:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
    const headers = { 'Content-Type': 'application/json' };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const res = await fetch(`${API}${endpoint}`, {
      headers,
      ...options,
    });
    const data = await res.json();
    if (!res.ok) throw { status: res.status, ...data };
    return data;
  }

  // Check if backend is running
  async function checkBackend() {
    try {
      await apiFetch('/health');
      isBackendAvailable = true;
    } catch {
      isBackendAvailable = false;
    }
  }

  /* ─────────────────────────────────────────────
     NAVIGATION — Scroll Effect
     ───────────────────────────────────────────── */
  const handleNavScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  };

  window.addEventListener('scroll', handleNavScroll, { passive: true });

  /* ─────────────────────────────────────────────
     NAVIGATION — Mobile Menu Toggle
     ───────────────────────────────────────────── */
  menuToggle.addEventListener('click', () => {
    const links = $('.nav__links');
    const isOpen = links.style.display === 'flex';
    links.style.display = isOpen ? 'none' : 'flex';
    links.style.position = isOpen ? '' : 'absolute';
    links.style.top = isOpen ? '' : '100%';
    links.style.left = isOpen ? '' : '0';
    links.style.right = isOpen ? '' : '0';
    links.style.flexDirection = isOpen ? '' : 'column';
    links.style.padding = isOpen ? '' : '20px 40px';
    links.style.gap = isOpen ? '' : '20px';
    links.style.background = isOpen ? '' : 'rgba(10,10,10,0.95)';
    links.style.borderBottom = isOpen ? '' : '1px solid #222';
  });

  /* ─────────────────────────────────────────────
     BOOKING BAR — Auto-Update
     ───────────────────────────────────────────── */
  const setMinDates = () => {
    const today = new Date().toISOString().split('T')[0];
    checkinInput.min = today;
    checkoutInput.min = today;
  };

  let fetchTimeout = null;

  const updateBookingStatus = () => {
    const location = locationSelect.value;
    const checkin = checkinInput.value;
    const checkout = checkoutInput.value;
    const roomType = roomTypeSelect.value;
    const floor = floorPrefSelect.value;

    bookingStatus.classList.add('active');

    // Validate date range
    if (checkin && checkout && new Date(checkout) <= new Date(checkin)) {
      statusText.textContent = 'Check-out must be after check-in';
      return;
    }

    statusText.textContent = `Checking availability…`;

    // Debounce API call
    clearTimeout(fetchTimeout);
    fetchTimeout = setTimeout(() => {
      fetchAvailableRooms({ location, type: roomType, checkIn: checkin, checkOut: checkout, floor }).then(
        (count) => {
          const roomLabel = roomType ? ROOM_META[roomType]?.type : 'All room types';
          let text = `${count} room${count !== 1 ? 's' : ''} available`;
          
          if (checkin && checkout) {
            const nights = Math.ceil((new Date(checkout) - new Date(checkin)) / (1000 * 60 * 60 * 24));
            text += ` · ${nights} night${nights > 1 ? 's' : ''}`;
          }
          
          text += ` · ${roomLabel}`;
          if (floor) text += ` · Floor ${floor}`;
          
          statusText.textContent = text;
        }
      );
    }, 300);
  };

  /* ─────────────────────────────────────────────
     FETCH & RENDER ROOMS
     ───────────────────────────────────────────── */
  async function fetchAvailableRooms(filters = {}) {
    if (!isBackendAvailable) return 3; // Fallback: pretend all available

    try {
      const params = new URLSearchParams();
      if (filters.location) params.append('location', filters.location);
      if (filters.type) params.append('type', filters.type);
      if (filters.floor) params.append('floor', filters.floor);
      if (filters.checkIn) params.append('checkIn', filters.checkIn);
      if (filters.checkOut) params.append('checkOut', filters.checkOut);

      const data = await apiFetch(`/rooms?${params.toString()}`);
      liveRooms = data.rooms;
      renderRoomCards(data.rooms);
      return data.count;
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
      return 0;
    }
  }

  function renderRoomCards(rooms) {
    // Group by type: show one card per type available
    const byType = {};
    for (const room of rooms) {
      if (!byType[room.type]) {
        byType[room.type] = { count: 0, room, floors: new Set() };
      }
      byType[room.type].count++;
      byType[room.type].floors.add(room.floor);
    }

    // Fade out existing cards smoothly
    const existingCards = roomsGrid.querySelectorAll('.room-card');
    if (existingCards.length > 0) {
      existingCards.forEach(card => {
        card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        card.style.opacity = '0';
        card.style.transform = 'translateY(-10px)';
      });
      
      // Clear grid after fade out
      setTimeout(() => {
        roomsGrid.innerHTML = '';
        renderNewCards();
      }, 300);
    } else {
      roomsGrid.innerHTML = '';
      renderNewCards();
    }

    function renderNewCards() {
      if (rooms.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'rooms__empty';
        emptyDiv.style.animation = 'fadeIn 0.5s ease forwards';
        emptyDiv.innerHTML = '<p>Sorry! No rooms available.</p>';
        roomsGrid.appendChild(emptyDiv);
        return;
      }

      const typeOrder = ['deluxe', 'suite', 'penthouse'];
      const sorted = typeOrder.filter((t) => byType[t]);

      sorted.forEach((type, index) => {
        const meta = ROOM_META[type];
        const info = byType[type];
        if (!meta) return;

        const card = document.createElement('article');
        card.className = 'room-card reveal visible';
        card.dataset.room = type;
        card.dataset.price = PRICES[type];
        card.dataset.roomId = info.room.id;
        
        // Add smooth entrance animation with stagger
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';

        card.innerHTML = `
          <div class="room-card__img-wrap">
            <img src="${meta.image}" alt="${meta.type}" loading="lazy">
          </div>
          <div class="room-card__body">
            <div class="room-card__tags">
              ${formatTags(info.room.tags || [])}
            </div>
            <div class="room-card__meta">
              <span class="room-card__type">${meta.type}</span>
              <span class="room-card__detail">${meta.detail} · Floor ${[...info.floors].sort().join(', ')} · ${info.count} available</span>
            </div>
            <div class="room-card__footer">
              <span class="room-card__price">
                <span class="room-card__currency">$</span>${PRICES[type].toLocaleString()}<span class="room-card__per"> / night</span>
              </span>
              <button class="btn btn--outline room-card__btn" data-room="${type}">View Details</button>
            </div>
          </div>
        `;

        // Attach click handlers
        card.querySelector('.room-card__btn').addEventListener('click', (e) => {
          e.stopPropagation();
          if (!currentUser) {
            openLoginModal();
            return;
          }
          openBookingModal(type);
        });
        card.addEventListener('click', () => {
          if (!currentUser) {
            openLoginModal();
            return;
          }
          openBookingModal(type);
        });

        roomsGrid.appendChild(card);

        // Trigger entrance animation with stagger delay
        setTimeout(() => {
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        }, 50 + (index * 100));
      });
    }
  }

  // Set min dates on load
  setMinDates();

  // Auto-update on checkin change
  checkinInput.addEventListener('change', () => {
    if (checkinInput.value) {
      const nextDay = new Date(checkinInput.value);
      nextDay.setDate(nextDay.getDate() + 1);
      checkoutInput.min = nextDay.toISOString().split('T')[0];

      if (
        checkoutInput.value &&
        new Date(checkoutInput.value) <= new Date(checkinInput.value)
      ) {
        checkoutInput.value = nextDay.toISOString().split('T')[0];
      }
    }
    updateBookingStatus();
  });

  // Attach change listeners to all fields
  [locationSelect, checkoutInput, roomTypeSelect, floorPrefSelect].forEach((el) => {
    el.addEventListener('change', updateBookingStatus);
  });

  /* ─────────────────────────────────────────────
     ROOM CARDS — Open Booking Modal
     ───────────────────────────────────────────── */
  const openBookingModal = (roomKey) => {
    const meta = ROOM_META[roomKey];
    if (!meta) return;

    selectedRoom = { key: roomKey, ...meta };

    modalImg.src = meta.image;
    modalImg.alt = meta.type;
    modalTitle.textContent = meta.type;
    modalDetail.textContent = meta.detail;
    modalDesc.textContent = meta.description;
    modalPrice.textContent = `$${PRICES[roomKey].toLocaleString()} / night`;

    // Render amenities
    modalAmenities.innerHTML = meta.amenities
      .map((a) => `<span class="modal__amenity">${a}</span>`)
      .join('');

    bookingModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  // Attach click handlers to initial static room cards
  $$('.room-card__btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openBookingModal(btn.dataset.room);
    });
  });

  $$('.room-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.room-card__btn')) return;
      openBookingModal(card.dataset.room);
    });
  });

  /* ─────────────────────────────────────────────
     BOOKING MODAL — Close
     ───────────────────────────────────────────── */
  const closeBookingModal = () => {
    bookingModal.classList.remove('open');
    document.body.style.overflow = '';
  };

  bookingModalClose.addEventListener('click', closeBookingModal);

  bookingModal.addEventListener('click', (e) => {
    if (e.target === bookingModal) closeBookingModal();
  });

  /* ─────────────────────────────────────────────
     CONFIRM BOOKING — POST to API
     ───────────────────────────────────────────── */
  confirmBtn.addEventListener('click', async () => {
    if (!selectedRoom) return;

    const location = locationSelect.value;
    const checkin = checkinInput.value;
    const checkout = checkoutInput.value;

    // Validate that required fields are selected
    if (!location || !checkin || !checkout) {
      alert('Please select a location, check-in, and check-out dates to complete your booking.');
      return;
    }

    // If backend is available, post to API
    if (isBackendAvailable) {
      // Check if user is logged in
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please login to complete your booking.');
        openLoginModal();
        return;
      }
      
      confirmBtn.textContent = 'BOOKING…';
      confirmBtn.disabled = true;

      try {
        const preferredFloor = floorPrefSelect.value || undefined;
        const result = await apiFetch('/bookings', {
          method: 'POST',
          body: JSON.stringify({
            location,
            roomType: selectedRoom.key,
            checkIn: checkin,
            checkOut: checkout,
            preferredFloor,
          }),
        });

        closeBookingModal();

        setTimeout(() => {
          // Show success description on success
          const modalDesc = document.querySelector('.modal--success .modal__description');
          if (modalDesc) modalDesc.style.display = 'block';
          
          successTitle.textContent = 'Booking Confirmed';
          successDetails.innerHTML = `
            <p><span>Room</span><span>${result.room.type} — #${result.room.number}</span></p>
            <p><span>Floor</span><span>Floor ${result.room.floor}</span></p>
            <p><span>Location</span><span>${locationSelect.options[locationSelect.selectedIndex]?.text || location}</span></p>
            <p><span>Check-in</span><span>${formatDate(checkin)}</span></p>
            <p><span>Check-out</span><span>${formatDate(checkout)}</span></p>
            <p><span>Booking ID</span><span>#${result.booking.id}</span></p>
            <p><span>Rate</span><span style="color: var(--gold);">$${PRICES[selectedRoom.key].toLocaleString()} / night</span></p>
          `;
          successModal.classList.add('open');
          document.body.style.overflow = 'hidden';
        }, 300);

        // Refresh room availability
        updateBookingStatus();
      } catch (err) {
        closeBookingModal();

        setTimeout(() => {
          // Hide success description on error
          const modalDesc = document.querySelector('.modal--success .modal__description');
          if (modalDesc) modalDesc.style.display = 'none';
          
          if (err.code === 'HOTEL_FULL') {
            successTitle.textContent = 'Booking Failed';
            successDetails.innerHTML = `
              <p><span>Status</span><span style="color: #e74c3c;">Hotel Full</span></p>
              <p><span>Room Type</span><span>${ROOM_META[selectedRoom.key]?.type}</span></p>
              <p><span>Dates</span><span>${formatDate(checkin)} — ${formatDate(checkout)}</span></p>
            `;
          } else {
            successTitle.textContent = 'Booking Failed';
            successDetails.innerHTML = `<p><span>Error</span><span>${err.error || 'Unable to complete booking'}</span></p>`;
          }
          successModal.classList.add('open');
          document.body.style.overflow = 'hidden';
        }, 300);
      } finally {
        confirmBtn.textContent = 'CONFIRM BOOKING';
        confirmBtn.disabled = false;
      }
    } else {
      // Fallback: static mode (no backend)
      const loc =
        locationSelect.options[locationSelect.selectedIndex]?.text ||
        'Not selected';
      const checkinStr = checkin
        ? formatDate(checkin)
        : 'Not selected';
      const checkoutStr = checkout
        ? formatDate(checkout)
        : 'Not selected';

      closeBookingModal();

      setTimeout(() => {
        successTitle.textContent = 'Reservation Confirmed';
        successDetails.innerHTML = `
          <p><span>Room</span><span>${selectedRoom.type}</span></p>
          <p><span>Location</span><span>${loc}</span></p>
          <p><span>Check-in</span><span>${checkinStr}</span></p>
          <p><span>Check-out</span><span>${checkoutStr}</span></p>
          <p><span>Rate</span><span style="color: var(--gold);">$${PRICES[selectedRoom.key].toLocaleString()} / night</span></p>
        `;
        successModal.classList.add('open');
        document.body.style.overflow = 'hidden';
      }, 300);
    }
  });

  /* ─────────────────────────────────────────────
     SUCCESS MODAL — Close (manual only, no auto)
     ───────────────────────────────────────────── */
  const closeSuccessModal = () => {
    successModal.classList.remove('open');
    document.body.style.overflow = '';
  };

  successModalClose.addEventListener('click', closeSuccessModal);
  successCloseBtn.addEventListener('click', closeSuccessModal);

  successModal.addEventListener('click', (e) => {
    if (e.target === successModal) closeSuccessModal();
  });

  /* ─────────────────────────────────────────────
     AUTHENTICATION
     ───────────────────────────────────────────── */

  // Load user from localStorage
  function loadUser() {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('userData');
    console.log('LOAD USER - Token exists:', !!token);
    if (token && userData) {
      currentUser = JSON.parse(userData);
      updateAuthUI();
    }
  }

  // Update auth UI based on login state
  function updateAuthUI() {
    if (currentUser) {
      navAuth.style.display = 'none';
      navUser.style.display = 'flex';
      userNameEl.textContent = currentUser.name;
    } else {
      navAuth.style.display = 'flex';
      navUser.style.display = 'none';
    }
  }

  // Open/Close auth modals
  function openSignupModal() {
    signupModal.classList.add('open');
    signupError.textContent = '';
    signupForm.reset();
  }

  function closeSignupModal() {
    signupModal.classList.remove('open');
  }

  function openLoginModal() {
    loginModal.classList.add('open');
    loginError.textContent = '';
    loginForm.reset();
  }

  function closeLoginModal() {
    loginModal.classList.remove('open');
  }

  // Handle signup
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    signupError.textContent = '';

    const name = $('#signup-name').value.trim();
    const email = $('#signup-email').value.trim();
    const phone = $('#signup-phone').value.trim();
    const password = $('#signup-password').value;

    try {
      const response = await fetch(`${API}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password })
      });

      const data = await response.json();

      if (data.success) {
        // Save auth data
        localStorage.setItem('token', data.token);
        localStorage.setItem('userData', JSON.stringify(data.user));
        currentUser = data.user;
        updateAuthUI();
        closeSignupModal();
      } else {
        signupError.textContent = data.error || 'Signup failed';
      }
    } catch (err) {
      signupError.textContent = 'Network error. Please try again.';
    }
  });

  // Handle login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';

    const email = $('#login-email').value.trim();
    const password = $('#login-password').value;

    try {
      const response = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success) {
        // Save auth data
        localStorage.setItem('token', data.token);
        localStorage.setItem('userData', JSON.stringify(data.user));
        currentUser = data.user;
        console.log('LOGIN SUCCESS - Token stored:', data.token.substring(0, 20) + '...');
        updateAuthUI();
        closeLoginModal();
      } else {
        loginError.textContent = data.error || 'Invalid credentials';
      }
    } catch (err) {
      loginError.textContent = 'Network error. Please try again.';
    }
  });

  // Handle logout
  navLogoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    currentUser = null;
    console.log('LOGOUT - Token cleared');
    updateAuthUI();
  });

  // Modal toggle links
  signupToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    closeSignupModal();
    openLoginModal();
  });

  loginToSignup.addEventListener('click', (e) => {
    e.preventDefault();
    closeLoginModal();
    openSignupModal();
  });

  // Nav button handlers
  navSignupBtn.addEventListener('click', openSignupModal);
  navLoginBtn.addEventListener('click', openLoginModal);

  // Close modal handlers
  signupModalClose.addEventListener('click', closeSignupModal);
  loginModalClose.addEventListener('click', closeLoginModal);

  // Close on backdrop click
  signupModal.addEventListener('click', (e) => {
    if (e.target === signupModal) closeSignupModal();
  });
  loginModal.addEventListener('click', (e) => {
    if (e.target === loginModal) closeLoginModal();
  });

  // Keyboard: Escape to close auth modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (signupModal.classList.contains('open')) closeSignupModal();
      if (loginModal.classList.contains('open')) closeLoginModal();
    }
  });

  // Initialize auth state
  loadUser();

  /* ─────────────────────────────────────────────
     KEYBOARD — Escape to Close Modals
     ───────────────────────────────────────────── */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (successModal.classList.contains('open')) {
        closeSuccessModal();
      } else if (bookingModal.classList.contains('open')) {
        closeBookingModal();
      }
    }
  });

  /* ─────────────────────────────────────────────
     SCROLL REVEAL — IntersectionObserver
     ───────────────────────────────────────────── */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px',
    }
  );

  $$('.reveal').forEach((el) => revealObserver.observe(el));

  /* ─────────────────────────────────────────────
     SMOOTH SCROLL — CTA & Nav Links
     ───────────────────────────────────────────── */
  $$('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ─────────────────────────────────────────────
     HELPERS
     ───────────────────────────────────────────── */
  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  /* ─────────────────────────────────────────────
     INITIALIZATION
     ───────────────────────────────────────────── */
  checkBackend().then(() => {
    if (isBackendAvailable) {
      console.log('✓ Backend connected');
      fetchAvailableRooms();
    } else {
      console.log('○ Running in static mode (no backend)');
    }
  });
})();
