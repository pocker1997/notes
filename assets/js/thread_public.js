// assets/js/thread_public.js
(async function initPublicThread() {
  const sb = window.supabaseClient;

  const params = new URLSearchParams(window.location.search);
  const threadId = params.get('thread');
  const publicKey = params.get('key');

  const threadSheet = document.getElementById('thread-sheet');
  const threadList = document.getElementById('thread-sheet-list');
  const threadTitle = document.getElementById('thread-sheet-title');
  const threadSubtitle = document.getElementById('thread-sheet-subtitle');
  const threadNoteInput = document.getElementById('thread-note-input');
  const threadSendBtn = document.getElementById('thread-send-btn');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let currentNote = null;
  let currentPayload = null;
  let refreshTimer = null;

  function escAttr(v) {
    return (v ?? '').toString().replace(/"/g, '&quot;');
  }

  function parseThreadPayload(note) {
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

  function isQuestionText(rawText) {
    const t = (rawText ?? '').toString();
    return t.includes('?');
  }

  function parseTask(rawText) {
    const text = (rawText ?? '').toString();
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

    const kwRe = /(^|[^\p{L}])(task|todo)(:)?(?=[^\p{L}]|$)/iu;
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

  function fmtTime(iso) {
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  function fmtDay(iso) {
    return new Date(iso).toLocaleDateString('en-US', { day: '2-digit', month: 'long' });
  }

  function dayKey(iso) {
    const raw = (iso ?? '').toString();
    const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '0000-00-00';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function showError(msg) {
    threadList.innerHTML = `<div class="empty-state"><div class="empty-text">${msg}</div></div>`;
  }

  async function mutateThreadPayload(threadNoteId, mutator) {
    const note = currentNote;
    if (!note || String(note.id) !== String(threadNoteId)) return null;

    const payload = parseThreadPayload(note);
    if (!payload) return null;

    const sourceItems = safeThreadItems(payload);
    const nextItems = mutator(sourceItems.map((item) => ({ ...item })));
    if (!Array.isArray(nextItems)) return null;

    const nextPayload = { ...payload, items: nextItems };
    const serialized = JSON.stringify(nextPayload);

    const { error } = await sb
      .from('notes')
      .update({ answer: serialized })
      .eq('id', threadNoteId);

    if (error) {
      alert('Failed to update thread. Public update policy might be missing: ' + error.message);
      return null;
    }

    currentNote.answer = serialized;
    currentPayload = nextPayload;
    return { note: currentNote, payload: nextPayload };
  }

  function renderThread(note, payload) {
    const items = safeThreadItems(payload);
    threadTitle.textContent = payload.title || 'Thread';
    const msgWord = items.length === 1 ? 'message' : 'messages';
    threadSubtitle.textContent = `${items.length} ${msgWord}`;

    threadList.innerHTML = '';
    if (!items.length) {
      threadList.innerHTML = `<div class="empty-state"><div class="empty-text">Thread is empty.</div></div>`;
      return;
    }

    let prevDay = null;
    items.forEach((item, idx) => {
      const currentDay = dayKey(item.date);
      if (currentDay !== prevDay) {
        const sep = document.createElement('div');
        sep.className = 'day-sep';
        sep.innerHTML = `
          <div class="day-sep-line"></div>
          <div class="day-sep-label">${fmtDay(item.date)}</div>
          <div class="day-sep-line"></div>
        `;
        threadList.appendChild(sep);
        prevDay = currentDay;
      }

      const taskInfo = parseTask(item.text);
      const isTask = !!(item.is_task || taskInfo.isTask);
      const isQ = !!(item.is_question || isQuestionText(item.text));

      const row = document.createElement('div');
      row.className = 'note-row';
      if (isTask && item.completed) row.classList.add('task-completed');

      row.innerHTML = `
        <div class="note-time">${fmtTime(item.date)}</div>
        <div class="note-body">
          <div class="note-text"></div>
          ${isQ ? `
            <div class="answer-wrap" data-answer-wrap="${idx}">
              <span class="answer-label">Answer:</span>
              <input class="answer-input" type="text" placeholder="Start typing..." value="${escAttr(item.answer ?? '')}" data-answer-input="${idx}" />
              <button class="answer-save" type="button" aria-label="Save answer" data-answer-save="${idx}">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5"></path>
                </svg>
              </button>
            </div>
          ` : ``}
        </div>
      `;

      const noteTextEl = row.querySelector('.note-text');
      if (isTask) {
        const wrap = document.createElement('div');
        wrap.className = 'task-line';
        const cb = document.createElement('button');
        cb.className = 'task-check';
        cb.type = 'button';
        cb.setAttribute('role', 'checkbox');
        cb.setAttribute('aria-label', item.completed ? 'Mark as not completed' : 'Mark as completed');
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
          const changed = await mutateThreadPayload(note.id, (list) => {
            if (!list[idx]) return list;
            list[idx].completed = next;
            return list;
          });
          if (!changed) return;
          renderThread(changed.note, changed.payload);
        });
      } else {
        noteTextEl.textContent = item.text ?? '';
      }

      if (isQ) {
        const wrap = row.querySelector(`[data-answer-wrap="${idx}"]`);
        const input = row.querySelector(`[data-answer-input="${idx}"]`);
        const saveBtn = row.querySelector(`[data-answer-save="${idx}"]`);

        let initialValue = (item.answer ?? '').toString();

        const commitIfNeeded = async () => {
          const val = input.value ?? '';
          if (val === initialValue) {
            saveBtn.classList.remove('is-visible');
            return;
          }
          const changed = await mutateThreadPayload(note.id, (list) => {
            if (!list[idx]) return list;
            list[idx].answer = val.trim().length ? val.trim() : null;
            return list;
          });
          if (!changed) return;
          initialValue = val;
          saveBtn.classList.remove('is-visible');
          renderThread(changed.note, changed.payload);
        };

        input.addEventListener('input', () => {
          if (input.value.length >= 1) saveBtn.classList.add('is-visible');
          else saveBtn.classList.remove('is-visible');
        });
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            input.blur();
          }
        });
        input.addEventListener('blur', async () => {
          await commitIfNeeded();
        });
        saveBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          await commitIfNeeded();
        });
      }

      threadList.appendChild(row);
    });
  }

  async function loadThread() {
    if (!threadId || !publicKey) {
      showError('Invalid thread link.');
      return;
    }

    const { data, error } = await sb
      .from('notes')
      .select('id, text, date, is_task, completed, is_question, answer')
      .eq('id', threadId)
      .maybeSingle();

    if (error) {
      showError('Thread is not available. ' + error.message);
      return;
    }

    if (!data) {
      showError('Thread is not available. Check public access policy in Supabase.');
      return;
    }

    const payload = parseThreadPayload(data);
    if (!payload || !payload.public_enabled || String(payload.public_id) !== String(publicKey)) {
      showError('Thread is not available.');
      return;
    }

    currentNote = data;
    currentPayload = payload;
    renderThread(currentNote, currentPayload);
  }

  function startRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(async () => {
      if (!currentNote) return;
      const { data } = await sb
        .from('notes')
        .select('id, answer, text, date, is_task, completed, is_question')
        .eq('id', threadId)
        .maybeSingle();
      if (!data || !data.answer) return;
      if (currentNote.answer === data.answer) return;
      const payload = parseThreadPayload(data);
      if (!payload) return;
      currentNote = data;
      currentPayload = payload;
      renderThread(currentNote, currentPayload);
    }, 5000);
  }

  // composer (add note)
  threadNoteInput?.addEventListener('input', () => {
    threadSendBtn.disabled = threadNoteInput.value.trim().length === 0;
    threadNoteInput.style.height = 'auto';
    threadNoteInput.style.height = Math.min(threadNoteInput.scrollHeight, 120) + 'px';
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
    if (!text || !currentNote) return;

    threadNoteInput.disabled = true;
    threadSendBtn.disabled = true;

    const taskInfo = parseTask(text);

    const result = await mutateThreadPayload(currentNote.id, (items) => {
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
    threadNoteInput.style.height = 'auto';
    threadNoteInput.focus();

    if (result) {
      renderThread(result.note, result.payload);
      threadList.scrollTop = threadList.scrollHeight;
    }
  }

  await loadThread();
  startRefresh();
})();
