'use strict';

const mediaSource = new MediaSource();
const BLOB_SIZE = 10;   // ms
mediaSource.addEventListener('sourceopen', handleSourceOpen, false);
let mediaRecorder;
let recordedBlobs;
let sourceBuffer;

// Recording parameters
const constraints = {
  audio: true,
  video: true
};

const recordedVideo = document.querySelector('video#recorded');
recordedVideo.addEventListener('error', function(ev) {
  console.error('MediaRecording.recordedMedia.error()');
}, true);

const recordButton = document.querySelector('button#record');
recordButton.addEventListener('click', () => {
  if (recordButton.textContent === 'Start Recording') {
    startRecording();
  } else {
    stopRecording();
    recordButton.textContent = 'Start Recording';
    uploadButton.disabled = false;
  }
});

const playButton = document.querySelector('button#play');
playButton.addEventListener('click', () => {
  var xhr = new XMLHttpRequest();
    xhr.open('GET', '/last_video', true);
    xhr.responseType = 'blob';
    xhr.onload = function(e) {
    if (this.status == 200) {
      var videoBlob = this.response;
      recordedVideo.src = window.URL.createObjectURL(videoBlob);
      recordedVideo.addEventListener('loadedmetadata', () => {
        recordedVideo.play();
      });
    }
  };
  xhr.send();
});

const uploadButton = document.querySelector('button#upload');
uploadButton.addEventListener('click', () => {
  const blob = new Blob(recordedBlobs, {type: 'video/webm'});
  uploadVideo(blob);
});

function uploadVideo(blobOrFile) {
  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/upload_video', true);
  xhr.onload = function(e) {console.log('Video uploaded.');};
  xhr.send(blobOrFile);
}

// window.isSecureContext could be used for Chrome
let isSecureOrigin = location.protocol === 'https:' || location.hostname === 'localhost';
if (!isSecureOrigin) {
  alert('getUserMedia() must be run from a secure origin: HTTPS or localhost.\n\nChanging protocol to HTTPS');
  location.protocol = 'HTTPS';
}

function handleSourceOpen(event) {
  sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs="vp8"');
}

function handleDataAvailable(event) {
  if (event.data && event.data.size > 0) {
    recordedBlobs.push(event.data);
  }
}

function handleStop(event) {
  // TODO upload video then record new
}

function startRecording() {
  recordedBlobs = [];
  let options = {mimeType: 'video/webm;codecs=vp9'};
  if (!MediaRecorder.isTypeSupported(options.mimeType)) {
    console.log(options.mimeType + ' is not Supported');
    options = {mimeType: 'video/webm;codecs=vp8'};
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      console.log(options.mimeType + ' is not Supported');
      options = {mimeType: 'video/webm'};
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        console.log(options.mimeType + ' is not Supported');
        options = {mimeType: ''};
      }
    }
  }
  try {
    mediaRecorder = new MediaRecorder(window.stream, options);
  } catch (e) {
    console.error(`Exception while creating MediaRecorder: ${e}`);
    alert(`Exception while creating MediaRecorder: ${e}. mimeType: ${options.mimeType}`);
    return;
  }
  recordButton.textContent = 'Stop Recording';
  uploadButton.disabled = true;
  mediaRecorder.onstop = handleStop;
  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.start(BLOB_SIZE); // collect 10ms of data
}

function stopRecording() {
  mediaRecorder.stop();
  recordedVideo.controls = true;
}

function handleSuccess(stream) {
  recordButton.disabled = false;
  window.stream = stream;

  const gumVideo = document.querySelector('video#gum');
  gumVideo.srcObject = stream;
}

function handleError(error) {
  console.log('navigator.getUserMedia error: ', error);
  alert(error.message + '\nCheck if your microphone and camera are turned on.');
}

navigator.mediaDevices.getUserMedia(constraints).then(handleSuccess).catch(handleError);
