# Web conference with recording

## About the project

This is a video conferencing room project thet uses MCU architecture, here have the part of recording of meeting, can record only audio or audio and video. Given a URL with recording you can download. If chosse only audio the file is .webm and the video is .mp4. Also has the part of chat, where user can write messages for the others users. 

## Platform

Was used the OpenVidu ( https://docs.openvidu.io/en/2.21.0/ ) for build this webconference. They use kurento and WebRTC for build the MCU.

## Dependecies

- Body-parse
- Express
- Openvidu-node-client
- Socket.io

## Installation 

To run need node, npm and Docker

Clone the project:

Copy: https://github.com/Luis-Hang/recording_webconference

1. Open terminal
2. Change the current working directory to the location where you want to have the cloned directory
3. Type git clone and paste the URL you copied earlier:
```bash
git clone https://github.com/Luis-Hang/recording_webconference
```
4. Check if you have node and npm
```bash
node -v
npm -v
```
5. In terminal of the project will intall npm and run
```bash
npm install
node server.js https://localhost:4443 MY_SECRET
```
5. In other terminal will execute
```bash
docker run -p 4443:4443 --rm \
    -e OPENVIDU_SECRET=MY_SECRET \
    -e OPENVIDU_RECORDING=true \
    -e OPENVIDU_RECORDING_PATH=/opt/openvidu/recordings \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v /opt/openvidu/recordings:/opt/openvidu/recordings \
openvidu/openvidu-server-kms:2.21.0
```

Now open http://localhost:5000/ in a browser

## About the code

### Backend

• server.js :
   Where is connection betwen the app and controller to enter the OpenVidu session utilizing the token

### frontend

• app.js : 
   front-backend communication
• index.html :
   website template
• style.css :
   website style
• openvidu-browser-2.21.0.js 
   openvidu-browser library, is static file.
