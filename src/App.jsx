import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

function App() {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const [isCaller, setIsCaller] = useState(false);

  useEffect(() => {
    const startVideo = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideoRef.current.srcObject = stream;

      const configuration = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      };

      peerConnection.current = new RTCPeerConnection(configuration);

      stream.getTracks().forEach(track => {
        peerConnection.current.addTrack(track, stream);
      });

      peerConnection.current.ontrack = event => {
        remoteVideoRef.current.srcObject = event.streams[0];
      };

      peerConnection.current.onicecandidate = event => {
        if (event.candidate) {
          socket.emit('ice-candidate', event.candidate);
        }
      };

      socket.on('offer', async (offer) => {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        socket.emit('answer', answer);
      });

      socket.on('answer', async (answer) => {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
      });

      socket.on('ice-candidate', async (candidate) => {
        if (candidate) {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      });
    };

    startVideo();
  }, []);

  const startCall = async () => {
    setIsCaller(true);
    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);
    socket.emit('offer', offer);
  };

  return (
    <div>
      <h1>Simple WebRTC Video Chat</h1>
      <video ref={localVideoRef} autoPlay muted style={{ width: '300px' }} />
      <video ref={remoteVideoRef} autoPlay style={{ width: '300px' }} />
      <button onClick={startCall} disabled={isCaller}>Start Call</button>
    </div>
  );
}

export default App;
