
var JanMediaCapture = function(args) {
	var self = this;

	self.args = args;
	self.mediaRecorder = null;
	self.chunks = [];
	self.videostream = null;
	self.audiostream = null;
	self.initialized = false;
	self.recording = false;
	self.cancelled = false;
	self.replaying = false;
	self.videoURL = null;
	self.media_specs = {};

	navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
							navigator.mozGetUserMedia || navigator.msGetUserMedia || null;
	window.URL = window.URL || window.webkitURL || window.msURL || window.mozURL;
}

JanMediaCapture.prototype.init = function(_cb) {
	var self = this;

	if(self.initialized) return _cb(!self.supports());
	self.initialized = true;

	self.chunks = [];
	self.videoRecorder = null;
	self.audioRecorder = null;
	self.cancelled = false;
	self.replaying = false;
	self.videoURL = null;

	if(!navigator.getUserMedia) {
		alert("Your browser does not support video recording");
		return callback('No Cap');
	}

	var constraints = {video: true, audio: false};
	navigator.getUserMedia(constraints, (function(stream) {
		self.initVideo(stream);
		_cb();
	}), (function(err) {
		_cb(err);
		alert("Error occured: " + err.name);
	}));

	var constraints = {video: true, audio: true};
	navigator.getUserMedia(constraints, (function(stream) {
		self.initAudio(stream);
		_cb();
	}), (function(err) {
		_cb(err);
		alert("Error occured: " + err.name);
	}));
}

JanMediaCapture.prototype.initVideo = function(stream) {
	var self = this;
	console.log('Init video...');

	self.videostream = stream;

	var settings = stream.getVideoTracks()[0].getSettings();
	self.media_specs.video = {
		fps: Math.round(settings.frameRate * 100) / 100,
		width: settings.width,
		height: settings.height,
		bitrate: 2500000,
		mime_type: 'video/webm',
		codec: 'vp8'
	};

	var options = {
		videoBitsPerSecond: self.media_specs.video.bitrate,
		mimeType: 'video/webm;codecs="vp8"'
	}
	self.videoRecorder = new MediaRecorder(stream, options);

	var video = document.querySelector('#my-video');
	if ('srcObject' in video) {
		video.srcObject = stream;
	} else {
		video.src = (window.URL || window.webkitURL).createObjectURL(JanMediaCapture);
	}
	video.volume = 0;
	video.play();

	self.videoRecorder.ondataavailable = function(e) {
		console.log('Data received...');
		//self.chunks.push(e.data);
		if(e.data && self.args.onMediaData) {
			self.args.onMediaData(e.data, 'video');
		}
	};

	self.videoRecorder.onerror = function(e){
		console.log('Video Error: ', e);
	};

	self.videoRecorder.onstart = function(){
		console.log('Started, state = ' + self.videoRecorder.state);

		self.recording = true;
		self.replaying = false;
	};

	self.videoRecorder.onstop = function(){
		console.log('Stopped, state = ' + videoRecorder.state);

		self.stop();

		if(self.cancelled)
			return;

		var videoURL = window.URL.createObjectURL(blob);
		video.src = videoURL;

		video.play();
		video.volume = 1.0;
		video.onended = onPlayEnded;

		self.replaying = true;
	};

	self.videoRecorder.onwarning = function(e){
		console.log('Warning: ' + e);
	};

	var onPlayEnded = function(e) {
		video.onended = null;
		video.volume = 0;

		self.replaying = false;
	}
}

JanMediaCapture.prototype.initAudio = function(stream) {
	var self = this;

	console.log('Init audio...');
	self.audiostream = stream;

	self.media_specs.audio = {
		bitrate: 128000,
		mime_type: 'audio/webm',
		codec: 'opus'
	};

	var options = {
		audioBitsPerSecond: self.media_specs.audio.bitrate,
		mimeType: 'audio/webm;codecs="opus"'
	}
	self.audioRecorder = new MediaRecorder(stream, options);

	self.audioRecorder.ondataavailable = function(e) {
		console.log('Audio Data received...');
		if(e.data && self.args.onMediaData) {
			self.args.onMediaData(e.data, 'audio');
		}
	};

	self.audioRecorder.onerror = function(e){
		console.log('Audio Capture Error: ', e);
		alert('Error: ' + e);
	};

	self.audioRecorder.onstart = function(){
		console.log('Started, state = ' + self.audioRecorder.state);

		self.recording = true;
		self.replaying = false;
	};

	self.audioRecorder.onstop = function(){
		console.log('Stopped, state = ' + audioRecorder.state);

		self.stop();

		if(self.cancelled)
			return;
	};

	self.audioRecorder.onwarning = function(e){
		console.log('Warning: ' + e);
	};

	var onPlayEnded = function(e) {
		video.onended = null;
		video.volume = 0;
	}
}

JanMediaCapture.prototype.supports = function() {
	return (!!navigator.getUserMedia);
}

JanMediaCapture.prototype.start = function() {
	var self = this;

	if(self.recording)
		self.stopRecord();
	self.record();
}

JanMediaCapture.prototype.record = function() {
	var self = this;

	if(!self.recording) {
		if(self.videoRecorder) {
			self.videoRecorder.start(3000);
		}
		if(self.audioRecorder) {
			self.audioRecorder.start(3000);
		}

		self.recording = true;
	}
}

JanMediaCapture.prototype.stopRecord = function() {
	var self = this;

	if(self.recording) {
		if(self.videoRecorder) {
			self.videoRecorder.stop();
		}
		if(self.audioRecorder) {
			self.audioRecorder.stop();
		}

		self.recording = false;
	}
}

JanMediaCapture.prototype.stop = function() {
	var self = this;

	var video = document.querySelector('#my-video');
	video.pause();
	video.src = null;
	video.srcObject = null;
	self.initialized = false;

	if(!self.videostream) return;
	var tracks = self.videostream.getTracks();
	if(tracks) return;

	for(var i=0; i<tracks.length; i++) {
		tracks[i].stop();
	}
}

