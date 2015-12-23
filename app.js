if (!window.hasOwnProperty('AudioContext')) {
  alert("Browser not support!");
} else {
  // Google Visualizer
  o3djs.require('o3djs.shader');

  // Gloabl Var
  var audioSource = "voice.mp3",
    fftSize = 2048, //sample size
    context,
    source,
    analyser,
    buffer,
    audioBuffer,
    analyserView,
    isAnimation = false;

  // Animataion Polyfill
  if (!window.requestAnimationFrame) {

    window.requestAnimationFrame = (function() {

      return window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame || // comment out if FF4 is slow
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function(callback, element) {
          window.setTimeout(callback, 1000 / 60);
        };
    })();
  }

  // Detect Microphone
  function getUserMedia(dictionary, callback) {

    // Fix getUserMedia 
    var promisifiedOldGUM = function(constraints, successCallback, errorCallback) {

      // First get ahold of getUserMedia, if present
      var getUserMedia = (navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia);

      // Some browsers just don't implement it - return a rejected promise with an error
      // to keep a consistent interface
      if (!getUserMedia) {
        return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
      }

      // Otherwise, wrap the call to the old navigator.getUserMedia with a Promise
      return new Promise(function(successCallback, errorCallback) {
        getUserMedia.call(navigator, constraints, successCallback, errorCallback);
      });

    }

    // Older browsers might not implement mediaDevices at all, so we set an empty object first
    if (navigator.mediaDevices === undefined) {
      navigator.mediaDevices = {};
    }

    // Some browsers partially implement mediaDevices. We can't just assign an object
    // with getUserMedia as it would overwrite existing properties.
    // Here, we will just add the getUserMedia property if it's missing.
    if (navigator.mediaDevices.getUserMedia === undefined) {
      navigator.mediaDevices.getUserMedia = promisifiedOldGUM;
    }

    navigator.mediaDevices.getUserMedia(dictionary)
      .then(callback)
      .catch(function(err) {
        alert('GetUserMedia Error :' + err.name);
        console.log(err);
      });
  }

  // init Visualier and AudioContext 
  function init() {
    if (!context || !context.state || context.state == 'closed') {
      analyserView = new AnalyserView("view");

      !context && window.requestAnimationFrame(draw); // Animation Reuqest

      context = new AudioContext();

      analyser = context.createAnalyser();
      analyser.fftSize = fftSize;
    }

  }

  // init Microphone
  function initMicrophone() {
    getUserMedia({
      audio: true
    }, function(stream) {
      init();

      // Create an AudioNode from the stream.
      source = context.createMediaStreamSource(stream);

      source.connect(analyser);
      analyser.connect(context.destination);

      analyserView.initByteBuffer();
    });
  }

  // init Audio
  function initAudio() {
    init();

    source = context.createBufferSource();

    // Connect audio processing graph
    source.connect(analyser);
    analyser.connect(context.destination);

    loadAudioBuffer(audioSource);

    analyserView.initByteBuffer();
  }

  function loadAudioBuffer(url) {
    // Load asynchronously

    var request = new XMLHttpRequest();
    request.open("GET", url);
    request.responseType = "arraybuffer";

    request.onload = function() {
      context.decodeAudioData(
        request.response,
        function(buffer) {
          audioBuffer = buffer;
          finishLoad(); // add in the slider, etc. now that we've loaded the audio
        },

        function(buffer) {
          console.log("Error decoding voice!", buffer);
        }
      );
    }

    request.send();
  }

  function finishLoad() {
    source.buffer = audioBuffer;
    source.loop = true;

    source.start(0.0);
  }

  // Render Canvas in 60 FPS
  function draw() {
    analyserView.doFrequencyAnalysis();
    window.requestAnimationFrame(draw);
  }

  // Stop audioContext and source stream
  function stop() {
    if (source) {
      source.stop && source.stop();
      source.disconnect();
    }
    // analyser && analyser.disconnect();
  }

  function changeToAudio() {
    stop();
    initAudio();
  }

  function changeToMicrophone() {
    stop();
    initMicrophone();
  }

  // init Microphone
  window.onload = initAudio;
}
