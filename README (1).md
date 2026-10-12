# MeetUp – Text, Audio & Video Chat

A free, self-hosted chat site with four modes:

- **Text chat** – messages only
- **Audio chat** – voice call (with optional chat panel)
- **Video chat** – camera + mic
- **Video + Text** – video call with the chat panel open

Built with Node.js, Express, Socket.IO (signaling + chat) and WebRTC (peer-to-peer audio/video).
Rooms are created by typing any room code; share the invite link to bring people in. Up to 6 people per room.

## Run locally

```bash
npm install
npm start
# open http://localhost:3000
```

Camera/mic work on `localhost` and on HTTPS (Render provides HTTPS automatically).

## Deploy free on Render

1. Push this folder to a GitHub repository.
2. On https://render.com → **New +** → **Web Service** → connect the repo.
   (Or choose **Blueprint** and Render will read `render.yaml`.)
3. Settings: Runtime **Node**, Build Command `npm install`, Start Command `npm start`, Instance type **Free**.
4. Deploy. Your site will be at `https://<your-service>.onrender.com`.

### Notes

- Free Render services sleep after ~15 minutes of no traffic; the first visit afterwards takes ~30–60 seconds to wake up.
- Audio/video goes directly between browsers. A few users behind strict firewalls/mobile networks may fail to connect with STUN only.
  To fix that, add a TURN server and set `TURN_URL`, `TURN_USER`, `TURN_PASS` as environment variables in Render.
- Rooms are held in memory only; nothing is stored.
