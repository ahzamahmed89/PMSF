import React, { useState, useRef, useEffect } from 'react';

export default function ActivityCard({
  activity,
  onActivityUpdate,
  onMediaAdd,
  onMediaRemove,
  previousActivity,
  previousStatusColor,
  onShowPrevious
}) {
  const [expandedMedia, setExpandedMedia] = useState(false);
  const [mediaFiles, setMediaFiles] = useState({
    images: [],
    video: null
  });
  const [showCamera, setShowCamera] = useState(false);
  const [cameraType, setCameraType] = useState('photo'); // 'photo' or 'video'
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const handleStatusChange = (status) => {
    onActivityUpdate(activity.Code, { ...activity, status });
  };

  const handleResponsibilityChange = (responsibility) => {
    onActivityUpdate(activity.Code, { ...activity, responsibility });
  };

  const handleRemarksChange = (remarks) => {
    onActivityUpdate(activity.Code, { ...activity, remarks });
  };

  // Start camera
  const startCamera = async () => {
    console.log('🎬 startCamera function called!');
    try {
      console.log('✅ Inside try block');
      console.log('isSecureContext:', window.isSecureContext);
      console.log('protocol:', window.location.protocol);
      
      // Check if running in secure context (HTTPS or localhost)
      if (!window.isSecureContext && window.location.protocol !== 'http:') {
        console.warn('❌ Not in secure context and not HTTP');
        alert('Camera access requires HTTPS on mobile devices. Please access the site using HTTPS or connect your mobile to the computer\'s localhost.');
        return;
      }

      // Check for getUserMedia support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('❌ getUserMedia not supported');
        alert('Camera is not supported. Please use Chrome, Firefox, or Safari browser.');
        return;
      }
      
      console.log('✅ getUserMedia is supported');

      // Try standard constraints first
      let constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: cameraType === 'video'
      };

      let stream;
      console.log('📹 Attempting to get camera stream with constraints:', constraints);
      
      try {
        console.log('🎯 Trying standard constraints...');
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('✅ Standard constraints worked!');
      } catch (err) {
        // Fallback: try with simpler constraints for older/mobile devices
        console.log('❌ Standard constraints failed:', err.name, err.message);
        console.log('🎯 Trying facingMode constraint...');
        try {
          constraints = {
            video: {
              facingMode: 'environment'
            },
            audio: cameraType === 'video'
          };
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          console.log('✅ FacingMode constraints worked!');
        } catch (err2) {
          // Last fallback: just request any video
          console.log('❌ FacingMode constraint failed:', err2.name, err2.message);
          console.log('🎯 Trying basic video:true...');
          constraints = {
            video: true,
            audio: cameraType === 'video'
          };
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          console.log('✅ Basic video:true worked!');
        }
      }
      
      console.log('✅ Stream acquired successfully:', stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        console.log('Stream connected:', stream);
        console.log('Stream active:', stream.active);
        console.log('Stream tracks:', stream.getTracks());
        console.log('Video element:', videoRef.current);
        
        // Show camera immediately
        setShowCamera(true);
        
        // Add multiple event listeners for better debugging
        videoRef.current.addEventListener('loadedmetadata', () => {
          console.log('Video metadata loaded - width:', videoRef.current.videoWidth, 'height:', videoRef.current.videoHeight);
        });
        
        videoRef.current.addEventListener('playing', () => {
          console.log('Video is playing');
          videoRef.current.style.backgroundColor = 'transparent';
        });
        
        videoRef.current.addEventListener('play', () => {
          console.log('Play event triggered');
        });
        
        videoRef.current.addEventListener('canplay', () => {
          console.log('Video can play');
        });
        
        videoRef.current.addEventListener('error', (err) => {
          console.error('Video element error:', err);
        });
        
        // Force a small delay then play
        setTimeout(() => {
          if (videoRef.current && videoRef.current.srcObject) {
            console.log('Attempting to play video...');
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  console.log('Video playing successfully');
                })
                .catch(err => {
                  console.error('Play error:', err);
                  console.log('Trying play without promise...');
                  videoRef.current.play().catch(e => console.error('Still failed:', e));
                });
            }
          }
        }, 100);
      }
    } catch (err) {
      console.error('❌ CAMERA ERROR CAUGHT:', err);
      console.error('Error name:', err.name);
      console.error('Error message:', err.message);
      console.error('Full error:', JSON.stringify(err));
      
      let errorMsg = 'Unable to access camera: ';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Camera permission denied. Tap "Allow" when Chrome asks for camera permission.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'No camera found. Please check if your device has a camera.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMsg = 'Camera is busy. Close other apps using the camera and try again.';
      } else if (err.name === 'NotSupportedError' || err.name === 'TypeError') {
        errorMsg = 'Camera not supported. Make sure you are using HTTPS or localhost connection.';
      } else {
        errorMsg += err.message;
      }
      
      alert(errorMsg);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  // Capture photo
  const capturePhoto = () => {
    if (canvasRef.current && videoRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(blob => {
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        if (mediaFiles.images.length < 3) {
          const newImages = [...mediaFiles.images, file];
          setMediaFiles(prev => ({ ...prev, images: newImages }));
          onMediaAdd(activity.Code, { images: newImages, video: mediaFiles.video });
        } else {
          alert('Maximum 3 images allowed');
        }
      }, 'image/jpeg');
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (mediaFiles.images.length + files.length > 3) {
      alert('Maximum 3 images allowed');
      return;
    }
    const newImages = [...mediaFiles.images, ...files.slice(0, 3 - mediaFiles.images.length)];
    setMediaFiles(prev => ({ ...prev, images: newImages }));
    onMediaAdd(activity.Code, { images: newImages, video: mediaFiles.video });
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMediaFiles(prev => ({ ...prev, video: file }));
      onMediaAdd(activity.Code, { images: mediaFiles.images, video: file });
    }
  };

  const removeImage = (index) => {
    const newImages = mediaFiles.images.filter((_, i) => i !== index);
    setMediaFiles(prev => ({ ...prev, images: newImages }));
    onMediaRemove(activity.Code, { images: newImages, video: mediaFiles.video });
  };

  const removeVideo = () => {
    setMediaFiles(prev => ({ ...prev, video: null }));
    onMediaRemove(activity.Code, { images: mediaFiles.images, video: null });
  };

  return (
    <div className="activity-card">
      <div className={`card-header status-${(activity.status || activity.V_Status || '').toLowerCase()}`}>
        <div className="activity-header-row">
          <h3 className="activity-title">{activity.Activity}</h3>
          <button
            type="button"
            className="prev-status-btn"
            style={{ backgroundColor: previousStatusColor || '#9e9e9e' }}
            onClick={() => previousActivity && onShowPrevious && onShowPrevious()}
            disabled={!previousActivity}
            title={previousActivity ? 'View previous quarter details' : 'No previous quarter entry'}
          >
            Prev
          </button>
        </div>
      </div>

      <div className="card-body">
        {/* Status Dropdown */}
        <div className="form-group">
          <label className="form-label">Status</label>
          <select 
            className="form-control status-dropdown"
            value={activity.status || activity.V_Status || ''}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="">-- Select Status --</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
            <option value="NA">NA</option>
          </select>
        </div>

        {/* Responsibility Dropdown */}
        <div className="form-group">
          <label className="form-label">Responsibility</label>
          <select 
            className="form-control responsibility-dropdown"
            value={activity.responsibility || activity.Responsibility || ''}
            onChange={(e) => handleResponsibilityChange(e.target.value)}
          >
            <option value="">-- Select Responsibility --</option>
            <option value="Admin">Admin</option>
            <option value="IT">IT</option>
            <option value="Branch Ops">Branch Ops</option>
            <option value="Marketing">Marketing</option>
            <option value="HR">HR</option>
            <option value="Business">Business</option>
          </select>
        </div>

        {/* Remarks Text Area */}
        <div className="form-group">
          <label className="form-label">Remarks</label>
          <textarea 
            className="form-control remarks-textarea"
            value={activity.remarks || ''}
            onChange={(e) => handleRemarksChange(e.target.value)}
            placeholder="Enter observations and remarks here..."
            rows="2"
          />
        </div>

        {/* Media Section */}
        <div className="media-section">
          <button 
            className="btn-media-toggle"
            onClick={() => setExpandedMedia(!expandedMedia)}
          >
            📸 📹 Media ({mediaFiles.images.length}/3, {mediaFiles.video ? '1/1' : '0/1'})
          </button>

          {expandedMedia && (
            <div className="media-upload-area">
              {/* Camera Section */}
              {!showCamera ? (
                <div className="camera-buttons">
                  <button 
                    className="btn-camera"
                    onClick={() => { 
                      console.log('📸 Take Photo clicked');
                      console.log('cameraType:', 'photo');
                      setCameraType('photo'); 
                      startCamera(); 
                    }}
                    disabled={mediaFiles.images.length >= 3}
                  >
                    📸 Take Photo
                  </button>
                  <button 
                    className="btn-camera"
                    onClick={() => { 
                      console.log('📹 Record Video clicked');
                      console.log('cameraType:', 'video');
                      setCameraType('video'); 
                      startCamera(); 
                    }}
                    disabled={!!mediaFiles.video}
                  >
                    📹 Record Video
                  </button>
                  <label className="btn-camera btn-file">
                    📁 Choose Image
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={mediaFiles.images.length >= 3}
                      className="hidden-input"
                    />
                  </label>
                  {!mediaFiles.video && (
                    <label className="btn-camera btn-file">
                      📁 Choose Video
                      <input 
                        type="file" 
                        accept="video/*"
                        onChange={handleVideoUpload}
                        className="hidden-input"
                      />
                    </label>
                  )}
                </div>
              ) : (
                <div className="camera-capture-area">
                  <video 
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={true}
                    controls={false}
                    webkit-playsinline="true"
                    className="camera-preview"
                    width={window.innerWidth - 32}
                    height={300}
                    style={{ 
                      width: '100%', 
                      height: '300px',
                      maxWidth: '100%',
                      backgroundColor: '#000',
                      objectFit: 'cover',
                      display: 'block',
                      borderRadius: '8px',
                      WebkitAppearance: 'none',
                      WebkitTransform: 'scaleX(-1)',
                      transform: 'scaleX(-1)',
                      WebkitUserSelect: 'none',
                      WebkitTouchCallout: 'none'
                    }}
                  />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  
                  <div className="camera-controls">
                    {cameraType === 'photo' && (
                      <button className="btn-capture" onClick={capturePhoto}>
                        📸 Capture Photo
                      </button>
                    )}
                    <button className="btn-close-camera" onClick={stopCamera}>
                      ✕ Close Camera
                    </button>
                  </div>
                </div>
              )}

              {/* Media Preview */}
              {(mediaFiles.images.length > 0 || mediaFiles.video) && (
                <div className="media-preview-section">
                  <div className="media-preview">
                    {mediaFiles.images.map((img, idx) => (
                      <div key={idx} className="media-thumbnail">
                        <img 
                          src={URL.createObjectURL(img)} 
                          alt={`preview-${idx}`}
                        />
                        <button 
                          className="btn-remove-media"
                          onClick={() => removeImage(idx)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  {mediaFiles.video && (
                    <div className="video-preview">
                      <video 
                        width="120" 
                        height="120" 
                        controls
                        src={URL.createObjectURL(mediaFiles.video)}
                      />
                      <button 
                        className="btn-remove-media"
                        onClick={removeVideo}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
