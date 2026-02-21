// assets/js/welcome.js
// 3-phase onboarding: Notebook → Mini demo feed → Welcome
(async function initWelcome() {
  'use strict';

  const sb = window.supabaseClient;

  // Auth check
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    window.location.href = '/landing.html';
    return;
  }

  // Already onboarded? Skip
  const ONBOARDED_KEY = 'dumka_onboarded';
  if (localStorage.getItem(ONBOARDED_KEY)) {
    window.location.href = '/';
    return;
  }

  // ─── Elements ───
  const phaseNotebook = document.getElementById('phase-notebook');
  const phaseOnboarding = document.getElementById('phase-onboarding');
  const phaseWelcome = document.getElementById('phase-welcome');

  const notebook = document.getElementById('notebook');
  const notebookScene = document.querySelector('.notebook-scene');
  const nbCover = document.getElementById('nb-cover');
  const nbStickers = document.getElementById('nb-stickers');
  const btnNotebookDone = document.getElementById('btn-notebook-done');
  const stickerCursor = document.getElementById('sticker-cursor');

  // Onboarding elements
  const demoApp = document.getElementById('demo-app');
  const demoFeed = document.getElementById('demo-feed');
  const demoInput = document.getElementById('demo-input');
  const demoSend = document.getElementById('demo-send');
  const demoActionBar = document.getElementById('demo-action-bar');
  const demoActionCount = document.getElementById('demo-action-count');
  const demoActionThread = document.getElementById('demo-action-thread');

  const obInstruction = document.getElementById('ob-instruction');
  const obStepBadge = document.getElementById('ob-step-badge');
  const obStepTitle = document.getElementById('ob-step-title');
  const obStepDesc = document.getElementById('ob-step-desc');
  const obResult = document.getElementById('ob-result');
  const obSkip = document.getElementById('ob-skip');
  let autoAdvanceTimer = null;

  // ─── Phase transitions ───
  function showPhase(phase) {
    [phaseNotebook, phaseOnboarding, phaseWelcome].forEach(p =>
      p.classList.remove('active')
    );
    setTimeout(() => phase.classList.add('active'), 50);
  }

  // ═══════════════════════════════════════
  // PHASE 1: NOTEBOOK + STICKER CURSOR
  // ═══════════════════════════════════════

  let activeSticker = null;
  let stickerCount = 0;

  document.querySelectorAll('.sticker-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (btn.classList.contains('used')) return;

      if (activeSticker && activeSticker.btn === btn) {
        deselectSticker();
        return;
      }

      if (activeSticker) activeSticker.btn.classList.remove('active');

      btn.classList.add('active');
      const svgHTML = btn.querySelector('svg').outerHTML;
      activeSticker = { btn, svgHTML };

      stickerCursor.innerHTML = svgHTML;
      const svg = stickerCursor.querySelector('svg');
      if (svg) { svg.setAttribute('width', '42'); svg.setAttribute('height', '42'); }
      stickerCursor.classList.add('visible');
      document.body.classList.add('sticker-mode');
    });
  });

  function deselectSticker() {
    if (activeSticker) activeSticker.btn.classList.remove('active');
    activeSticker = null;
    stickerCursor.classList.remove('visible');
    document.body.classList.remove('sticker-mode');
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && activeSticker) deselectSticker();
  });

  document.addEventListener('pointermove', (e) => {
    if (activeSticker) {
      stickerCursor.style.left = e.clientX + 'px';
      stickerCursor.style.top = e.clientY + 'px';
    }
  });

  nbCover.addEventListener('click', (e) => {
    if (!activeSticker || stickerCount >= 5) return;
    // Use cover rect for click position, then convert to sticker area coords
    const coverRect = nbCover.getBoundingClientRect();
    const stickerRect = nbStickers.getBoundingClientRect();
    const cx = Math.max(10, Math.min(e.clientX - stickerRect.left, stickerRect.width - 10));
    const cy = Math.max(10, Math.min(e.clientY - stickerRect.top, stickerRect.height - 10));
    const rot = (Math.random() - 0.5) * 24;

    const sticker = document.createElement('div');
    sticker.className = 'nb-sticker';
    sticker.style.left = cx + 'px';
    sticker.style.top = cy + 'px';
    sticker.style.setProperty('--rot', rot + 'deg');
    sticker.innerHTML = activeSticker.svgHTML;
    const svg = sticker.querySelector('svg');
    if (svg) { svg.setAttribute('width', '42'); svg.setAttribute('height', '42'); }
    nbStickers.appendChild(sticker);

    activeSticker.btn.classList.add('used');
    activeSticker.btn.classList.remove('active');
    stickerCount++;
    deselectSticker();
  });

  document.addEventListener('click', (e) => {
    if (!activeSticker) return;
    if (e.target.closest('.sticker-btn') || e.target.closest('.nb-cover')) return;
    deselectSticker();
  });

  // Stop pulse animation once user types
  const nbTitleInput = document.getElementById('nb-title');
  nbTitleInput.addEventListener('input', () => {
    if (nbTitleInput.value.trim()) {
      nbTitleInput.classList.add('has-value');
    } else {
      nbTitleInput.classList.remove('has-value');
    }
  });

  btnNotebookDone.addEventListener('click', () => {
    const userName = document.getElementById('nb-title').value.trim();
    localStorage.setItem('dumka_notebook_name', userName || '');

    // Prepare journal inscription on the pages
    const journalTextEl = document.getElementById('nb-journal-text');
    const line = userName
      ? `Now this is your journal,\n${userName}`
      : 'Now this is your journal';
    journalTextEl.innerHTML = `<span>${line}</span>`;

    // 1. Open the cover (1s) — hide tray + button immediately
    notebookScene.classList.add('is-opening');
    notebook.classList.add('is-opening');

    // 2. After cover is fully open — show inscription on pages
    setTimeout(() => {
      journalTextEl.classList.add('is-visible');
    }, 1050);

    // 3. Pause a beat so user reads it, then fade notebook out
    setTimeout(() => {
      notebook.classList.add('is-fading');
    }, 2200);

    // 4. Switch to onboarding phase
    setTimeout(() => {
      showPhase(phaseOnboarding);
      initOnboarding();
    }, 2800);
  });

  // ═══════════════════════════════════════
  // PHASE 2: MINI DEMO FEED
  // Mirrors real product logic & UI 1-to-1
  // ═══════════════════════════════════════

  // ─── Product logic (exact copy from app.js) ───
  function parseTask(rawText) {
    const text = (rawText ?? '').toString();
    const bracketRe = /^\s*\[\s*\]\s*/;
    if (bracketRe.test(text)) {
      return { isTask: true, displayText: text.replace(bracketRe, '').trim() };
    }
    const kwRe = /(^|[^\p{L}])(task|todo|задача|завдання|зробити)(:)?(?=[^\p{L}]|$)/iu;
    if (kwRe.test(text)) {
      return { isTask: true, displayText: text };
    }
    return { isTask: false, displayText: text };
  }

  function isQuestionText(text) {
    return (text ?? '').includes('?');
  }

  function fmtTime() {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  // ─── Demo state ───
  const demoNotes = []; // { id, text, displayText, isTask, isQuestion, isThread, threadItems, time }
  let currentObStep = 0;
  let multiSelectMode = false;
  const selectedIds = new Set();
  let noteIdCounter = 0;
  let lastInsertedId = null;

  const STEPS = [
    {
      badge: '1 / 3',
      title: 'Create a task',
      desc: 'Start your note with <strong>[]</strong> to make it a task.<br/>Try typing: <em>[] Buy groceries</em>',
      validate: () => demoNotes.some(n => n.isTask && !n.isThread),
      result: '✓ Task created!'
    },
    {
      badge: '2 / 3',
      title: 'Create a question',
      desc: 'Any note with a <strong>?</strong> becomes a question.<br/>Try: <em>What to cook for dinner?</em>',
      validate: () => demoNotes.some(n => n.isQuestion && !n.isThread),
      result: '✓ Question created!'
    },
    {
      badge: '3 / 3',
      title: 'Create a thread',
      desc: 'Hold <strong>⌘</strong> or <strong>Shift</strong> and tap notes to select them, then press <strong>Create thread</strong>.',
      validate: () => demoNotes.some(n => n.isThread),
      result: '✓ Thread created!'
    }
  ];

  function initOnboarding() {
    currentObStep = 0;
    showObStep(0);
    demoInput.focus();
  }

  function showObStep(idx) {
    const step = STEPS[idx];
    obStepBadge.textContent = step.badge;
    obStepTitle.textContent = step.title;
    obStepDesc.innerHTML = step.desc;
    obResult.classList.remove('show');
    obResult.textContent = '';
    clearTimeout(autoAdvanceTimer);

    // Step 3: enable multi-select mode, disable composer
    if (idx === 2) {
      enableMultiSelect();
      demoInput.disabled = true;
      demoSend.disabled = true;
      demoInput.placeholder = 'Select notes above...';
    } else {
      disableMultiSelect();
      demoInput.disabled = false;
      demoSend.disabled = true;
      demoInput.value = '';
      demoInput.placeholder = "What's new?";
      demoInput.focus();
    }
  }

  function completeCurrentStep() {
    const step = STEPS[currentObStep];
    obResult.textContent = step.result;
    obResult.classList.add('show');

    // Auto-advance to next step after 1.5s
    autoAdvanceTimer = setTimeout(() => {
      if (currentObStep < STEPS.length - 1) {
        currentObStep++;
        showObStep(currentObStep);
        renderFeed();
      } else {
        goToWelcome();
      }
    }, 1500);
  }

  // ─── Render feed (mirrors renderNotes from app.js) ───
  function renderFeed() {
    // Batch DOM writes in rAF to avoid layout thrashing / visible jumps
    requestAnimationFrame(() => {
    demoFeed.innerHTML = '';

    demoNotes.forEach(n => {
      const row = document.createElement('div');
      row.className = 'demo-note-row';
      row.setAttribute('data-id', n.id);
      if (selectedIds.has(n.id)) row.classList.add('note-selected');
      if (n.isThread) row.classList.add('is-thread-note');

      // ── Multi-check (matches .multi-check-col + .multi-check) ──
      const multiCol = document.createElement('div');
      multiCol.className = 'demo-multi-check-col';
      const multiBtn = document.createElement('button');
      multiBtn.className = 'demo-multi-check';
      multiBtn.type = 'button';
      multiBtn.setAttribute('aria-label', 'Select note');
      multiBtn.setAttribute('aria-checked', selectedIds.has(n.id) ? 'true' : 'false');
      multiBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>`;
      multiCol.appendChild(multiBtn);
      row.appendChild(multiCol);

      // ── Time (matches .note-time) ──
      const timeEl = document.createElement('div');
      timeEl.className = 'demo-note-time';
      timeEl.textContent = n.time;
      row.appendChild(timeEl);

      // ── Body (matches .note-body > .note-text) ──
      const bodyEl = document.createElement('div');
      bodyEl.className = 'demo-note-body';
      const textEl = document.createElement('div');
      textEl.className = 'demo-note-text';

      if (n.isThread) {
        // ── Thread stack (matches .thread-stack) ──
        const stack = document.createElement('div');
        stack.className = 'demo-thread-stack';

        const topCard = document.createElement('div');
        topCard.className = 'demo-thread-card';

        const preview = document.createElement('div');
        preview.className = 'demo-thread-preview';
        preview.textContent = n.threadItems[0]?.displayText || 'Thread';

        const countPill = document.createElement('div');
        countPill.className = 'demo-thread-count-pill';
        countPill.textContent = String(n.threadItems.length);

        topCard.appendChild(preview);
        topCard.appendChild(countPill);

        const backCard1 = document.createElement('div');
        backCard1.className = 'demo-thread-card';
        const backCard2 = document.createElement('div');
        backCard2.className = 'demo-thread-card';

        stack.appendChild(topCard);
        stack.appendChild(backCard1);
        stack.appendChild(backCard2);
        textEl.appendChild(stack);

      } else if (n.isTask) {
        // ── Task line (matches .task-line + .task-check + .task-text) ──
        const taskLine = document.createElement('div');
        taskLine.className = 'demo-task-line';

        const cb = document.createElement('button');
        cb.className = 'demo-task-check';
        cb.type = 'button';
        cb.setAttribute('role', 'checkbox');
        cb.setAttribute('aria-checked', 'false');
        cb.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>`;

        const taskText = document.createElement('span');
        taskText.className = 'demo-task-text';

        // Highlight first word in red pill — matches real product task-pill
        const words = n.displayText.split(/\s+/);
        if (words.length > 0) {
          const pill = document.createElement('span');
          pill.className = 'demo-task-first-word';
          pill.textContent = words[0];
          taskText.appendChild(pill);
          if (words.length > 1) {
            taskText.appendChild(document.createTextNode(' ' + words.slice(1).join(' ')));
          }
        } else {
          taskText.textContent = n.displayText;
        }

        taskLine.appendChild(cb);
        taskLine.appendChild(taskText);
        textEl.appendChild(taskLine);

      } else if (n.isQuestion) {
        // ── Question with answer wrap ──
        textEl.textContent = n.displayText.replace(/\n/g, ' ');

      } else {
        // ── Plain note ──
        textEl.textContent = n.displayText.replace(/\n/g, ' ');
      }

      bodyEl.appendChild(textEl);

      // Answer wrap for questions (matches .answer-wrap)
      if (n.isQuestion && !n.isThread) {
        const answerWrap = document.createElement('div');
        answerWrap.className = 'demo-answer-wrap';
        const answerLabel = document.createElement('span');
        answerLabel.className = 'demo-answer-label';
        answerLabel.textContent = 'Answer:';
        const answerPlaceholder = document.createElement('span');
        answerPlaceholder.className = 'demo-answer-placeholder';
        answerPlaceholder.textContent = 'Start typing...';
        answerWrap.appendChild(answerLabel);
        answerWrap.appendChild(answerPlaceholder);
        bodyEl.appendChild(answerWrap);
      }

      row.appendChild(bodyEl);

      // ── Click handlers ──
      if (multiSelectMode) {
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => toggleSelect(n.id));
        multiBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleSelect(n.id);
        });
      }

      demoFeed.appendChild(row);
    });

    // Scroll to bottom
    demoFeed.scrollTop = demoFeed.scrollHeight;
    }); // end rAF
  }

  // ─── Composer (auto-resize textarea like real product) ───
  demoInput.addEventListener('input', () => {
    demoSend.disabled = !demoInput.value.trim();
    // Auto-resize
    demoInput.style.height = 'auto';
    demoInput.style.height = Math.min(demoInput.scrollHeight, 72) + 'px';
  });

  demoSend.addEventListener('click', submitNote);

  demoInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (demoInput.value.trim()) submitNote();
    }
  });

  function submitNote() {
    const text = demoInput.value.trim();
    if (!text) return;

    const taskInfo = parseTask(text);
    const isQ = isQuestionText(text);

    const note = {
      id: 'n' + (++noteIdCounter),
      text: text,
      displayText: taskInfo.isTask ? taskInfo.displayText : text,
      isTask: taskInfo.isTask,
      isQuestion: isQ,
      isThread: false,
      threadItems: null,
      time: fmtTime()
    };

    demoNotes.push(note);
    lastInsertedId = note.id;
    demoInput.value = '';
    demoInput.style.height = '';
    demoSend.disabled = true;

    renderFeed();

    // Check if step is completed
    if (STEPS[currentObStep].validate()) {
      completeCurrentStep();
    }
  }

  // ─── Multi-select (step 3) ───
  function enableMultiSelect() {
    multiSelectMode = true;
    selectedIds.clear();
    demoApp.classList.add('multi-mode');
    renderFeed();
  }

  function disableMultiSelect() {
    multiSelectMode = false;
    selectedIds.clear();
    demoApp.classList.remove('multi-mode', 'has-action-bar');
    demoActionBar.classList.remove('visible');
    renderFeed();
  }

  function toggleSelect(id) {
    if (!multiSelectMode) return;
    // Don't allow selecting threads
    const note = demoNotes.find(n => n.id === id);
    if (note && note.isThread) return;

    if (selectedIds.has(id)) {
      selectedIds.delete(id);
    } else {
      selectedIds.add(id);
    }
    updateActionBar();
    renderFeed();
  }

  function updateActionBar() {
    const count = selectedIds.size;
    demoActionCount.textContent = `Selected: ${count}`;
    demoActionThread.disabled = count < 2;

    if (count > 0) {
      demoActionBar.classList.add('visible');
      demoApp.classList.add('has-action-bar');
    } else {
      demoActionBar.classList.remove('visible');
      demoApp.classList.remove('has-action-bar');
    }
  }

  demoActionThread.addEventListener('click', () => {
    if (selectedIds.size < 2) return;

    // Collect selected notes
    const threadItems = demoNotes.filter(n => selectedIds.has(n.id));
    const firstText = threadItems[0]?.displayText || 'Thread';

    // Remove selected from demoNotes
    const idsToRemove = new Set(selectedIds);
    for (let i = demoNotes.length - 1; i >= 0; i--) {
      if (idsToRemove.has(demoNotes[i].id)) {
        demoNotes.splice(i, 1);
      }
    }

    // Add thread note
    const threadNote = {
      id: 'n' + (++noteIdCounter),
      text: firstText,
      displayText: firstText,
      isTask: false,
      isQuestion: false,
      isThread: true,
      threadItems: threadItems,
      time: fmtTime()
    };
    demoNotes.push(threadNote);
    lastInsertedId = threadNote.id;

    selectedIds.clear();
    updateActionBar();
    disableMultiSelect();
    // Re-enable multi mode for step 3
    enableMultiSelect();

    renderFeed();

    // Check completion
    if (STEPS[currentObStep].validate()) {
      disableMultiSelect();
      completeCurrentStep();
    }
  });

  // ─── Navigation ───
  obSkip.addEventListener('click', () => {
    clearTimeout(autoAdvanceTimer);
    goToWelcome();
  });

  // ═══════════════════════════════════════
  // PHASE 3: WELCOME
  // ═══════════════════════════════════════

  function goToWelcome() {
    showPhase(phaseWelcome);
    localStorage.setItem(ONBOARDED_KEY, '1');
    setTimeout(() => {
      window.location.href = '/';
    }, 3000);
  }

})();
