import * as faceapi from '@vladmandic/face-api';

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
const MATCH_THRESHOLD = 0.55;

let modelsLoaded = false;
let faceMatcher = null;

export async function loadModels(onProgress) {
  if (modelsLoaded) return;

  onProgress?.('Loading face detection models…');
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);

  modelsLoaded = true;
  onProgress?.('Models ready');
}

export async function buildFaceLibrary(students, onProgress) {
  const labeledDescriptors = [];

  for (const student of students) {
    onProgress?.(`Indexing ${student.firstName} ${student.lastName}…`);

    let img;
    try {
      img = await faceapi.fetchImage(student.photoUrl);
    } catch (err) {
      console.warn(`Could not load photo for ${student.id}:`, err);
      continue;
    }

    const detection = await faceapi
      .detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      console.warn(`No face found in reference photo for ${student.id}`);
      continue;
    }

    labeledDescriptors.push(
      new faceapi.LabeledFaceDescriptors(
        student.id,
        [detection.descriptor]
      )
    );
  }

  faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, MATCH_THRESHOLD);
  return labeledDescriptors.length;
}

export async function detectFaceFromVideo(video) {
  if (!modelsLoaded) {
    throw new Error('Models not loaded');
  }

  return faceapi
    .detectSingleFace(video)
    .withFaceLandmarks()
    .withFaceDescriptor();
}

export function matchFace(descriptor) {
  if (!faceMatcher) {
    throw new Error('Face library not built');
  }

  const match = faceMatcher.findBestMatch(descriptor);
  return {
    studentId: match.label,
    distance: match.distance,
    confidence: Math.max(0, Math.round((1 - match.distance) * 100)),
    isMatch: match.label !== 'unknown',
  };
}

export function drawDetection(canvas, video, detection) {
  const displaySize = { width: video.videoWidth, height: video.videoHeight };
  faceapi.matchDimensions(canvas, displaySize);

  const resized = faceapi.resizeResults(detection, displaySize);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (resized) {
    faceapi.draw.drawDetections(canvas, resized);
    faceapi.draw.drawFaceLandmarks(canvas, resized);
  }
}

export { MATCH_THRESHOLD };
