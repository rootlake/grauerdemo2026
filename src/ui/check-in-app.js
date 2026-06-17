import {
  buildFaceLibrary,
  detectFaceFromVideo,
  drawDetection,
  loadModels,
  matchFace,
} from '../face/face-service.js';
import {
  formatRoomLabel,
  formatStudentName,
  getCheckInHistory,
  getRoster,
  getStudentById,
  logCheckIn,
} from '../data/student-store.js';

const COOLDOWN_MS = 4000;

export function mountCheckInApp(root) {
  const roster = getRoster();

  root.innerHTML = `
    <div class="app">
      <header class="header">
        <div class="header-badge">Demo · With Permission</div>
        <h1>${roster.dorm}</h1>
        <p class="subtitle">Face check-in · ${roster.term}</p>
      </header>

      <main class="layout">
        <section class="panel camera-panel">
          <div class="panel-head">
            <h2>Live Check-In</h2>
            <span id="status-pill" class="status-pill status-loading">Starting…</span>
          </div>

          <div class="video-wrap">
            <video id="webcam" autoplay muted playsinline></video>
            <canvas id="overlay"></canvas>
          </div>

          <p id="status-text" class="status-text">Initializing camera and face models…</p>

          <div id="match-card" class="match-card match-card-hidden">
            <img id="match-photo" class="match-photo" alt="" />
            <div class="match-body">
              <p class="match-label">Welcome back</p>
              <h3 id="match-name"></h3>
              <p id="match-room" class="match-room"></p>
              <p id="match-confidence" class="match-confidence"></p>
            </div>
          </div>
        </section>

        <aside class="panel roster-panel">
          <div class="panel-head">
            <h2>Residents</h2>
            <span class="count-badge">${roster.students.length}</span>
          </div>
          <ul id="roster-list" class="roster-list"></ul>

          <div class="panel-head history-head">
            <h2>Recent Check-Ins</h2>
          </div>
          <ul id="history-list" class="history-list"></ul>
        </aside>
      </main>
    </div>
  `;

  const video = root.querySelector('#webcam');
  const canvas = root.querySelector('#overlay');
  const statusPill = root.querySelector('#status-pill');
  const statusText = root.querySelector('#status-text');
  const matchCard = root.querySelector('#match-card');
  const matchPhoto = root.querySelector('#match-photo');
  const matchName = root.querySelector('#match-name');
  const matchRoom = root.querySelector('#match-room');
  const matchConfidence = root.querySelector('#match-confidence');
  const rosterList = root.querySelector('#roster-list');
  const historyList = root.querySelector('#history-list');

  let scanning = false;
  let lastCheckInAt = 0;
  let animationId = null;

  renderRoster(rosterList, roster.students);
  renderHistory(historyList);

  init();

  async function init() {
    try {
      setStatus('loading', 'Loading AI models…');
      await loadModels((msg) => setStatus('loading', msg));

      setStatus('loading', 'Building face library from roster…');
      const indexed = await buildFaceLibrary(roster.students, (msg) =>
        setStatus('loading', msg)
      );

      if (indexed === 0) {
        throw new Error('Could not index any reference faces');
      }

      setStatus('loading', 'Starting webcam…');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: false,
      });
      video.srcObject = stream;
      await video.play();

      scanning = true;
      setStatus('ready', 'Look at the camera to check in');
      scanLoop();
    } catch (err) {
      setStatus('error', err.message || 'Failed to start check-in');
      console.error(err);
    }
  }

  function scanLoop() {
    if (!scanning) return;

    animationId = requestAnimationFrame(async () => {
      if (video.readyState >= 2) {
        await processFrame();
      }
      scanLoop();
    });
  }

  async function processFrame() {
    const detection = await detectFaceFromVideo(video);
    drawDetection(canvas, video, detection);

    if (!detection) {
      matchCard.classList.add('match-card-hidden');
      return;
    }

    const result = matchFace(detection.descriptor);
    if (!result.isMatch) return;

    const now = Date.now();
    if (now - lastCheckInAt < COOLDOWN_MS) return;

    const student = getStudentById(result.studentId);
    if (!student) return;

    lastCheckInAt = now;
    showMatch(student, result.confidence);
    logCheckIn(student, result.confidence);
    renderHistory(historyList);
  }

  function showMatch(student, confidence) {
    matchPhoto.src = student.photoUrl;
    matchPhoto.alt = formatStudentName(student);
    matchName.textContent = formatStudentName(student);
    matchRoom.textContent = formatRoomLabel(student);
    matchConfidence.textContent = `${confidence}% match confidence`;
    matchCard.classList.remove('match-card-hidden');
  }

  function setStatus(kind, message) {
    statusText.textContent = message;
    statusPill.textContent =
      kind === 'ready' ? 'Scanning' : kind === 'error' ? 'Error' : 'Loading';
    statusPill.className = `status-pill status-${kind}`;
  }

  window.addEventListener('beforeunload', () => {
    scanning = false;
    if (animationId) cancelAnimationFrame(animationId);
    if (video.srcObject) {
      video.srcObject.getTracks().forEach((t) => t.stop());
    }
  });
}

function renderRoster(listEl, students) {
  listEl.innerHTML = students
    .map(
      (s) => `
      <li class="roster-item">
        <img src="${s.photoUrl}" alt="" class="roster-thumb" loading="lazy" />
        <div>
          <p class="roster-name">${s.firstName} ${s.lastName}</p>
          <p class="roster-meta">Rm ${s.room} · ${s.wing} · ${s.year}</p>
        </div>
      </li>
    `
    )
    .join('');
}

function renderHistory(listEl) {
  const history = getCheckInHistory();

  if (history.length === 0) {
    listEl.innerHTML = `<li class="history-empty">No check-ins yet</li>`;
    return;
  }

  listEl.innerHTML = history
    .slice(0, 8)
    .map(
      (entry) => `
      <li class="history-item">
        <div>
          <p class="history-name">${entry.name}</p>
          <p class="history-meta">Rm ${entry.room} · ${formatTime(entry.timestamp)}</p>
        </div>
        <span class="history-confidence">${entry.confidence}%</span>
      </li>
    `
    )
    .join('');
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}
