import * as faceapi from 'face-api.js';

let modelsLoaded = false;

export const loadModels = async () => {
    if (modelsLoaded) return;
    const MODEL_URL = '/models';
    // Load the models from the public/models directory
    await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);
    modelsLoaded = true;
};

// Convert stored Float array to Float32Array
export const createFloat32Array = (arr: number[]) => {
    return new Float32Array(arr);
};

// Get a face descriptor from a video element
export const getDescriptorFromVideo = async (video: HTMLVideoElement) => {
    const detections = await faceapi.detectSingleFace(video)
        .withFaceLandmarks()
        .withFaceDescriptor();
    return detections?.descriptor;
};

// Calculate Euclidean distance between two points
export const euclideanDistance = (point1: faceapi.Point, point2: faceapi.Point) => {
    return Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2));
};

// Calculate Smile Ratio to detect a smile for liveness
export const calculateSmileRatio = (mouth: faceapi.Point[], jaw: faceapi.Point[]) => {
    // mouth[0] is the left corner (landmark 48)
    // mouth[6] is the right corner (landmark 54)
    const mouthWidth = euclideanDistance(mouth[0], mouth[6]);

    // jaw[0] is the far left of jaw (landmark 0)
    // jaw[16] is the far right of jaw (landmark 16)
    const jawWidth = euclideanDistance(jaw[0], jaw[16]);

    // Normalize mouth width by jaw width so it works at any distance
    return mouthWidth / jawWidth;
};

// Calculate Eye Aspect Ratio (EAR) for blink detection
export const calculateEAR = (eye: faceapi.Point[]) => {
    if (!eye || eye.length < 6) return 0;

    // vertical distances
    const v1 = euclideanDistance(eye[1], eye[5]);
    const v2 = euclideanDistance(eye[2], eye[4]);

    // horizontal distance
    const h = euclideanDistance(eye[0], eye[3]);

    return (v1 + v2) / (2.0 * h);
};

// Calculate Head Yaw (Left/Right turn) for 3D liveness detection
export const calculateHeadYaw = (jaw: faceapi.Point[], nose: faceapi.Point[]) => {
    // jaw[0] is the left edge of the face
    // jaw[16] is the right edge of the face
    // nose[3] is the tip of the nose
    if (!jaw || jaw.length < 17 || !nose || nose.length < 4) return 1.0;

    const leftDist = Math.max(0.1, euclideanDistance(jaw[0], nose[3]));
    const rightDist = Math.max(0.1, euclideanDistance(jaw[16], nose[3]));

    // Ratio of left distance to right distance:
    // ~1.0 = looking straight
    // < 0.6 = turned one way (left)
    // > 1.6 = turned the other way (right)
    return leftDist / rightDist;
};

// Calculate Euclidean distance between two face descriptors
export const descriptorDistance = (descriptor1: Float32Array, descriptor2: Float32Array): number => {
    if (!descriptor1 || !descriptor2 || descriptor1.length !== descriptor2.length) {
        return Infinity;
    }

    let sum = 0;
    for (let i = 0; i < descriptor1.length; i++) {
        const diff = descriptor1[i] - descriptor2[i];
        sum += diff * diff;
    }
    return Math.sqrt(sum);
};

// Check if a face descriptor matches any existing descriptors
// Returns the employee name if a match is found, null otherwise
// Uses stricter threshold (0.4) and requires multiple descriptor matches for accuracy
export const findMatchingFace = (
    newDescriptors: number[][],
    existingFaceData: Array<{ name: string; descriptors: number[][] }>,
    threshold: number = 0.4
): string | null => {
    for (const existing of existingFaceData) {
        let matchCount = 0;
        const minMatchesRequired = 3; // Require at least 3 descriptor matches

        for (const newDesc of newDescriptors) {
            const newDescFloat32 = new Float32Array(newDesc);

            for (const existingDesc of existing.descriptors) {
                const existingDescFloat32 = new Float32Array(existingDesc);
                const distance = descriptorDistance(newDescFloat32, existingDescFloat32);

                // Log distance for debugging (can be removed in production)
                console.log(`Face match distance: ${distance.toFixed(4)} (threshold: ${threshold})`);

                if (distance < threshold) {
                    matchCount++;
                    if (matchCount >= minMatchesRequired) {
                        console.log(`Face matched with ${existing.name} (${matchCount} descriptors matched)`);
                        return existing.name;
                    }
                }
            }
        }
    }
    return null;
};
