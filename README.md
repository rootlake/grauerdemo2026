# Grauer Hall Face Check-In

A simple dorm check-in demo that matches live webcam faces against a roster library using [`@vladmandic/face-api`](https://github.com/vladmandic/face-api) (maintained fork of face-api.js, TensorFlow.js in the browser).

## Project structure

```
GrauerDemo1/
├── data/
│   └── students.json          # Fake roster: names, rooms, reference photo URLs
├── src/
│   ├── main.js                # App entry
│   ├── styles.css
│   ├── data/
│   │   └── student-store.js   # Roster + check-in history (localStorage)
│   ├── face/
│   │   └── face-service.js    # Model loading, indexing, matching
│   └── ui/
│       └── check-in-app.js    # Webcam UI + scan loop
├── index.html
├── package.json
└── vite.config.js
```

## Quick start

```bash
npm install
npm run dev
```

**Live demo:** https://rootlake.github.io/grauerdemo2026/

Allow camera access when prompted. The app will:

1. Load face detection + recognition models from the face-api CDN
2. Index each student's reference photo into a face library
3. Scan the webcam and match against the roster
4. Log recent check-ins locally

## Sample data

`data/students.json` includes 12 fake residents across East/West/North/South wings with room numbers like `214`, `305`, `410`. Reference photos live in `public/reference/` (served locally to avoid CORS issues).

## Notes

- This is a demo only — students have given permission for your use case.
- Matching quality depends on reference photos and lighting; swap `photoUrl` values for actual dorm headshots for best results.
- Check-in history is stored in the browser (`localStorage`), not on a server.

## Library

- **Face API:** https://github.com/vladmandic/face-api
- **Models:** loaded from jsDelivr (`@vladmandic/face-api/model`)
