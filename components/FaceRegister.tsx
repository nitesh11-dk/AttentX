'use client'

import React, { useRef, useState, useEffect } from 'react'
import Webcam from 'react-webcam'
import * as faceapi from 'face-api.js'
import { loadModels, getDescriptorFromVideo } from '@/lib/faceUtils'
import { Camera, UserPlus, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { getEmployees, registerFace } from '@/actions/employeeActions'

// Define the Employee interface matching our schema structure
interface Employee {
    id: string
    empCode: string
    name: string
    faceData?: { id: string }[]
}

const playBeep = (type: 'success' | 'error') => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        if (type === 'success') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.1);
        } else {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.3);
            gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
        }
    } catch (e) {
        console.error('Audio playback failed', e);
    }
};

export default function FaceRegister() {
    const webcamRef = useRef<Webcam>(null)

    const [employees, setEmployees] = useState<Employee[]>([])
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)

    const [isModelLoaded, setIsModelLoaded] = useState(false)
    const [isCapturing, setIsCapturing] = useState(false)
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('loading')
    const [message, setMessage] = useState('Loading face recognition models...')

    const [step, setStep] = useState<1 | 2>(1)

    // Camera controls
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')

    useEffect(() => {
        const init = async () => {
            try {
                // Fetch employees for dropdown using Server Action
                const response = await getEmployees()
                if (response.success && response.data) {
                    setEmployees(response.data)
                } else {
                    console.error("Failed to fetch employees via action:", response.message)
                }

                // Load face-api models
                await loadModels()
                setIsModelLoaded(true)
                setStatus('idle')
                setMessage('Ready to register. Please select an employee.')
            } catch (error) {
                console.error('Initialization error:', error)
                setStatus('error')
                setMessage('Failed to load. Please refresh the page.')
            }
        }
        init()

        const getCameras = async () => {
            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
                    console.log("enumerateDevices() not supported.");
                    return;
                }
                const mediaDevices = await navigator.mediaDevices.enumerateDevices()
                const videoDevices = mediaDevices.filter(device => device.kind === 'videoinput')
                setDevices(videoDevices)
                if (videoDevices.length > 0) {
                    setSelectedDeviceId(videoDevices[0].deviceId)
                }
            } catch (error) {
                console.error('Error fetching cameras:', error)
            }
        }
        getCameras()
    }, [])



    const handleNextStep = () => {
        if (!selectedEmployee) {
            setStatus('error')
            setMessage('Please select an employee first.')
            return
        }
        setStatus('idle')
        setMessage('Ready to register. Please position face clearly in the camera.')
        setStep(2)
    }

    const handleBackStep = () => {
        setStep(1)
        setStatus('idle')
        setMessage('Ready to register. Please select an employee.')
    }

    const captureAndRegister = async () => {
        if (!webcamRef.current || !webcamRef.current.video) {
            setStatus('error')
            setMessage('Webcam not ready')
            return
        }

        if (!selectedEmployee) {
            setStatus('error')
            setMessage('Employee not selected')
            return
        }

        setIsCapturing(true)
        setStatus('loading')
        setMessage('LIVENESS CHECK: Please follow the head movement instructions...')

        try {
            const video = webcamRef.current.video

            // STEP 1: 3D LIVENESS CHECK (Head Pose Challenge)
            // Note: Since the webcam is usually mirrored (facingMode "user"), 
            // Turning head LEFT in reality moves the nose RIGHT on the image.
            // We invert the instructions here to match the mirrored feed.
            const { calculateHeadYaw } = await import('@/lib/faceUtils')

            const livenessStages = [
                { id: 'left', message: 'LIVENESS CHECK: Turn head slightly RIGHT', min: 0, max: 0.65 },
                { id: 'right', message: 'LIVENESS CHECK: Turn head slightly LEFT', min: 1.5, max: 99 },
                { id: 'straight', message: 'LIVENESS CHECK: Look STRAIGHT at camera', min: 0.85, max: 1.15 }
            ]

            let currentStage = 0
            const timeoutStart = Date.now()

            while (currentStage < livenessStages.length && (Date.now() - timeoutStart < 20000)) {
                setMessage(`${livenessStages[currentStage].message} (${20 - Math.floor((Date.now() - timeoutStart) / 1000)}s)`)

                const detections = await faceapi.detectSingleFace(video).withFaceLandmarks()
                if (detections) {
                    const landmarks = detections.landmarks
                    const jaw = landmarks.getJawOutline()
                    const nose = landmarks.getNose()

                    const yawRatio = calculateHeadYaw(jaw, nose)
                    console.log(`Yaw Ratio: ${yawRatio.toFixed(2)} - Target: ${livenessStages[currentStage].id}`)

                    const { min, max } = livenessStages[currentStage]
                    if (yawRatio >= min && yawRatio <= max) {
                        currentStage++
                        if (currentStage < livenessStages.length) {
                            setMessage('Good! Next...')
                            await new Promise(r => setTimeout(r, 800))
                        }
                    }
                }
                await new Promise(r => setTimeout(r, 100))
            }

            if (currentStage < livenessStages.length) {
                setStatus('error')
                setMessage('Liveness verification failed. Time expired. Please try again.')
                playBeep('error')
                setIsCapturing(false)
                return
            }

            setMessage('Liveness Verified! Prepare for capture...')
            await new Promise(r => setTimeout(r, 1000))

            // STEP 2: INTERACTIVE CAPTURE SEQUENCE
            const descriptorsToSave: number[][] = []

            const steps = [
                "Look STRAIGHT at the camera.",
                "Turn head slightly RIGHT.",
                "Turn head slightly LEFT.",
                "Tilt head slightly UP.",
                "Tilt head slightly DOWN.",
                "Give a natural SMILE.",
                "Look STRAIGHT again to finish."
            ]

            for (let i = 0; i < 7; i++) {
                setMessage(`Capture ${i + 1}/7: ${steps[i]}`)
                await new Promise(resolve => setTimeout(resolve, 1500))

                const descriptor = await getDescriptorFromVideo(video)

                if (!descriptor) {
                    throw new Error(`Face lost during step ${i + 1}. Please stay in frame and try again.`)
                }

                descriptorsToSave.push(Array.from(descriptor))
            }

            setMessage('All snapshots captured! Saving High-Accuracy Profile...')

            const response = await registerFace({
                employeeId: selectedEmployee.id,
                empCode: selectedEmployee.empCode,
                name: selectedEmployee.name,
                descriptors: descriptorsToSave,
            })

            if (!response.success) {
                throw new Error(response.message || 'Failed to register')
            }

            setStatus('success')
            setMessage(`Successfully registered: ${selectedEmployee.name} with 3D LIVENESS Profile.`)
            playBeep('success')
            setStep(1)

            // Reset form / update employee state
            const updatedEmployees = employees.map(emp => {
                if (emp.id === selectedEmployee.id) {
                    return { ...emp, faceData: [{ id: 'new' }] } // just flag it
                }
                return emp
            })
            setEmployees(updatedEmployees)
            setSelectedEmployee(null)

        } catch (error: any) {
            console.error('Registration error:', error)
            setStatus('error')
            setMessage(error.message || 'An error occurred during registration.')
            playBeep('error')
        } finally {
            setIsCapturing(false)
        }
    }

    return (
        <div className="w-full max-w-4xl mx-auto p-4">
            {step === 1 ? (
                <div className="bg-card text-card-foreground p-6 rounded-xl shadow-md border max-w-lg mx-auto">
                    <div className="flex flex-col gap-1 mb-6">
                        <div className="flex items-center gap-2 text-primary">
                            <UserPlus className="w-6 h-6" />
                            <h2 className="text-2xl font-bold">Assign Face Profile</h2>
                        </div>
                        <p className="text-sm text-muted-foreground ml-8">Select an employee from the dropdown to associate a face profile.</p>
                    </div>

                    <div className="space-y-4 relative">
                        <div>
                            <label className="block text-sm font-medium mb-1">Select Employee</label>
                            <select
                                value={selectedEmployee?.id || ''}
                                onChange={(e) => {
                                    const emp = employees.find(em => em.id === e.target.value)
                                    setSelectedEmployee(emp || null)
                                }}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="">-- Select an Employee --</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.name} ({emp.empCode}) {emp.faceData && emp.faceData.length > 0 ? '✓ (Registered)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={`p-4 rounded-lg mt-6 border ${status === 'error' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                            status === 'success' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                                status === 'loading' ? 'bg-primary/10 text-primary border-primary/20' :
                                    'bg-muted text-muted-foreground'
                            }`}>
                            <div className="flex items-center gap-2">
                                {status === 'loading' && <RefreshCw className="w-5 h-5 animate-spin" />}
                                {status === 'success' && <CheckCircle className="w-5 h-5" />}
                                {status === 'error' && <AlertCircle className="w-5 h-5" />}
                                <span className="font-medium">{message}</span>
                            </div>
                        </div>

                        <button
                            onClick={handleNextStep}
                            disabled={!isModelLoaded || !selectedEmployee}
                            className={`w-full py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all mt-4
                  ${(!isModelLoaded || !selectedEmployee)
                                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                                    : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transform hover:-translate-y-0.5'
                                }`}
                        >
                            Next: Camera Registration
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-card text-card-foreground p-6 rounded-xl shadow-md border max-w-4xl mx-auto flex flex-col items-center">
                    <div className="w-full flex items-center justify-between mb-4">
                        <button onClick={handleBackStep} className="text-muted-foreground hover:text-foreground text-sm font-medium py-1 px-3 border rounded-md transition-colors">
                            ← Back
                        </button>
                        <h2 className="text-lg font-bold">Scan Face for {selectedEmployee?.name}</h2>
                    </div>

                    <div className={`w-full p-4 rounded-lg mb-6 border ${status === 'error' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                        status === 'success' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                            status === 'loading' ? 'bg-primary/10 text-primary border-primary/20' :
                                'bg-muted text-muted-foreground'
                        }`}>
                        <div className="flex items-center gap-2">
                            {status === 'loading' && <RefreshCw className="w-5 h-5 animate-spin" />}
                            {status === 'success' && <CheckCircle className="w-5 h-5" />}
                            {status === 'error' && <AlertCircle className="w-5 h-5" />}
                            <span className="font-medium text-sm sm:text-base">{message}</span>
                        </div>
                    </div>

                    {/* Camera Controls */}
                    <div className="w-full max-w-sm mb-4 bg-muted/50 p-4 rounded-lg border flex flex-col sm:flex-row gap-4 items-end">
                        <div className="w-full">
                            <label className="block text-sm font-medium mb-1">Select Camera</label>
                            <select
                                value={selectedDeviceId}
                                onChange={(e) => setSelectedDeviceId(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                {devices.map((device, index) => (
                                    <option key={device.deviceId} value={device.deviceId}>
                                        {device.label || `Camera ${index + 1}`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="w-full bg-black rounded-xl overflow-hidden shadow-xl border-4 relative aspect-[3/4] max-w-sm flex items-center justify-center">
                        <div className="w-full h-full">
                            <Webcam
                                ref={webcamRef}
                                audio={false}
                                screenshotFormat="image/jpeg"
                                videoConstraints={{
                                    width: 540,
                                    height: 720,
                                    deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
                                    facingMode: selectedDeviceId ? undefined : "user"
                                }}
                                className="w-full h-full object-cover transform scale-x-[-1]"
                            />
                        </div>

                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div className="w-48 h-64 border-2 border-dashed border-white/50 rounded-full flex items-center justify-center bg-black/5 mix-blend-overlay">
                                <span className="text-white/80 text-xs font-medium px-2 py-1 backdrop-blur-sm rounded">Align Face</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={captureAndRegister}
                        disabled={!isModelLoaded || isCapturing}
                        className={`w-full max-w-sm py-4 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all mt-6
                  ${(!isModelLoaded || isCapturing)
                                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                                : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transform hover:-translate-y-0.5'
                            }`}
                    >
                        {isCapturing ? (
                            <>
                                <RefreshCw className="w-5 h-5 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Camera className="w-5 h-5" />
                                Capture Face
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    )
}
