import roster from '../../data/students.json';

const CHECKINS_KEY = 'grauer-checkins';

export function getRoster() {
  return roster;
}

export function getStudentById(id) {
  return roster.students.find((s) => s.id === id) ?? null;
}

export function getStudentsByRoom(room) {
  return roster.students.filter((s) => s.room === room);
}

export function formatStudentName(student) {
  return `${student.firstName} ${student.lastName}`;
}

export function formatRoomLabel(student) {
  return `Room ${student.room} · ${student.wing} Wing`;
}

export function logCheckIn(student, confidence) {
  const entry = {
    id: crypto.randomUUID(),
    studentId: student.id,
    name: formatStudentName(student),
    room: student.room,
    wing: student.wing,
    confidence,
    timestamp: new Date().toISOString(),
  };

  const history = getCheckInHistory();
  history.unshift(entry);

  const trimmed = history.slice(0, 50);
  localStorage.setItem(CHECKINS_KEY, JSON.stringify(trimmed));
  return entry;
}

export function getCheckInHistory() {
  try {
    return JSON.parse(localStorage.getItem(CHECKINS_KEY) ?? '[]');
  } catch {
    return [];
  }
}
