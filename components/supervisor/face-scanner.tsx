"use client";

import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import * as faceapi from "face-api.js";
import { loadModels } from "@/lib/faceUtils";
import { AlertCircle, Camera, CheckCircle, RefreshCw, Clock } from "lucide-react";
import { getEmployees } from "@/actions/employeeActions";
import { Card, CardContent } from "@/components/ui/card";

// Matching Threshold (0.38 is very strict, mapping to >90% match certainty)
const MATCH_THRESHOLD = 0.38;

type Props = {
    onScan: (empCode: string) => void;
    isProcessing: boolean;
    onFacesLoaded?: (count: number) => void;
};

export default function SupervisorFaceScanner({ onScan, isProcessing, onFacesLoaded }: Props) {
    const webcamRef = useRef<Webcam>(null);

    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [registeredFaces, setRegisteredFaces] = useState<any[]>([]);
    const [faceMatcher, setFaceMatcher] = useState<faceapi.FaceMatcher | null>(null);

    const [scanStatus, setScanStatus] = useState<"idle" | "scanning" | "matched" | "unknown" | "error">("idle");
    const [message, setMessage] = useState("Loading face recognition models...");

    // Camera controls
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

    // Determine if the current camera should be mirrored
    const isMirrored = React.useMemo(() => {
        if (!selectedDeviceId) return true; // Default to mirrored (front)
        const device = devices.find(d => d.deviceId === selectedDeviceId);
        if (!device) return true;
        const label = device.label.toLowerCase();
        return !(label.includes('back') || label.includes('rear') || label.includes('environment'));
    }, [selectedDeviceId, devices]);

    // Confidence mapping
    const getConfidenceScore = (distance: number) => {
        const score = 1.0 - distance * 0.25;
        return Math.max(0, Math.min(1, score));
    };

    // Load models and fetch employees on mount
    useEffect(() => {
        let active = true;

        const init = async () => {
            try {
                await loadModels();
                if (!active) return;
                setIsModelLoaded(true);

                const res = await getEmployees();
                if (!res.success || !res.data) throw new Error("Failed to fetch registered employees");

                const employees = res.data;

                // Filter out employees without faceData
                const validEmployees = employees.filter((emp: any) => emp.faceData && emp.faceData.length > 0);
                setRegisteredFaces(validEmployees);
                if (onFacesLoaded) onFacesLoaded(validEmployees.length);

                if (validEmployees.length > 0) {
                    const labeledDescriptors = validEmployees.map((emp: any) => {
                        // faceData is a one-to-one mapped model inside employee
                        const faceRecord = emp.faceData[0];
                        // the schema has 'descriptors' as a Json 2D array: number[][]
                        const descriptors: number[][] = faceRecord.descriptors as number[][];

                        // Convert to Float32Array arrays for face-api
                        const float32Descriptors = descriptors.map((d: number[]) => new Float32Array(d));
                        return new faceapi.LabeledFaceDescriptors(emp.empCode, float32Descriptors);
                    });

                    const matcher = new faceapi.FaceMatcher(labeledDescriptors, MATCH_THRESHOLD);
                    setFaceMatcher(matcher);
                    setMessage(`Looking for a face...`);
                } else {
                    setMessage("No faces registered yet.");
                    setScanStatus("error");
                }
            } catch (error) {
                console.error("Initialization error:", error);
                setScanStatus("error");
                setMessage("Failed to initialize scanner. Please check your connection.");
            }
        };

        init();

        const getCameras = async () => {
            try {
                const mediaDevices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = mediaDevices.filter((device) => device.kind === "videoinput");
                setDevices(videoDevices);
                if (videoDevices.length > 0 && active) {
                    setSelectedDeviceId(videoDevices[0].deviceId);
                }
            } catch (error) {
                console.error("Error fetching cameras:", error);
            }
        };
        getCameras();

        return () => { active = false; };
    }, []);

    const scanFace = async () => {
        if (!webcamRef.current || !webcamRef.current.video) {
            setMessage('Webcam not ready');
            return;
        }

        if (!faceMatcher) {
            setMessage('No registered faces to match against.');
            return;
        }

        setIsScanning(true);
        setScanStatus('scanning');
        setMessage('Scanning face...');

        try {
            const video = webcamRef.current.video;

            // Recognition Phase - Direct & Fast
            const finalDetections = await faceapi.detectSingleFace(video)
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!finalDetections) {
                setScanStatus('error');
                setMessage('No face detected. Please look at the camera.');
                setIsScanning(false);
                return;
            }

            const bestMatch = faceMatcher.findBestMatch(finalDetections.descriptor);
            const confidence = getConfidenceScore(bestMatch.distance);

            if (bestMatch.label === 'unknown') {
                setScanStatus('unknown');
                setMessage(`Unknown face detected. Access denied. (Confidence: ${Math.round(confidence * 100)}%)`);
            } else {
                // Found a match => call the parent "onScan" using empCode 
                setScanStatus('matched');
                setMessage(`Recognized! (Accuracy: ${Math.round(confidence * 100)}%)...`);

                // Wait slightly so the user sees the successful flash before resetting state
                await new Promise(r => setTimeout(r, 800));
                onScan(bestMatch.label); // bestMatch.label is our empCode
                setScanStatus("idle");
                setMessage(`Looking for a face...`);
            }
        } catch (error: any) {
            console.error('Scan error:', error);
            setScanStatus('error');
            setMessage('Error occurred during scanning.');
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <div className="flex flex-col gap-4 w-full max-w-sm mx-auto p-2">
            {/* 📷 WEBCAM SECTION */}
            <div className="bg-black rounded-xl overflow-hidden shadow-md border-4 border-gray-800 relative w-full aspect-[3/4] flex items-center justify-center">
                <div className="w-full h-full">
                    <Webcam
                        ref={webcamRef}
                        audio={false}
                        screenshotFormat="image/jpeg"
                        videoConstraints={{
                            width: 540,
                            height: 720,
                            deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
                            facingMode: selectedDeviceId ? undefined : "user",
                        }}
                        className={`w-full h-full object-cover transform ${isMirrored ? 'scale-x-[-1]' : ''}`} // mirrored only if front camera
                    />
                </div>

                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div
                        className={`w-56 h-72 border-2 border-dashed rounded-full flex items-center justify-center transition-colors duration-300
              ${scanStatus === "matched"
                                ? "border-green-500 bg-green-500/10"
                                : scanStatus === "unknown"
                                    ? "border-red-500 bg-red-500/10"
                                    : scanStatus === "scanning"
                                        ? "border-blue-500 bg-blue-500/10"
                                        : "border-white/50"
                            }`}
                    ></div>
                </div>
            </div>

            {/* 🚥 STATUS BANNER */}
            <div
                className={`p-3 rounded-md transition-all text-center flex flex-col items-center justify-center min-h-[60px] ${scanStatus === "error" || scanStatus === "unknown"
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : scanStatus === "matched"
                        ? "bg-green-50 text-green-800 border border-green-200"
                        : scanStatus === "scanning"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-gray-50 text-gray-700 border border-gray-200"
                    }`}
            >
                <div className="flex items-center justify-center gap-2">
                    {scanStatus === "scanning" && <RefreshCw className="w-5 h-5 animate-spin" />}
                    {scanStatus === "matched" && <CheckCircle className="w-5 h-5" />}
                    {(scanStatus === "error" || scanStatus === "unknown") && <AlertCircle className="w-5 h-5" />}
                    {scanStatus === "idle" && <Clock className="w-5 h-5" />}
                    <span className="font-semibold text-sm">{message}</span>
                </div>
            </div>

            {/* 🎛️ CONTROLS */}
            <div className="flex flex-col gap-3">
                <select
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-primary bg-white"
                >
                    {devices.map((device, index) => (
                        <option key={device.deviceId} value={device.deviceId}>
                            {device.label || `Camera ${index + 1}`}
                        </option>
                    ))}
                </select>

                <button
                    onClick={scanFace}
                    disabled={!isModelLoaded || isScanning || registeredFaces.length === 0 || isProcessing}
                    className={`w-full py-3 px-4 rounded-md font-bold text-white flex items-center justify-center gap-2 transition-all
                    ${!isModelLoaded || isScanning || registeredFaces.length === 0 || isProcessing
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-primary hover:opacity-90 shadow-sm"
                        }`}
                >
                    {isScanning || isProcessing ? (
                        <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            Scanning...
                        </>
                    ) : (
                        <>
                            <Camera className="w-5 h-5" />
                            Start Face Scan
                        </>
                    )}
                </button>
            </div>

        </div>
    );
}
