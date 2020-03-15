
function Conference(opts) {
	var self = this;

	self.opts = opts;
	self.audio_chunks = [];
	self.video_chunks = [];
	self.audio_segment_id = 0;
	self.video_segment_id = 0;
	self.streamId = null;

	window.vidSrc = new JanMediaCapture({
		onMediaData: function(blob_data, type) {
			// Audio and video are uploaded in parallel
			if(type == 'video') {
				self.video_chunks.push(blob_data);
				self.uploadVideo();
			} else {
				self.audio_chunks.push(blob_data);
				self.uploadAudio();
			}
		}
	});

	vidSrc.init(function() {
		console.log('video inited');
	});

	$('#start-conf-btn').click(function(e) {
		e.preventDefault();
		console.log('Streaming video to server');

		$('#start-conf-btn').hide();
		$('.conf-started').removeClass('d-none');

		self.initUpstream();
	});

	$('#add-stream-btn').click(function(e) {
		e.preventDefault();

		self.addRemoteStream();
	});
}

Conference.prototype.addRemoteStream = function() {
	var self = this;

	var streamId = $('#remote-stream-id').val();
	if(streamId.length != 8) {
		alert('Enter valid stream id');
		return;
	}
	var dash_url = '/stream/' + streamId + '/dash.mpd';

	var player = videojs('dash_video_1');
	player.ready(function() {
		player.src({
			src: dash_url,
			type: 'application/dash+xml'
		});
		player.play();
	});
}

Conference.prototype.initUpstream = function() {
	var self = this;

	$('#local-stream-id').val(self.getStreamId());

	vidSrc.start();
}

Conference.prototype.getStreamId = function() {
	var self = this;

	if(self.streamId) return self.streamId;

	var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    self.streamId = '';
    for (var i = 8; i > 0; --i) {
    	self.streamId += chars[Math.floor(Math.random() * chars.length)];
    }
    return self.streamId;
}

Conference.prototype.upload_stream = function(blob_data, type, segment_id, callback) {
	var self = this;

	var media_specs = vidSrc.media_specs[type];

	var fd = new FormData();
	fd.append('media', blob_data, type);
	$.each(media_specs, function(key, value) {
		fd.append(key, value);
	});
	fd.append('segment_id', segment_id);

	var url = '/stream/' +  self.getStreamId() + '/' + type + '/upload';
	$.ajax({
		type: 'POST',
		url: url,
		data: fd,
		processData: false,
		contentType: false
	}).done(function(data) {
		console.log(data);
		callback(true);
	}).fail(function(err) {
		console.log(err.statusText || 'Could not connect');
		callback(false);
	});
}

Conference.prototype.uploadVideo = function() {
	var self = this;
	if(self.video_uploading) {
		return;
	}

	function upstream() {
		if(!self.video_chunks.length) return;

		self.video_uploading = true;

		var blob_data = self.video_chunks.shift();
		self.upload_stream(blob_data, 'video', self.video_segment_id, function(res) {
			self.video_segment_id++;
			self.video_uploading = false;
			upstream();
		});
	}

	upstream();
}

Conference.prototype.uploadAudio = function() {
	var self = this;
	if(self.audio_uploading) {
		return;
	}

	function upstream() {
		if(!self.audio_chunks.length) return;

		self.audio_uploading = true;

		var blob_data = self.audio_chunks.shift();
		self.upload_stream(blob_data, 'audio', self.audio_segment_id, function(res) {
			self.audio_uploading = false;
			self.audio_segment_id++;
			upstream();
		});
	}

	upstream();
}

$(function() {
	new Conference();
});
