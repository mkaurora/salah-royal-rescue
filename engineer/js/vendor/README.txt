Vendored browser builds (loaded only when Salah taps "Ask Helper"; never precached by the service worker):
- elevenlabs-client.js        = @elevenlabs/client 1.28.0 dist/lib.iife.js (MIT, ElevenLabs; bundles livekit-client, Apache-2.0).
                                Global: ElevenLabsClient.Conversation.startSession({ agentId, connectionType: 'webrtc', ... })
- libsamplerate.worklet.js    = @alexanderolsen/libsamplerate-js 2.1.2 dist/libsamplerate.worklet.js (MIT).
                                Passed as libsampleratePath so the SDK never loads it from a CDN.
Update: npm pack @elevenlabs/client@<version>, copy dist/lib.iife.js here, run node tools/build-sw.js and npm test.
