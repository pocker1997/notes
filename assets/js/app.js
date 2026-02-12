// assets/js/app.js
(async function initApp() {
  const sb = window.supabaseClient;

  // 1) Auth gate
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    window.location.href = '/login.html';
    return;
  }

  const user = session.user;

  const notesContainer = document.getElementById('notes-container');
  const appShell = document.getElementById('app-shell');
  const composer = document.getElementById('composer');
  const noteInput = document.getElementById('note-input');
  const sendButton = document.getElementById('send-button');
  const logoutBtn = document.getElementById('logoutBtn');
  const userLabel = document.getElementById('userLabel');
  const multiActionBar = document.getElementById('multi-action-bar');
  const multiActionCount = document.getElementById('multi-action-count');
  const multiThreadBtn = document.getElementById('multi-thread-btn');
  const multiDeleteBtn = document.getElementById('multi-delete-btn');
  const viewModeToggle = document.getElementById('view-mode-toggle');
  const viewFeedBtn = document.getElementById('viewFeedBtn');
  const viewOrganizedBtn = document.getElementById('viewOrganizedBtn');
  const viewPlanningBtn = document.getElementById('viewPlanningBtn');
  const threadSheet = document.getElementById('thread-sheet');
  const threadSheetOverlay = document.getElementById('thread-sheet-overlay');
  const threadSheetList = document.getElementById('thread-sheet-list');
  const threadSheetTitle = document.getElementById('thread-sheet-title');
  const threadSheetSubtitle = document.getElementById('thread-sheet-subtitle');
  const threadSheetClose = document.getElementById('thread-sheet-close');
  const threadNoteInput = document.getElementById('thread-note-input');
  const threadSendBtn = document.getElementById('thread-send-btn');

  userLabel.textContent = user.email || user.id;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // === streak ===
  const streakBadge = document.getElementById('streak-badge');
  const streakCountEl = document.getElementById('streak-count');
  const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function prevDay(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function computeStreak(notes) {
    const days = new Set();
    for (const n of notes) {
      if (n.date) {
        const raw = (n.date ?? '').toString();
        const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
        if (m) days.add(m[1]);
      }
    }
    const today = todayKey();
    let cursor = days.has(today) ? today : prevDay(today);
    let count = 0;
    while (days.has(cursor)) {
      count++;
      cursor = prevDay(cursor);
    }
    return count;
  }

  function updateStreakBadge(streak) {
    if (streak > 0 && streakBadge) {
      streakBadge.style.display = '';
      streakCountEl.textContent = streak;
    } else if (streakBadge) {
      streakBadge.style.display = 'none';
    }
  }

  function fireCelebration() {
    if (reduceMotion) return;
    const overlay = document.createElement('div');
    overlay.className = 'streak-celebration';
    const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
    const count = 40;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'streak-particle';
      const size = 5 + Math.random() * 7;
      const dur = 3000 + Math.random() * 2000;
      const delay = Math.random() * 1500;
      const startX = Math.random() * 100;
      const sway = (Math.random() - 0.5) * 60;
      const swayEnd = sway + (Math.random() - 0.5) * 40;
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.left = startX + '%';
      p.style.top = '0px';
      p.style.background = colors[i % colors.length];
      p.style.setProperty('--ty-start', '-20px');
      p.style.setProperty('--ty-end', (window.innerHeight + 40) + 'px');
      p.style.setProperty('--sway', sway + 'px');
      p.style.setProperty('--sway-end', swayEnd + 'px');
      p.style.setProperty('--dur', dur + 'ms');
      p.style.setProperty('--delay', delay + 'ms');
      overlay.appendChild(p);
    }
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 5500);
  }

  function checkStreakCelebration(streak) {
    if (!STREAK_MILESTONES.includes(streak)) return;
    const key = `streak_celebrated_${todayKey()}_${streak}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
    fireCelebration();
  }

  window.__debugStreak = {
    celebrate: () => fireCelebration(),
    setStreak: (n) => updateStreakBadge(n)
  };

  // === changelog / what's new ===
  const CHANGELOG_VERSION = 'v2';
  const changelogModal = document.getElementById('changelog-modal');
  const changelogCloseBtn = document.getElementById('changelog-close-btn');

  function isChangelogSeen() {
    return !!localStorage.getItem(`changelog_seen_${CHANGELOG_VERSION}`);
  }

  function markChangelogSeen() {
    localStorage.setItem(`changelog_seen_${CHANGELOG_VERSION}`, '1');
  }

  function openChangelog() {
    changelogModal.classList.add('is-open');
    changelogModal.setAttribute('aria-hidden', 'false');
    fireCelebration();
  }

  function closeChangelog() {
    changelogModal.classList.remove('is-open');
    changelogModal.setAttribute('aria-hidden', 'true');
    markChangelogSeen();
  }

  changelogCloseBtn?.addEventListener('click', closeChangelog);
  changelogModal?.querySelector('.changelog-modal-bg')?.addEventListener('click', closeChangelog);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && changelogModal?.classList.contains('is-open')) {
      closeChangelog();
    }
  });

  window.__debugChangelog = {
    open: () => openChangelog(),
    reset: () => { localStorage.removeItem(`changelog_seen_${CHANGELOG_VERSION}`); location.reload(); }
  };

  // === daily review ===
  const reviewModal = document.getElementById('review-modal');
  const reviewIntro = document.getElementById('review-intro');
  const reviewIntroCreated = document.getElementById('review-intro-created');
  const reviewIntroCompleted = document.getElementById('review-intro-completed');
  const reviewIntroPending = document.getElementById('review-intro-pending');
  const reviewStartBtn = document.getElementById('review-start-btn');
  const reviewIntroCloseBtn = document.getElementById('review-intro-close-btn');
  const reviewSwipeScreen = document.getElementById('review-swipe-screen');
  const reviewCardArea = document.getElementById('review-card-area');
  const reviewCard = document.getElementById('review-card');
  const reviewCardText = document.getElementById('review-card-text');
  const reviewCardMeta = document.getElementById('review-card-meta');
  const reviewCardLabelLeft = document.getElementById('review-card-label-left');
  const reviewCardLabelRight = document.getElementById('review-card-label-right');
  const reviewProgressText = document.getElementById('review-progress-text');
  const reviewSkipBtn = document.getElementById('review-skip-btn');
  const reviewDoneBtn = document.getElementById('review-done-btn');
  const reviewSummary = document.getElementById('review-summary');
  const reviewStatDone = document.getElementById('review-stat-done');
  const reviewStatSkipped = document.getElementById('review-stat-skipped');
  const reviewCloseBtn = document.getElementById('review-close-btn');

  let reviewTasks = [];
  let reviewIndex = 0;
  let reviewDoneCount = 0;
  let reviewSkippedCount = 0;
  let reviewSwiping = false;
  let reviewTimerInterval = null;
  let reviewForceShow = false;
  let reviewHintInterval = null;

  function getReviewCutoff() {
    // cutoff = today at 8:00 AM local time
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0, 0);
    return cutoff;
  }

  function getReviewTasks(notes) {
    const cutoff = getReviewCutoff();
    return notes.filter(n => {
      if (!n.is_task || n.completed || isThreadNote(n)) return false;
      const d = new Date(n.date);
      return d < cutoff;
    });
  }

  function isReviewDone() {
    return !!localStorage.getItem(`review_done_${todayKey()}`);
  }

  function markReviewDone() {
    localStorage.setItem(`review_done_${todayKey()}`, '1');
  }

  function renderReviewBanner() {
    const tasks = getReviewTasks(currentNotes);
    const done = isReviewDone();

    // no tasks and not done → no banner
    if (!tasks.length && !done) return null;

    // only show after 8:00 AM (unless forced via debug)
    if (!reviewForceShow && new Date().getHours() < 8) return null;

    const banner = document.createElement('button');
    banner.type = 'button';
    banner.className = 'review-banner';

    if (!done && tasks.length) {
      banner.innerHTML = `
        <div class="review-banner-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9 11l3 3L22 4"></path>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
        </div>
        <div class="review-banner-body">
          <div class="review-banner-title">Ревізія минулого дня</div>
          <div class="review-banner-sub">${tasks.length} ${tasks.length === 1 ? 'задача' : tasks.length < 5 ? 'задачі' : 'задач'} чекають</div>
        </div>
        <div class="review-banner-arrow">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9 18l6-6-6-6"></path>
          </svg>
        </div>
      `;
      banner.addEventListener('click', () => openReviewModal());
    } else {
      // done — show timer
      banner.innerHTML = `
        <div class="review-banner-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 6v6l4 2"></path>
          </svg>
        </div>
        <div class="review-banner-body">
          <div class="review-banner-title">Ревізія пройдена</div>
          <div class="review-banner-sub">Наступна через: <span id="review-timer">--:--:--</span></div>
        </div>
      `;
      banner.style.cursor = 'default';
      startReviewTimer();
    }

    return banner;
  }

  function startReviewTimer() {
    if (reviewTimerInterval) clearInterval(reviewTimerInterval);
    function tick() {
      const timerEl = document.getElementById('review-timer');
      if (!timerEl) { clearInterval(reviewTimerInterval); return; }
      const now = new Date();
      const target = new Date(now);
      target.setDate(target.getDate() + 1);
      target.setHours(8, 0, 0, 0);
      const diff = Math.max(0, target - now);
      const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
      timerEl.textContent = `${h}:${m}:${s}`;
    }
    tick();
    reviewTimerInterval = setInterval(tick, 1000);
  }

  function getYesterdayStats(notes) {
    const yesterday = prevDay(todayKey());
    let created = 0;
    let completed = 0;
    for (const n of notes) {
      if (!n.is_task || isThreadNote(n)) continue;
      const dk = dayKey(n.date);
      if (dk === yesterday) {
        created++;
        if (n.completed) completed++;
      }
    }
    return { created, completed };
  }

  function openReviewModal(forceTasks) {
    const tasks = forceTasks || getReviewTasks(currentNotes);
    if (!tasks.length) return;

    reviewTasks = tasks;
    reviewIndex = 0;
    reviewDoneCount = 0;
    reviewSkippedCount = 0;
    reviewSwiping = false;

    // hide all inner screens
    reviewIntro.style.display = '';
    reviewSwipeScreen.style.display = 'none';
    reviewSummary.style.display = 'none';

    // fill intro stats
    const stats = getYesterdayStats(forceTasks ? [] : currentNotes);
    animateCounter(reviewIntroCreated, stats.created, 500);
    animateCounter(reviewIntroCompleted, stats.completed, 500);

    const pendingCount = tasks.length;
    const pendingWord = pendingCount === 1 ? 'задача' : pendingCount < 5 ? 'задачі' : 'задач';
    reviewIntroPending.textContent = `Є ще ${pendingCount} ${pendingWord}, які треба перевірити`;

    // open modal
    reviewModal.classList.add('is-open');
    reviewModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function startReviewSwipe() {
    reviewIntro.style.display = 'none';
    reviewSwipeScreen.style.display = '';
    showReviewCard(0, true);
  }

  function closeReviewModal(allReviewed) {
    reviewModal.classList.remove('is-open');
    reviewModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    stopReviewHint();
    if (allReviewed) {
      markReviewDone();
    }
    loadNotes();
  }

  function stopReviewHint() {
    if (reviewHintInterval) {
      clearInterval(reviewHintInterval);
      reviewHintInterval = null;
    }
    reviewCard?.classList.remove('onboarding-hint');
  }

  function startReviewHintLoop() {
    stopReviewHint();
    if (reduceMotion) return;

    function playHint() {
      reviewCard.classList.remove('onboarding-hint');
      // force reflow so animation re-triggers
      void reviewCard.offsetWidth;
      reviewCard.classList.add('onboarding-hint');
    }

    // play immediately on first card
    playHint();

    // repeat every 5s
    reviewHintInterval = setInterval(playHint, 5000);
  }

  function showReviewCard(index, isFirst) {
    if (index >= reviewTasks.length) {
      showReviewSummary();
      return;
    }

    const task = reviewTasks[index];
    const taskInfo = parseTask(task.text);
    reviewCardText.textContent = taskInfo.displayText;
    reviewCardMeta.textContent = fmtDay(task.date) + ' · ' + fmtTime(task.date);
    reviewProgressText.textContent = `${index + 1} / ${reviewTasks.length}`;

    // reset card state
    reviewCard.className = 'review-card';
    reviewCard.style.transform = '';
    reviewCardLabelLeft.style.opacity = '0';
    reviewCardLabelRight.style.opacity = '0';

    if (isFirst) {
      startReviewHintLoop();
    }
  }

  async function onReviewSwipe(direction) {
    if (reviewSwiping) return;
    reviewSwiping = true;

    const task = reviewTasks[reviewIndex];

    if (direction === 'right') {
      reviewDoneCount++;
      await toggleTaskCompleted(task.id, true);
      reviewCard.classList.add('exit-right');
    } else {
      reviewSkippedCount++;
      reviewCard.classList.add('exit-left');
    }

    const onDone = () => {
      reviewIndex++;
      reviewSwiping = false;
      showReviewCard(reviewIndex, false);
    };

    if (reduceMotion) {
      onDone();
    } else {
      reviewCard.addEventListener('animationend', onDone, { once: true });
    }
  }

  function showReviewSummary() {
    reviewSwipeScreen.style.display = 'none';
    reviewSummary.style.display = '';
    stopReviewHint();

    // animate numbers counting up
    animateCounter(reviewStatDone, reviewDoneCount, 600);
    animateCounter(reviewStatSkipped, reviewSkippedCount, 600);

    fireCelebration();
  }

  function animateCounter(el, target, durationMs) {
    if (target === 0 || reduceMotion) {
      el.textContent = target;
      return;
    }
    const start = performance.now();
    function step(now) {
      const t = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      el.textContent = Math.round(eased * target);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // swipe gesture
  let swipeStartX = 0;
  let swipeStartY = 0;
  let swipeActive = false;
  const SWIPE_THRESHOLD = 80;

  reviewCardArea?.addEventListener('pointerdown', (e) => {
    if (reviewSwiping) return;
    swipeStartX = e.clientX;
    swipeStartY = e.clientY;
    swipeActive = true;
    stopReviewHint();
    reviewCard.classList.add('is-dragging');
    reviewCardArea.setPointerCapture(e.pointerId);
  });

  reviewCardArea?.addEventListener('pointermove', (e) => {
    if (!swipeActive || reviewSwiping) return;
    const dx = e.clientX - swipeStartX;
    const dy = e.clientY - swipeStartY;

    // if mostly vertical, ignore
    if (Math.abs(dy) > Math.abs(dx) * 1.5 && Math.abs(dx) < 20) return;

    const rotation = Math.max(-12, Math.min(12, dx * 0.08));
    reviewCard.style.transform = `translateX(${dx}px) rotate(${rotation}deg)`;

    const progress = Math.min(Math.abs(dx) / SWIPE_THRESHOLD, 1);
    if (dx > 0) {
      reviewCardLabelRight.style.opacity = String(progress);
      reviewCardLabelLeft.style.opacity = '0';
    } else {
      reviewCardLabelLeft.style.opacity = String(progress);
      reviewCardLabelRight.style.opacity = '0';
    }
  });

  reviewCardArea?.addEventListener('pointerup', (e) => {
    if (!swipeActive) return;
    swipeActive = false;
    reviewCard.classList.remove('is-dragging');

    const dx = e.clientX - swipeStartX;
    if (Math.abs(dx) >= SWIPE_THRESHOLD) {
      onReviewSwipe(dx > 0 ? 'right' : 'left');
    } else {
      // snap back
      reviewCard.style.transform = '';
      reviewCardLabelLeft.style.opacity = '0';
      reviewCardLabelRight.style.opacity = '0';
    }
  });

  reviewCardArea?.addEventListener('pointercancel', () => {
    swipeActive = false;
    reviewCard.classList.remove('is-dragging');
    reviewCard.style.transform = '';
    reviewCardLabelLeft.style.opacity = '0';
    reviewCardLabelRight.style.opacity = '0';
  });

  // button listeners
  reviewStartBtn?.addEventListener('click', startReviewSwipe);
  reviewIntroCloseBtn?.addEventListener('click', () => closeReviewModal(false));
  reviewSkipBtn?.addEventListener('click', () => { stopReviewHint(); onReviewSwipe('left'); });
  reviewDoneBtn?.addEventListener('click', () => { stopReviewHint(); onReviewSwipe('right'); });
  reviewCloseBtn?.addEventListener('click', () => closeReviewModal(true));

  // Escape closes review modal — early close = not done
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && reviewModal.classList.contains('is-open')) {
      e.preventDefault();
      e.stopPropagation();
      // if we're on the summary screen, it means all tasks were reviewed
      const onSummary = reviewSummary.style.display !== 'none';
      closeReviewModal(onSummary);
    }
  }, true);

  function _fakeReviewTasks() {
    const yesterday = prevDay(todayKey());
    return [
      { id: 'fake1', text: '[] Купити молоко', date: yesterday + 'T10:00:00Z', is_task: true, completed: false },
      { id: 'fake2', text: '[] Зробити код-рев\'ю', date: yesterday + 'T14:30:00Z', is_task: true, completed: false },
      { id: 'fake3', text: 'Завдання: написати тести', date: yesterday + 'T16:00:00Z', is_task: true, completed: false },
      { id: 'fake4', text: '[] Відповісти на лист', date: yesterday + 'T09:15:00Z', is_task: true, completed: false },
      { id: 'fake5', text: '[] Оновити залежності', date: yesterday + 'T11:45:00Z', is_task: true, completed: false },
    ];
  }

  window.__debugReview = {
    open: () => {
      // force open with fake tasks if none exist
      const tasks = getReviewTasks(currentNotes);
      if (tasks.length) {
        openReviewModal(tasks);
      } else {
        openReviewModal(_fakeReviewTasks());
      }
    },
    reset: () => {
      localStorage.removeItem(`review_done_${todayKey()}`);
      location.reload();
    },
    banner: () => {
      // inject fake yesterday tasks + completed ones for stats
      const yesterday = prevDay(todayKey());
      const fakes = _fakeReviewTasks();
      const completedFakes = [
        { id: 'fakeDone1', text: '[] Прочитати статтю', date: yesterday + 'T08:00:00Z', is_task: true, completed: true },
        { id: 'fakeDone2', text: '[] Зробити каву', date: yesterday + 'T07:30:00Z', is_task: true, completed: true },
      ];
      localStorage.removeItem(`review_done_${todayKey()}`);
      currentNotes.push(...fakes, ...completedFakes);
      // re-sort so fakes appear in correct chronological order
      currentNotes.sort((a, b) => {
        const ka = sortableDateKey(a.date);
        const kb = sortableDateKey(b.date);
        if (ka !== kb) return ka.localeCompare(kb);
        return String(a.id).localeCompare(String(b.id));
      });
      reviewForceShow = true;
      renderCurrentView();
      reviewForceShow = false;
    }
  };

  // === timings (CSS uses --hold-ms) ===
  const HOLD_MS_SINGLE = 1000;
  const HOLD_MS_MULTI = 2000;
  document.documentElement.style.setProperty('--hold-ms', `${HOLD_MS_MULTI}ms`);

  // === formatting ===
  const fmtTime = (iso) => new Date(iso).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
  const fmtDay = (iso) => new Date(iso).toLocaleDateString('uk-UA', { day: '2-digit', month: 'long' });

  const dayKey = (iso) => {
    const raw = (iso ?? '').toString();
    const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];

    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '0000-00-00';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const sortableDateKey = (iso) => {
    const raw = (iso ?? '').toString();
    if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) return raw;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '0000-00-00T00:00:00.000Z';
    return d.toISOString();
  };

  // === state ===
  let currentNotes = [];
  let lastInsertedId = null;

  let editingNoteId = null;
  let editingOriginalText = '';

  let multiSelectMode = false;
  let lastSelectedIndex = null;
  const selectedNoteIds = new Set();
  let openedThreadNoteId = null;
  let editingThreadItemIndex = null;
  let viewMode = 'feed'; // feed | organized
  let activeFolderType = null;

  const THREAD_MARKER = '__thread_v1__';

  function setEditingMode(on) {
    document.body.classList.toggle('is-editing', on);
  }

  function isThreadNote(note) {
    return typeof note?.text === 'string' && note.text.startsWith(THREAD_MARKER);
  }

  function parseThreadPayload(note) {
    if (!isThreadNote(note)) return null;
    if (!note?.answer) return null;

    try {
      const payload = JSON.parse(note.answer);
      if (!payload || !Array.isArray(payload.items)) return null;
      return payload;
    } catch (_) {
      return null;
    }
  }

  function safeThreadItems(payload) {
    if (!payload?.items || !Array.isArray(payload.items)) return [];
    return payload.items
      .filter((item) => item && typeof item.text === 'string' && typeof item.date === 'string')
      .map((item) => ({
        id: item.id ?? null,
        text: item.text,
        date: item.date,
        is_task: !!item.is_task,
        completed: !!item.completed,
        is_question: !!item.is_question,
        answer: item.answer ?? null
      }));
  }

  function collectThreadMemberIds(notes) {
    const hiddenIds = new Set();
    for (const note of notes) {
      const payload = parseThreadPayload(note);
      if (!payload) continue;
      for (const item of safeThreadItems(payload)) {
        if (item.id !== null && item.id !== undefined) hiddenIds.add(String(item.id));
      }
    }
    return hiddenIds;
  }

  function selectedThreadSourceNotes() {
    const selected = currentNotes.filter((note) => selectedNoteIds.has(note.id));
    return selected.filter((note) => !isThreadNote(note));
  }

  function noteTypeOf(note) {
    if (parseThreadPayload(note)) return 'thread';
    const taskInfo = parseTask(note.text);
    if (note.is_task || taskInfo.isTask) return 'task';
    if (note.is_question || isQuestionText(note.text)) return 'question';
    return 'note';
  }

  function folderLabel(type) {
    if (type === 'task') return 'Завдання';
    if (type === 'question') return 'Питання';
    if (type === 'thread') return 'Треди';
    return 'Нотатки';
  }

  function syncComposerOffset() {
    const h = composer?.offsetHeight || 88;
    appShell?.style.setProperty('--composer-offset', `${h + 10}px`);
  }

  function updateComposerVisibility() {
    const hideComposer = viewMode === 'organized';
    if (composer) composer.style.display = hideComposer ? 'none' : '';
    syncComposerOffset();
  }

  function updateViewModeUi() {
    const buttons = viewModeToggle?.querySelectorAll('[data-view-mode]') || [];
    buttons.forEach((btn) => {
      const mode = btn.dataset.viewMode;
      const isActive = mode === viewMode;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  }

  function setViewMode(nextMode) {
    if (nextMode !== 'feed' && nextMode !== 'organized') return;
    if (viewMode === nextMode) return;

    viewMode = nextMode;
    activeFolderType = null;
    if (multiSelectMode) exitMultiSelectMode();
    if (editingNoteId) exitEdit({ restoreInput: true });
    updateViewModeUi();
    updateComposerVisibility();
    renderCurrentView();
  }

  function updateMultiActionState() {
    const canUseMulti = viewMode === 'feed' && !activeFolderType;
    const count = selectedNoteIds.size;
    const threadableCount = selectedThreadSourceNotes().length;
    multiActionCount.textContent = `Вибрано: ${count}`;
    multiDeleteBtn.disabled = count === 0;
    multiThreadBtn.disabled = threadableCount < 2;
    document.body.classList.toggle('is-multi-select', canUseMulti && multiSelectMode);
    multiActionBar.classList.toggle('is-visible', canUseMulti && multiSelectMode);
    multiActionBar.setAttribute('aria-hidden', canUseMulti && multiSelectMode ? 'false' : 'true');
  }

  function clearMultiSelection() {
    selectedNoteIds.clear();
    lastSelectedIndex = null;
  }

  function exitMultiSelectMode() {
    multiSelectMode = false;
    clearMultiSelection();
    updateMultiActionState();
    renderCurrentView({ preserveScroll: true });
  }

  function enterMultiSelectMode() {
    if (editingNoteId) return;
    if (multiSelectMode) return;
    multiSelectMode = true;
    updateMultiActionState();
  }

  function noteIndexById(noteId) {
    return currentNotes.findIndex((note) => note.id === noteId);
  }

  function toggleSelectedNote(noteId, { setAnchor = true } = {}) {
    if (!multiSelectMode) {
      enterMultiSelectMode();
      if (!multiSelectMode) return;
    }

    if (selectedNoteIds.has(noteId)) selectedNoteIds.delete(noteId);
    else selectedNoteIds.add(noteId);

    if (setAnchor) {
      const idx = noteIndexById(noteId);
      if (idx >= 0) lastSelectedIndex = idx;
    }

    if (!selectedNoteIds.size) {
      exitMultiSelectMode();
      return;
    }

    updateMultiActionState();
    renderCurrentView({ preserveScroll: true });
  }

  function selectRangeTo(noteId) {
    const targetIdx = noteIndexById(noteId);
    if (targetIdx < 0) return;

    if (!multiSelectMode) {
      enterMultiSelectMode();
      if (!multiSelectMode) return;
    }

    if (lastSelectedIndex === null) {
      selectedNoteIds.add(noteId);
      lastSelectedIndex = targetIdx;
      updateMultiActionState();
      renderCurrentView({ preserveScroll: true });
      return;
    }

    const from = Math.min(lastSelectedIndex, targetIdx);
    const to = Math.max(lastSelectedIndex, targetIdx);

    for (let i = from; i <= to; i++) {
      const id = currentNotes[i]?.id;
      if (id) selectedNoteIds.add(id);
    }

    updateMultiActionState();
    renderCurrentView({ preserveScroll: true });
  }

  // ======================
  // TASK PARSING (robust)
  // ======================
  function parseTask(rawText) {
    const text = (rawText ?? '').toString();

    // 1) Brackets at start: [] or [ ]
    const bracketRe = /^\s*\[\s*\]\s*/;
    if (bracketRe.test(text)) {
      const displayText = text.replace(bracketRe, '');
      const trimmed = displayText.trimStart();
      const firstWordMatch = trimmed.match(/^([^\s]+)/);
      const firstWord = firstWordMatch ? firstWordMatch[1] : '';

      let highlightIndex = -1;
      let highlightLength = 0;

      if (firstWord) {
        const idx = displayText.indexOf(firstWordMatch[0]);
        highlightIndex = idx;
        highlightLength = firstWord.length;
      }

      return {
        isTask: true,
        kind: 'brackets',
        displayText,
        highlightIndex,
        highlightLength
      };
    }

    // 2) Keywords task (Unicode-safe)
    const kwRe = /(^|[^\p{L}])(задача|завдання|зробити)(:)?(?=[^\p{L}]|$)/iu;
    const m = text.match(kwRe);

    if (m && typeof m.index === 'number') {
      const prefix = m[1] ?? '';
      const word = m[2] ?? '';
      const colon = m[3] ?? '';
      const full = word + colon;

      const highlightIndex = m.index + prefix.length;

      return {
        isTask: true,
        kind: 'keywords',
        displayText: text,
        highlightIndex,
        highlightLength: full.length
      };
    }

    return {
      isTask: false,
      kind: null,
      displayText: text,
      highlightIndex: -1,
      highlightLength: 0
    };
  }

  function renderTextWithHighlight(containerEl, text, hiIndex, hiLen) {
    containerEl.textContent = '';

    if (hiIndex < 0 || hiLen <= 0) {
      containerEl.textContent = text;
      return;
    }

    const before = text.slice(0, hiIndex);
    const word = text.slice(hiIndex, hiIndex + hiLen);
    const after = text.slice(hiIndex + hiLen);

    if (before) containerEl.appendChild(document.createTextNode(before));

    const pill = document.createElement('span');
    pill.className = 'task-pill';
    pill.textContent = word;
    containerEl.appendChild(pill);

    if (after) containerEl.appendChild(document.createTextNode(after));
  }

  // ======================
  // QUESTION PARSING
  // ======================
  function isQuestionText(rawText) {
    const t = (rawText ?? '').toString();
    return t.includes('?');
  }

  // ==========
  // EDIT MODE (note)
  // ==========
  function enterEdit(note) {
    editingNoteId = note.id;
    editingOriginalText = note.text ?? '';
    setEditingMode(true);

    noteInput.value = editingOriginalText;
    sendButton.disabled = noteInput.value.trim().length === 0;

    noteInput.style.height = 'auto';
    noteInput.style.height = Math.min(noteInput.scrollHeight, 120) + 'px';
    syncComposerOffset();

    noteInput.focus();
    try { noteInput.setSelectionRange(noteInput.value.length, noteInput.value.length); } catch (_) {}

    renderCurrentView();
  }

  function exitEdit({ restoreInput = true } = {}) {
    editingNoteId = null;
    editingOriginalText = '';
    setEditingMode(false);

    if (restoreInput) {
      noteInput.value = '';
      noteInput.style.height = 'auto';
      sendButton.disabled = true;
      syncComposerOffset();
    }

    renderCurrentView();
  }

  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;

    if (threadSheet.classList.contains('is-open')) {
      e.preventDefault();
      closeThreadSheet();
      return;
    }

    if (editingNoteId) {
      e.preventDefault();
      exitEdit({ restoreInput: true });
      return;
    }

    if (viewMode === 'organized' && activeFolderType) {
      e.preventDefault();
      activeFolderType = null;
      renderCurrentView({ preserveScroll: false });
      return;
    }

    if (multiSelectMode) {
      e.preventDefault();
      exitMultiSelectMode();
    }
  });

  // ===================
  // DELETE HOLD LOGIC
  // ===================
  function cleanupOrphanSeparators(containerEl = notesContainer) {
    const children = Array.from(containerEl.children);
    for (let i = 0; i < children.length; i++) {
      const node = children[i];
      if (!node.classList?.contains('day-sep')) continue;

      let hasNoteUntilNextSep = false;
      for (let j = i + 1; j < children.length; j++) {
        const n = children[j];
        if (n.classList?.contains('day-sep')) break;
        if (n.classList?.contains('note-row')) { hasNoteUntilNextSep = true; break; }
      }
      if (!hasNoteUntilNextSep) node.remove();
    }
  }

  function attachHoldAction(btn, onCommit, holdMs) {
    const duration = holdMs || HOLD_MS_MULTI;
    let timer = null;
    let active = false;

    const resetVisual = () => {
      btn.classList.remove('is-holding');
      btn.style.removeProperty('--hold-ms');
      btn.classList.add('is-cancel');
      window.setTimeout(() => btn.classList.remove('is-cancel'), reduceMotion ? 0 : 140);
    };

    const cancel = () => {
      if (!active) return;
      active = false;
      if (timer) window.clearTimeout(timer);
      timer = null;
      resetVisual();
    };

    btn.addEventListener('pointerdown', (e) => {
      if (btn.disabled) return;

      e.preventDefault();
      try { btn.setPointerCapture(e.pointerId); } catch (_) {}

      active = true;
      btn.classList.remove('is-cancel');
      btn.style.setProperty('--hold-ms', `${duration}ms`);
      btn.classList.add('is-holding');

      timer = window.setTimeout(async () => {
        if (!active) return;
        active = false;
        timer = null;
        await onCommit();
        resetVisual();
      }, duration);
    });

    btn.addEventListener('pointerup', cancel);
    btn.addEventListener('pointercancel', cancel);
    btn.addEventListener('pointerleave', cancel);
    window.addEventListener('blur', cancel, { passive: true });
  }

  function attachHoldToDelete(btn, rowEl, noteId, containerEl = notesContainer) {
    const commit = async () => {
      rowEl.classList.add('note-removing');

      const { error } = await sb
        .from('notes')
        .delete()
        .eq('id', noteId)
        .eq('user_id', user.id);

      if (error) {
        rowEl.classList.remove('note-removing');
        alert('Не вдалось видалити: ' + error.message);
        return;
      }

      const removeAfter = reduceMotion ? 0 : 190;
      window.setTimeout(() => {
        rowEl.remove();
        cleanupOrphanSeparators(containerEl);
      }, removeAfter);
    };

    attachHoldAction(btn, async () => {
      if (editingNoteId || multiSelectMode) return;
      await commit();
    }, HOLD_MS_SINGLE);
  }

  // ==========================
  // DOUBLE TAP (mobile helper)
  // ==========================
  function attachDoubleTap(el, onDouble) {
    let lastTapAt = 0;
    const THRESH_MS = 260;

    el.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'mouse') return;

      const now = Date.now();
      if (now - lastTapAt < THRESH_MS) {
        lastTapAt = 0;
        onDouble();
      } else {
        lastTapAt = now;
      }
    });
  }

  function attachLongPress(el, onLongPress) {
    let timer = null;
    let triggered = false;
    let startX = 0;
    let startY = 0;
    const LONG_PRESS_MS = 420;
    const MOVE_TOLERANCE_PX = 8;

    const cancel = () => {
      if (timer) window.clearTimeout(timer);
      timer = null;
      triggered = false;
    };

    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      if (editingNoteId) return;

      startX = e.clientX;
      startY = e.clientY;
      triggered = false;
      timer = window.setTimeout(() => {
        triggered = true;
        onLongPress(e);
      }, LONG_PRESS_MS);
    });

    el.addEventListener('pointermove', (e) => {
      if (timer === null) return;
      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);
      if (dx > MOVE_TOLERANCE_PX || dy > MOVE_TOLERANCE_PX) cancel();
    });
    el.addEventListener('pointerup', (e) => {
      if (triggered) {
        e.preventDefault();
        e.stopPropagation();
      }
      cancel();
    });
    el.addEventListener('pointercancel', cancel);
    el.addEventListener('pointerleave', cancel);
  }

  function isRowActionTarget(target) {
    if (!target) return false;
    return !!target.closest(
      '.note-del, .task-check, .answer-wrap, .answer-input, .answer-save, [data-answer-save], [data-answer-input], [data-answer-wrap], .multi-check'
    );
  }

  async function deleteSelectedNotes() {
    const ids = Array.from(selectedNoteIds);
    if (!ids.length) return;

    if (openedThreadNoteId && ids.includes(openedThreadNoteId)) {
      closeThreadSheet();
    }

    const { error } = await sb
      .from('notes')
      .delete()
      .in('id', ids)
      .eq('user_id', user.id);

    if (error) {
      alert('Не вдалось видалити вибрані нотатки: ' + error.message);
      return;
    }

    exitMultiSelectMode();
    await loadNotes();
  }

  function closeThreadSheet() {
    openedThreadNoteId = null;
    editingThreadItemIndex = null;

    // restore title element if it was replaced by edit input
    const head = document.querySelector('.thread-sheet-head');
    if (head && !head.contains(threadSheetTitle)) {
      const editInput = head.querySelector('.thread-sheet-title-input');
      if (editInput) head.replaceChild(threadSheetTitle, editInput);
    }

    threadSheet.classList.remove('is-open');
    threadSheet.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('thread-sheet-open');
  }

  function escAttr(v) {
    return (v ?? '').toString().replace(/"/g, '&quot;');
  }

  function deleteIconSvg(stroke = 'currentColor') {
    return `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 6h18"></path>
        <path d="M8 6V4h8v2"></path>
        <path d="M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14"></path>
        <path d="M10 10v8"></path>
        <path d="M14 10v8"></path>
      </svg>
    `;
  }

  async function mutateOpenedThreadPayload(mutator) {
    if (!openedThreadNoteId) return null;

    const noteIdx = currentNotes.findIndex((n) => n.id === openedThreadNoteId);
    if (noteIdx < 0) return null;

    const note = currentNotes[noteIdx];
    const payload = parseThreadPayload(note);
    if (!payload) return null;

    const sourceItems = safeThreadItems(payload);
    const nextItems = mutator(sourceItems.map((item) => ({ ...item })));
    if (!Array.isArray(nextItems)) return null;

    const nextPayload = {
      ...payload,
      items: nextItems
    };

    const serialized = JSON.stringify(nextPayload);
    const { error } = await sb
      .from('notes')
      .update({ answer: serialized })
      .eq('id', openedThreadNoteId)
      .eq('user_id', user.id);

    if (error) {
      alert('Не вдалось оновити тред: ' + error.message);
      return null;
    }

    currentNotes[noteIdx].answer = serialized;
    return { note: currentNotes[noteIdx], payload: nextPayload };
  }

  async function updateThreadTitle(noteId, newTitle) {
    const noteIdx = currentNotes.findIndex((n) => n.id === noteId);
    if (noteIdx < 0) return null;

    const note = currentNotes[noteIdx];
    const payload = parseThreadPayload(note);
    if (!payload) return null;

    const nextPayload = { ...payload, title: newTitle || undefined };
    if (!newTitle) delete nextPayload.title;

    const serialized = JSON.stringify(nextPayload);
    const { error } = await sb
      .from('notes')
      .update({ answer: serialized })
      .eq('id', noteId)
      .eq('user_id', user.id);

    if (error) {
      alert('Не вдалось оновити назву: ' + error.message);
      return null;
    }

    currentNotes[noteIdx].answer = serialized;
    return { note: currentNotes[noteIdx], payload: nextPayload };
  }

  function startEditThreadTitle(note, payload) {
    const currentTitle = payload.title || '';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'thread-sheet-title-input';
    input.value = currentTitle;
    input.placeholder = 'Назва треду...';

    const head = threadSheetTitle.parentNode;
    head.replaceChild(input, threadSheetTitle);
    input.focus();
    input.select();

    let saved = false;
    async function finish(save) {
      if (saved) return;
      saved = true;
      const val = input.value.trim();

      if (save && val !== currentTitle) {
        const result = await updateThreadTitle(note.id, val);
        if (result) {
          head.replaceChild(threadSheetTitle, input);
          threadSheetTitle.textContent = val || 'Тред';
          // re-render feed to update preview
          renderCurrentView({ preserveScroll: true });
          return;
        }
      }

      head.replaceChild(threadSheetTitle, input);
      threadSheetTitle.textContent = currentTitle || 'Тред';
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });
    input.addEventListener('blur', () => finish(true));
  }

  function renderThreadSheetFeed(note, payload) {
    const items = safeThreadItems(payload);
    threadSheetTitle.textContent = payload.title || 'Тред';
    const msgWord = items.length === 1 ? 'повідомлення' : items.length < 5 ? 'повідомлення' : 'повідомлень';
    threadSheetSubtitle.textContent = `${items.length} ${msgWord}`;

    // click on title → edit
    threadSheetTitle.onclick = () => startEditThreadTitle(note, payload);
    threadSheetList.innerHTML = '';

    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `<div class="empty-text">Тред порожній.</div>`;
      threadSheetList.appendChild(empty);
      return;
    }

    items.forEach((item, idx) => {
      const isEditingThis = editingThreadItemIndex === idx;
      const taskInfo = parseTask(item.text);
      const isTask = !!(item.is_task || taskInfo.isTask);
      const isQ = !!(item.is_question || isQuestionText(item.text));

      const row = document.createElement('div');
      row.className = 'note-row';
      row.dataset.threadIndex = String(idx);
      if (isTask && item.completed) row.classList.add('task-completed');
      if (isEditingThis) row.classList.add('note-editing');

      const rightButtonHtml = isEditingThis
        ? `
          <button class="note-del note-cancel" type="button" aria-label="Скасувати редагування" data-thread-cancel="${idx}">
            <span class="note-del-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 6L6 18"></path>
                <path d="M6 6l12 12"></path>
              </svg>
            </span>
          </button>
        `
        : `
          <button class="note-del" type="button" aria-label="Видалити нотатку з треду" data-thread-del="${idx}">
            <span class="note-del-ico" aria-hidden="true">
              <span class="ico-base">${deleteIconSvg('currentColor')}</span>
              <span class="ico-mask">${deleteIconSvg('white')}</span>
            </span>
          </button>
        `;

      row.innerHTML = `
        <div class="note-time">${fmtTime(item.date)}</div>
        <div class="note-body">
          <div class="note-text"></div>
          ${isQ ? `
            <div class="answer-wrap" data-thread-answer-wrap="${idx}">
              <span class="answer-label">Відповідь:</span>
              <input class="answer-input" type="text" placeholder="Почни вводити..." value="${escAttr(item.answer ?? '')}" readonly data-thread-answer-input="${idx}" />
              <button class="answer-save" type="button" aria-label="Зберегти відповідь" data-thread-answer-save="${idx}">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5"></path>
                </svg>
              </button>
            </div>
          ` : ``}
        </div>
        ${rightButtonHtml}
      `;

      const noteTextEl = row.querySelector('.note-text');

      if (isEditingThis) {
        const ta = document.createElement('textarea');
        ta.className = 'answer-input';
        ta.style.background = '#f9fafb';
        ta.style.border = '1px solid #e5e7eb';
        ta.style.borderRadius = '10px';
        ta.style.padding = '8px 10px';
        ta.style.width = '100%';
        ta.style.minHeight = '42px';
        ta.style.resize = 'vertical';
        ta.value = item.text ?? '';
        noteTextEl.appendChild(ta);

        const finishEdit = async (save) => {
          if (editingThreadItemIndex !== idx) return;
          const nextText = (ta.value ?? '').trim();
          editingThreadItemIndex = null;

          if (!save || !nextText || nextText === (item.text ?? '')) {
            renderThreadSheetFeed(note, payload);
            return;
          }

          const nextTaskInfo = parseTask(nextText);
          const nextIsTask = !!nextTaskInfo.isTask;
          const nextIsQuestion = isQuestionText(nextText);

          const changed = await mutateOpenedThreadPayload((list) => {
            if (!list[idx]) return list;
            list[idx].text = nextText;
            list[idx].is_task = nextIsTask;
            list[idx].is_question = nextIsQuestion;
            if (!nextIsTask) list[idx].completed = false;
            if (!nextIsQuestion) list[idx].answer = null;
            return list;
          });
          if (!changed) return;
          renderCurrentView({ preserveScroll: true });
          renderThreadSheetFeed(changed.note, changed.payload);
        };

        ta.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            finishEdit(true);
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            finishEdit(false);
          }
        });
        ta.addEventListener('blur', () => finishEdit(true));

        requestAnimationFrame(() => {
          ta.focus();
          try { ta.setSelectionRange(ta.value.length, ta.value.length); } catch (_) {}
        });
      } else if (isTask) {
        const wrap = document.createElement('div');
        wrap.className = 'task-line';

        const cb = document.createElement('button');
        cb.className = 'task-check';
        cb.type = 'button';
        cb.setAttribute('role', 'checkbox');
        cb.setAttribute('aria-label', item.completed ? 'Позначити як невиконану' : 'Позначити як виконану');
        cb.setAttribute('aria-checked', item.completed ? 'true' : 'false');
        cb.innerHTML = `
          <svg class="task-check-ico" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20 6L9 17l-5-5"></path>
          </svg>
        `;

        const content = document.createElement('div');
        content.className = 'task-text';
        const src = taskInfo.isTask
          ? taskInfo
          : { displayText: item.text ?? '', highlightIndex: -1, highlightLength: 0 };
        renderTextWithHighlight(content, src.displayText ?? (item.text ?? ''), src.highlightIndex, src.highlightLength);

        wrap.appendChild(cb);
        wrap.appendChild(content);
        noteTextEl.appendChild(wrap);

        cb.addEventListener('click', async (e) => {
          e.preventDefault();
          const next = !item.completed;
          const changed = await mutateOpenedThreadPayload((list) => {
            if (!list[idx]) return list;
            list[idx].completed = next;
            return list;
          });
          if (!changed) return;
          renderCurrentView({ preserveScroll: true });
          renderThreadSheetFeed(changed.note, changed.payload);
        });
      } else {
        noteTextEl.textContent = item.text ?? '';
      }

      row.addEventListener('dblclick', (e) => {
        if (e.target.closest('.note-del, .task-check, .answer-wrap')) return;
        if (editingThreadItemIndex !== null) return;
        editingThreadItemIndex = idx;
        renderThreadSheetFeed(note, payload);
      });

      const cancelBtn = row.querySelector(`[data-thread-cancel="${idx}"]`);
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          editingThreadItemIndex = null;
          renderThreadSheetFeed(note, payload);
        });
      } else {
        const delBtn = row.querySelector(`[data-thread-del="${idx}"]`);
        if (delBtn) {
          attachHoldAction(delBtn, async () => {
            row.classList.add('note-removing');
            if (!reduceMotion) await new Promise((resolve) => window.setTimeout(resolve, 170));
            const changed = await mutateOpenedThreadPayload((list) => {
              list.splice(idx, 1);
              return list;
            });
            if (!changed) {
              row.classList.remove('note-removing');
              return;
            }
            renderCurrentView({ preserveScroll: true });
            renderThreadSheetFeed(changed.note, changed.payload);
          }, HOLD_MS_SINGLE);
        }
      }

      if (isQ) {
        const wrap = row.querySelector(`[data-thread-answer-wrap="${idx}"]`);
        const input = row.querySelector(`[data-thread-answer-input="${idx}"]`);
        const saveBtn = row.querySelector(`[data-thread-answer-save="${idx}"]`);

        let editingAnswer = false;
        let initialValue = (item.answer ?? '').toString();

        const setAnswerEditing = (on) => {
          editingAnswer = on;
          wrap.classList.toggle('is-answer-editing', on);
          input.readOnly = !on;
          if (!on) saveBtn.classList.remove('is-visible');
        };

        const commitIfNeeded = async () => {
          const val = input.value ?? '';
          if (val === initialValue) {
            setAnswerEditing(false);
            return;
          }

          const changed = await mutateOpenedThreadPayload((list) => {
            if (!list[idx]) return list;
            list[idx].answer = val.trim().length ? val.trim() : null;
            return list;
          });
          if (!changed) return;
          initialValue = val;
          setAnswerEditing(false);
          renderCurrentView({ preserveScroll: true });
          renderThreadSheetFeed(changed.note, changed.payload);
        };

        const enterAnswerEdit = () => {
          if (editingThreadItemIndex !== null) return;
          setAnswerEditing(true);
          input.focus();
          try { input.setSelectionRange(input.value.length, input.value.length); } catch (_) {}
        };

        input.addEventListener('dblclick', (e) => {
          e.preventDefault();
          e.stopPropagation();
          enterAnswerEdit();
        });

        input.addEventListener('pointerdown', (e) => e.stopPropagation());
        input.addEventListener('input', () => {
          if (!editingAnswer) return;
          if (input.value.length >= 1) saveBtn.classList.add('is-visible');
          else saveBtn.classList.remove('is-visible');
        });
        input.addEventListener('keydown', (e) => {
          if (!editingAnswer) return;
          if (e.key === 'Enter') {
            e.preventDefault();
            input.blur();
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            input.value = initialValue;
            setAnswerEditing(false);
          }
        });
        input.addEventListener('blur', async () => {
          if (!editingAnswer) return;
          await commitIfNeeded();
        });
        saveBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!editingAnswer) return;
          await commitIfNeeded();
        });

        setAnswerEditing(false);
      }

      threadSheetList.appendChild(row);
    });
  }

  function openThreadSheet(note, payload) {
    openedThreadNoteId = note.id;
    editingThreadItemIndex = null;
    renderThreadSheetFeed(note, payload);

    // reset thread composer
    if (threadNoteInput) {
      threadNoteInput.value = '';
      threadSendBtn.disabled = true;
    }

    threadSheet.classList.add('is-open');
    threadSheet.setAttribute('aria-hidden', 'false');
    document.body.classList.add('thread-sheet-open');
  }

  async function createThreadFromSelection() {
    const sourceNotes = selectedThreadSourceNotes();
    if (sourceNotes.length < 2) return;

    const selectedIds = new Set(sourceNotes.map((note) => note.id));
    const selectedRows = Array.from(notesContainer.querySelectorAll('.note-row'))
      .filter((row) => selectedIds.has(row.getAttribute('data-note-id')));

    selectedRows.forEach((row) => row.classList.add('thread-merging'));
    if (!reduceMotion) {
      await new Promise((resolve) => window.setTimeout(resolve, 360));
    }

    const payload = {
      version: 1,
      created_at: new Date().toISOString(),
      items: sourceNotes.map((n) => ({
        id: n.id,
        text: n.text ?? '',
        date: n.date,
        is_task: !!n.is_task,
        completed: !!n.completed,
        is_question: !!n.is_question,
        answer: n.answer ?? null
      }))
    };

    const { data, error } = await sb
      .from('notes')
      .insert({
        user_id: user.id,
        text: `${THREAD_MARKER}${Date.now()}`,
        date: new Date().toISOString(),
        is_task: false,
        completed: false,
        is_question: false,
        answer: JSON.stringify(payload)
      })
      .select('id')
      .single();

    if (error) {
      selectedRows.forEach((row) => row.classList.remove('thread-merging'));
      alert('Не вдалось створити тред: ' + error.message);
      return;
    }

    const sourceIds = sourceNotes.map((n) => n.id);
    if (sourceIds.length) {
      const { error: deleteErr } = await sb
        .from('notes')
        .delete()
        .in('id', sourceIds)
        .eq('user_id', user.id);

      if (deleteErr) {
        alert('Тред створено, але не вдалось прибрати вихідні нотатки: ' + deleteErr.message);
      }
    }

    lastInsertedId = data?.id ?? null;
    exitMultiSelectMode();
    await loadNotes();
  }

  // ==========
  // RENDER
  // ==========
  async function toggleTaskCompleted(noteId, nextCompleted) {
    const { error } = await sb
      .from('notes')
      .update({ completed: nextCompleted })
      .eq('id', noteId)
      .eq('user_id', user.id);

    if (error) {
      alert('Не вдалось оновити задачу: ' + error.message);
      return false;
    }
    return true;
  }

  async function saveAnswer(noteId, value) {
    const v = (value ?? '').toString().trim();
    const payload = { answer: v.length ? v : null };

    const { error } = await sb
      .from('notes')
      .update(payload)
      .eq('id', noteId)
      .eq('user_id', user.id);

    if (error) {
      alert('Не вдалось зберегти відповідь: ' + error.message);
      return false;
    }

    // update local cache
    const idx = currentNotes.findIndex(n => n.id === noteId);
    if (idx >= 0) currentNotes[idx].answer = payload.answer;

    return true;
  }

  function renderOrganizedFolders() {
    notesContainer.innerHTML = '';

    const stats = {
      task: 0,
      question: 0,
      thread: 0,
      note: 0
    };

    for (const note of currentNotes) {
      const type = noteTypeOf(note);
      stats[type] = (stats[type] || 0) + 1;
    }

    const types = ['task', 'question', 'thread', 'note'].filter((type) => stats[type] > 0);
    if (!types.length) {
      notesContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-text">Папок поки немає.</div>
          <div class="empty-hint">Додай нотатки, щоб вони зʼявились у впорядкованому режимі.</div>
        </div>
      `;
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'folder-mode';

    types.forEach((type, idx) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `folder-card type-${type}`;
      card.style.transitionDelay = `${idx * 45}ms`;
      card.innerHTML = `
        <div class="folder-title">${folderLabel(type)}</div>
        <div class="folder-count">${stats[type]}</div>
      `;
      card.addEventListener('click', () => {
        activeFolderType = type;
        renderCurrentView();
      });
      grid.appendChild(card);
    });

    notesContainer.appendChild(grid);
    requestAnimationFrame(() => grid.classList.add('is-animated'));
  }

  function renderFolderFeed() {
    const typed = currentNotes
      .filter((note) => noteTypeOf(note) === activeFolderType)
      .slice()
      .sort((a, b) => {
        const ka = sortableDateKey(a.date);
        const kb = sortableDateKey(b.date);
        if (ka !== kb) return ka.localeCompare(kb);
        return String(a.id).localeCompare(String(b.id));
      });

    notesContainer.innerHTML = `
      <div class="folder-feed-head">
        <button type="button" class="folder-back" id="folderBackBtn">Назад</button>
      </div>
      <div class="folder-feed-title">${folderLabel(activeFolderType)}</div>
      <div id="folderFeedList"></div>
    `;

    document.getElementById('folderBackBtn')?.addEventListener('click', () => {
      activeFolderType = null;
      renderCurrentView({ preserveScroll: false });
    });

    const listEl = document.getElementById('folderFeedList');
    renderNotes(typed, {
      preserveScroll: false,
      allowMultiSelect: false,
      mountEl: listEl,
      scrollToBottom: false,
      sortByDateAsc: true,
      scrollEl: notesContainer
    });
  }

  function renderCurrentView({ preserveScroll = false } = {}) {
    if (viewMode === 'organized') {
      if (!activeFolderType) renderOrganizedFolders();
      else renderFolderFeed();
      updateMultiActionState();
      return;
    }

    renderNotes(currentNotes, { preserveScroll, allowMultiSelect: true, mountEl: notesContainer });
  }

  function renderNotes(
    notes,
    {
      preserveScroll = false,
      allowMultiSelect = true,
      mountEl = notesContainer,
      scrollEl = mountEl,
      scrollToBottom = true,
      sortByDateAsc = false
    } = {}
  ) {
    const prevScrollTop = scrollEl.scrollTop;
    const canUseMulti = allowMultiSelect && viewMode === 'feed' && !activeFolderType;
    const displayNotes = sortByDateAsc
      ? notes.slice().sort((a, b) => {
          const ka = sortableDateKey(a.date);
          const kb = sortableDateKey(b.date);
          if (ka !== kb) return ka.localeCompare(kb);
          return String(a.id).localeCompare(String(b.id));
        })
      : notes;

    const existingIds = new Set(displayNotes.map((note) => note.id));
    if (openedThreadNoteId && !existingIds.has(openedThreadNoteId)) {
      closeThreadSheet();
    }
    for (const id of Array.from(selectedNoteIds)) {
      if (!existingIds.has(id)) selectedNoteIds.delete(id);
    }
    if (multiSelectMode && selectedNoteIds.size === 0) {
      multiSelectMode = false;
    }
    updateMultiActionState();

    mountEl.innerHTML = '';

    // prepare review banner (only in main feed view)
    const reviewBannerEl = (mountEl === notesContainer && viewMode === 'feed')
      ? renderReviewBanner()
      : null;
    let reviewBannerInserted = false;

    if (!displayNotes.length) {
      // no notes — still show review banner if exists
      if (reviewBannerEl) {
        mountEl.appendChild(reviewBannerEl);
      } else {
        mountEl.innerHTML = `
          <div class="empty-state">
            <div class="empty-text">Поки що нотаток немає.</div>
            <div class="empty-hint">Напиши першу нотатку нижче.</div>
          </div>
        `;
      }
      return;
    }

    let prevDay = null;
    const today = todayKey();

    displayNotes.forEach((n) => {
      const curDay = dayKey(n.date);

      if (curDay !== prevDay) {
        const sep = document.createElement('div');
        sep.className = 'day-sep';
        sep.innerHTML = `
          <div class="day-sep-line"></div>
          <div class="day-sep-label">${fmtDay(n.date)}</div>
          <div class="day-sep-line"></div>
        `;
        mountEl.appendChild(sep);

        // insert review banner right after today's day separator
        if (!reviewBannerInserted && reviewBannerEl && curDay === today) {
          mountEl.appendChild(reviewBannerEl);
          reviewBannerInserted = true;
        }

        prevDay = curDay;
      }

      const row = document.createElement('div');
      row.className = 'note-row';
      row.setAttribute('data-note-id', n.id);
      if (canUseMulti && multiSelectMode) row.classList.add('multi-mode');
      if (canUseMulti && selectedNoteIds.has(n.id)) row.classList.add('note-selected');

      const isEditingThis = editingNoteId && n.id === editingNoteId;
      if (isEditingThis) row.classList.add('note-editing');

      // animate-in for just sent
      if (lastInsertedId && n.id === lastInsertedId) row.classList.add('note-enter');

      const threadPayload = parseThreadPayload(n);
      const isThread = !!threadPayload;

      // task detection + completed
      const taskInfo = parseTask(n.text);
      const isTask = !isThread && !!(n.is_task || taskInfo.isTask);
      const completed = !!n.completed;

      if (isTask) row.classList.add('has-task');
      if (isTask && completed) row.classList.add('task-completed');

      // question detection
      const isQ = !isThread && !!(n.is_question || isQuestionText(n.text));
      if (isQ) row.classList.add('has-question');

      const rightButtonHtml = isEditingThis
        ? `
          <button class="note-del note-cancel" type="button" aria-label="Закрити редагування" data-cancel="${n.id}">
            <span class="note-del-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 6L6 18"></path>
                <path d="M6 6l12 12"></path>
              </svg>
            </span>
          </button>
        `
        : `
          <button class="note-del" type="button" aria-label="Видалити нотатку" data-del="${n.id}">
            <span class="note-del-ico" aria-hidden="true">
              <!-- base icon (gray) -->
              <svg class="ico-base" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18"></path>
                <path d="M8 6V4h8v2"></path>
                <path d="M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14"></path>
                <path d="M10 10v8"></path>
                <path d="M14 10v8"></path>
              </svg>

              <!-- masked icon (white, clipped by progress) -->
              <svg class="ico-mask" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18"></path>
                <path d="M8 6V4h8v2"></path>
                <path d="M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14"></path>
                <path d="M10 10v8"></path>
                <path d="M14 10v8"></path>
              </svg>
            </span>
          </button>
        `;

      row.innerHTML = `
        ${canUseMulti ? `
          <div class="multi-check-col">
            <button class="multi-check" type="button" aria-label="Вибрати нотатку" aria-checked="${selectedNoteIds.has(n.id) ? 'true' : 'false'}" data-multi="${n.id}">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </button>
          </div>
        ` : ``}
        <div class="note-time">${fmtTime(n.date)}</div>

        <div class="note-body">
          <div class="note-text"></div>
          ${isQ ? `
            <div class="answer-wrap ${lastInsertedId && n.id === lastInsertedId ? 'answer-enter' : ''}" data-answer-wrap="${n.id}">
              <span class="answer-label">Відповідь:</span>
              <input class="answer-input" type="text" placeholder="Почни вводити..." value="${(n.answer ?? '').replace(/"/g, '&quot;')}" readonly data-answer-input="${n.id}" />
              <button class="answer-save" type="button" aria-label="Зберегти відповідь" data-answer-save="${n.id}">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5"></path>
                </svg>
              </button>
            </div>
          ` : ``}
        </div>

        ${rightButtonHtml}
      `;

      const noteTextEl = row.querySelector('.note-text');
      const multiCheckBtn = row.querySelector(`[data-multi="${n.id}"]`);
      if (multiCheckBtn) {
        multiCheckBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleSelectedNote(n.id, { setAnchor: true });
        });
      }

      if (isThread) {
        row.classList.add('is-thread-note');
        const items = safeThreadItems(threadPayload);
        const threadTitle = threadPayload.title || '';
        const lastText = (items[items.length - 1]?.text || '').replace(/\s+/g, ' ').trim();

        const stack = document.createElement('div');
        stack.className = 'thread-stack';
        stack.setAttribute('data-thread-id', n.id);

        const topCard = document.createElement('div');
        topCard.className = 'thread-card';
        topCard.setAttribute('data-thread-open', n.id);

        const countPill = document.createElement('div');
        countPill.className = 'thread-count-pill';
        countPill.textContent = `${items.length}`;

        const previewEl = document.createElement('div');
        previewEl.className = 'thread-preview';
        if (threadTitle) {
          previewEl.classList.add('has-title');
          previewEl.textContent = threadTitle;
        } else {
          previewEl.textContent = lastText || 'Відкрий тред, щоб подивитись повідомлення';
        }

        topCard.appendChild(previewEl);
        topCard.appendChild(countPill);

        const backCard1 = document.createElement('div');
        backCard1.className = 'thread-card';
        const backCard2 = document.createElement('div');
        backCard2.className = 'thread-card';

        stack.appendChild(topCard);
        stack.appendChild(backCard1);
        stack.appendChild(backCard2);
        noteTextEl.appendChild(stack);
      } else if (isTask) {
        const wrap = document.createElement('div');
        wrap.className = 'task-line';

        const cb = document.createElement('button');
        cb.className = 'task-check';
        cb.type = 'button';
        cb.setAttribute('role', 'checkbox');
        cb.setAttribute('aria-label', completed ? 'Позначити як невиконану' : 'Позначити як виконану');
        cb.setAttribute('aria-checked', completed ? 'true' : 'false');
        cb.dataset.taskId = n.id;

        cb.innerHTML = `
          <svg class="task-check-ico" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20 6L9 17l-5-5"></path>
          </svg>
        `;

        const content = document.createElement('div');
        content.className = 'task-text';

        const src = taskInfo.isTask
          ? taskInfo
          : { displayText: n.text ?? '', highlightIndex: -1, highlightLength: 0 };

        renderTextWithHighlight(content, src.displayText ?? (n.text ?? ''), src.highlightIndex, src.highlightLength);

        wrap.appendChild(cb);
        wrap.appendChild(content);
        noteTextEl.appendChild(wrap);

        cb.addEventListener('click', async (e) => {
          e.preventDefault();

          const prev = !!n.completed;
          const next = !prev;

          // optimistic UI
          n.completed = next;
          row.classList.toggle('task-completed', next);
          cb.setAttribute('aria-checked', next ? 'true' : 'false');
          cb.setAttribute('aria-label', next ? 'Позначити як невиконану' : 'Позначити як виконану');

          const ok = await toggleTaskCompleted(n.id, next);
          if (!ok) {
            // rollback
            n.completed = prev;
            row.classList.toggle('task-completed', prev);
            cb.setAttribute('aria-checked', prev ? 'true' : 'false');
            cb.setAttribute('aria-label', prev ? 'Позначити як невиконану' : 'Позначити як виконану');
          }
        });
      } else {
        noteTextEl.textContent = n.text ?? '';
      }

      // Enter edit on dblclick / double-tap (note text area)
      const onEnterEdit = () => {
        if (isThread) return;
        if (multiSelectMode) return;
        if (editingNoteId && editingNoteId !== n.id) return;
        enterEdit(n);
      };

      row.addEventListener('click', (e) => {
        if (isRowActionTarget(e.target)) return;

        const withMeta = e.metaKey || e.ctrlKey;
        const withShift = e.shiftKey;

        if (canUseMulti && withMeta) {
          e.preventDefault();
          toggleSelectedNote(n.id, { setAnchor: true });
          return;
        }

        if (canUseMulti && withShift) {
          e.preventDefault();
          selectRangeTo(n.id);
          return;
        }

        if (isThread && !multiSelectMode) {
          e.preventDefault();
          openThreadSheet(n, threadPayload);
          return;
        }

        if (canUseMulti && multiSelectMode) {
          e.preventDefault();
          toggleSelectedNote(n.id, { setAnchor: true });
        }
      });

      row.addEventListener('dblclick', (e) => {
        if (isRowActionTarget(e.target)) return;
        onEnterEdit();
      });

      attachDoubleTap(row, () => onEnterEdit());
      if (canUseMulti) {
        attachLongPress(row, (e) => {
          if (isRowActionTarget(e.target)) return;
          if (multiSelectMode && selectedNoteIds.has(n.id)) return;
          toggleSelectedNote(n.id, { setAnchor: true });
        });
      }

      // Answer logic (question)
      if (isQ) {
        const wrap = row.querySelector(`[data-answer-wrap="${n.id}"]`);
        const input = row.querySelector(`[data-answer-input="${n.id}"]`);
        const saveBtn = row.querySelector(`[data-answer-save="${n.id}"]`);

        // subtle appear animation
        if (wrap && wrap.classList.contains('answer-enter')) {
          requestAnimationFrame(() => wrap.classList.add('answer-enter-active'));
        }

        let editingAnswer = false;
        let initialValue = (n.answer ?? '').toString();

        const setAnswerEditing = (on) => {
          editingAnswer = on;
          wrap.classList.toggle('is-answer-editing', on);
          input.readOnly = !on;
          if (!on) {
            saveBtn.classList.remove('is-visible');
          }
        };

        const commitIfNeeded = async () => {
          const val = input.value ?? '';
          const changed = val !== initialValue;

          // show save only after at least 1 char typed OR any change
          if (!changed) {
            setAnswerEditing(false);
            noteInput.focus();
            return;
          }

          const ok = await saveAnswer(n.id, val);
          if (ok) {
            initialValue = (val ?? '').toString();
            setAnswerEditing(false);
            noteInput.focus();
          }
        };

        // enter edit on dblclick/double tap
        const enterAnswerEdit = () => {
          if (editingNoteId) return;
          setAnswerEditing(true);
          input.focus();
          try { input.setSelectionRange(input.value.length, input.value.length); } catch (_) {}
        };

        input.addEventListener('dblclick', (e) => {
          e.preventDefault();
          e.stopPropagation();
          enterAnswerEdit();
        });
        attachDoubleTap(input, () => enterAnswerEdit());

        input.addEventListener('pointerdown', (e) => {
          // stop bubbling so note edit won't trigger
          e.stopPropagation();
        });

        input.addEventListener('input', () => {
          if (!editingAnswer) return;
          // “надрукував хоча б один символ” -> показуємо галочку
          if (input.value.length >= 1) {
            saveBtn.classList.add('is-visible');
          } else {
            // якщо повністю стер — все одно може бути зміна, але за умовою “1 символ” для появи
            // залишимо логіку буквальну
            saveBtn.classList.remove('is-visible');
          }
        });

        input.addEventListener('keydown', (e) => {
          if (!editingAnswer) return;
          if (e.key === 'Enter') {
            e.preventDefault();
            input.blur(); // blur -> commit
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            // cancel edits (restore)
            input.value = initialValue;
            setAnswerEditing(false);
            noteInput.focus();
          }
        });

        input.addEventListener('blur', async () => {
          if (!editingAnswer) return;
          await commitIfNeeded();
        });

        saveBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!editingAnswer) return;
          await commitIfNeeded();
        });

        // default: read-only
        setAnswerEditing(false);
      }

      // Right button actions (note)
      const cancelBtn = row.querySelector('[data-cancel]');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => exitEdit({ restoreInput: true }));
      } else {
        const delBtn = row.querySelector('[data-del]');
        attachHoldToDelete(delBtn, row, n.id, mountEl);
      }

      mountEl.appendChild(row);

      if (row.classList.contains('note-enter')) {
        requestAnimationFrame(() => row.classList.add('note-enter-active'));
      }
    });

    // fallback: if no notes for today, append banner at the end (feed is ascending)
    if (reviewBannerEl && !reviewBannerInserted) {
      // add today's day separator if it wasn't created by the loop
      if (prevDay !== today) {
        const sep = document.createElement('div');
        sep.className = 'day-sep';
        sep.innerHTML = `
          <div class="day-sep-line"></div>
          <div class="day-sep-label">${fmtDay(new Date().toISOString())}</div>
          <div class="day-sep-line"></div>
        `;
        mountEl.appendChild(sep);
      }
      mountEl.appendChild(reviewBannerEl);
    }

    if (preserveScroll) {
      scrollEl.scrollTop = prevScrollTop;
    } else {
      scrollEl.scrollTop = scrollToBottom ? scrollEl.scrollHeight : 0;
    }
  }

  // ==========
  // LOAD
  // ==========
  async function loadNotes() {
    const { data, error } = await sb
      .from('notes')
      .select('id, text, date, is_task, completed, is_question, answer')
      .eq('user_id', user.id)
      .order('date', { ascending: true });

    if (error) {
      notesContainer.innerHTML = `<div class="text-sm text-red-600">Помилка завантаження: ${error.message}</div>`;
      return;
    }

    const rawNotes = data || [];
    const hiddenIds = collectThreadMemberIds(rawNotes);
    currentNotes = rawNotes.filter((note) => {
      if (isThreadNote(note)) return true;
      return !hiddenIds.has(String(note.id));
    });
    renderCurrentView();
    lastInsertedId = null;

    if (editingNoteId && !currentNotes.some(n => n.id === editingNoteId)) {
      exitEdit({ restoreInput: true });
    }
  }

  // ==================
  // CREATE / UPDATE (note)
  // ==================
  async function submitNote() {
    const text = noteInput.value.trim();
    if (!text) return;

    sendButton.disabled = true;
    noteInput.disabled = true;

    const taskInfo = parseTask(text);
    const nextIsTask = !!taskInfo.isTask;

    const nextIsQuestion = isQuestionText(text);

    // update existing (edit mode)
    if (editingNoteId) {
      const noteId = editingNoteId;

      const patch = {
        text,
        is_task: nextIsTask,
        is_question: nextIsQuestion
      };

      // if it stopped being a task — reset completed
      if (!nextIsTask) patch.completed = false;

      // if it stopped being a question — clear answer
      if (!nextIsQuestion) patch.answer = null;

      const { error } = await sb
        .from('notes')
        .update(patch)
        .eq('id', noteId)
        .eq('user_id', user.id);

      noteInput.disabled = false;
      noteInput.focus();

      if (error) {
        alert('Помилка збереження: ' + error.message);
        sendButton.disabled = false;
        return;
      }

      exitEdit({ restoreInput: true });
      await loadNotes();
      return;
    }

    // insert new
    const { data, error } = await sb
      .from('notes')
      .insert({
        user_id: user.id,
        text,
        date: new Date().toISOString(),
        is_task: nextIsTask,
        completed: false,
        is_question: nextIsQuestion,
        answer: null
      })
      .select('id')
      .single();

    noteInput.disabled = false;
    sendButton.disabled = true;
    noteInput.value = '';
    noteInput.style.height = 'auto';
    noteInput.focus();
    syncComposerOffset();

    if (error) {
      alert('Помилка збереження: ' + error.message);
      return;
    }

    lastInsertedId = data?.id ?? null;
    await loadNotes();

    const streak = computeStreak(currentNotes);
    updateStreakBadge(streak);
    checkStreakCelebration(streak);
  }

  // ==========
  // INPUT UX
  // ==========
  noteInput.addEventListener('input', () => {
    sendButton.disabled = noteInput.value.trim().length === 0;

    // autosize textarea
    noteInput.style.height = 'auto';
    noteInput.style.height = Math.min(noteInput.scrollHeight, 120) + 'px';
    syncComposerOffset();
  });

  noteInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitNote();
    }
  });

  noteInput.addEventListener('focus', () => {
    if (multiSelectMode) exitMultiSelectMode();
  });

  sendButton.addEventListener('click', submitNote);

  // ==========
  // LOGOUT
  // ==========
  multiThreadBtn.addEventListener('click', async () => {
    if (!multiSelectMode || selectedNoteIds.size < 2) return;
    await createThreadFromSelection();
  });

  attachHoldAction(multiDeleteBtn, async () => {
    if (!multiSelectMode || selectedNoteIds.size === 0) return;
    await deleteSelectedNotes();
  });

  viewFeedBtn?.addEventListener('click', () => setViewMode('feed'));
  viewOrganizedBtn?.addEventListener('click', () => setViewMode('organized'));
  viewPlanningBtn?.addEventListener('click', () => {
    alert('Планування додамо в наступному оновленні.');
  });
  viewModeToggle?.addEventListener('click', (e) => {
    const targetBtn = e.target.closest('[data-view-mode]');
    if (!targetBtn) return;
    if (targetBtn.dataset.viewMode === 'planning') {
      alert('Планування додамо в наступному оновленні.');
      return;
    }
    setViewMode(targetBtn.dataset.viewMode);
  });

  threadSheetOverlay.addEventListener('click', closeThreadSheet);
  threadSheetClose.addEventListener('click', closeThreadSheet);

  // thread composer
  threadNoteInput?.addEventListener('input', () => {
    threadSendBtn.disabled = threadNoteInput.value.trim().length === 0;
  });

  threadNoteInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitThreadNote();
    }
  });

  threadSendBtn?.addEventListener('click', submitThreadNote);

  async function submitThreadNote() {
    const text = threadNoteInput.value.trim();
    if (!text || !openedThreadNoteId) return;

    threadNoteInput.disabled = true;
    threadSendBtn.disabled = true;

    const taskInfo = parseTask(text);

    const result = await mutateOpenedThreadPayload((items) => {
      items.push({
        id: null,
        text,
        date: new Date().toISOString(),
        is_task: !!taskInfo.isTask,
        completed: false,
        is_question: isQuestionText(text),
        answer: null
      });
      return items;
    });

    threadNoteInput.disabled = false;
    threadNoteInput.value = '';
    threadSendBtn.disabled = true;
    threadNoteInput.focus();

    if (result) {
      renderThreadSheetFeed(result.note, result.payload);
      // scroll to bottom of thread list
      threadSheetList.scrollTop = threadSheetList.scrollHeight;
    }
  }

  window.addEventListener('resize', syncComposerOffset, { passive: true });

  logoutBtn.addEventListener('click', async () => {
    await sb.auth.signOut();
    window.location.href = '/login.html';
  });

  syncComposerOffset();
  updateViewModeUi();
  updateComposerVisibility();
  updateMultiActionState();
  await loadNotes();
  updateStreakBadge(computeStreak(currentNotes));

  // show changelog on first visit after deploy
  if (!isChangelogSeen()) {
    setTimeout(() => openChangelog(), 600);
  }
})();
