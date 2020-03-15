const fs = require('fs')
const path = require('path')
const xml = require('xmlbuilder')
const dir_tree = require("directory-tree");

class DashManifest {
    media_specs = {}

    constructor(streamId, stream_specs, config) {
        this.streamId = streamId
        this.stream_specs = stream_specs
        this.config = config
    }

    loadStream() {
        return new Promise((resolve, fail) => {
            var stream_path = path.join(this.config.data_path, this.streamId)

            var streamTypes = ['video', 'audio']
            streamTypes.forEach(streamType => {
                this.media_specs[streamType] = []

                var media_path = path.join(stream_path, streamType)
                const media_tree = dir_tree(media_path);
                if(!media_tree) return

                for(var i=0; i<media_tree.children.length; i++) {
                    var mime_dir = media_tree.children[i]
                    if(mime_dir.type != 'directory') continue

                    var mimetype = streamType + '/' + mime_dir.name
                    for(var j=0; j<mime_dir.children.length; j++) {
                        var content_dir = mime_dir.children[j]
                        var spec_str = content_dir.name
                        var specs = spec_str.split('-')

                        var content_files = content_dir.children.filter(f => {
                            if(f.type == 'file') return f;
                        });
                        var segments = content_files.map(f => parseInt(f.name.split('.')[0]))

                        if(content_files.length) {
                            var codec = content_files[0].name.substring(
                                content_files[0].name.indexOf('.') + 1);
                            var media_spec = {
                                mime_type: mimetype,
                                bitrate: specs[0],
                                codec: codec,
                                start_number: Math.max(...segments)
                            }
                            if(streamType == 'video') {
                                // widthxheight
                                var resolution = specs[1].split('x')
                                media_spec.width = resolution[0]
                                media_spec.height = resolution[1]
                                media_spec.fps = specs[2]
                            }
                            this.media_specs[streamType].push(media_spec)
                        }
                    }
                }
            })

            resolve()
        });
    }

    videoAdaptationSet(set_type, period) {
        var video_specs = this.media_specs.video
        if(!video_specs.length) return

        var bitrates = video_specs.map(spec => parseInt(spec.bitrate))
        var widths = video_specs.map(spec => parseInt(spec.width))
        var heights = video_specs.map(spec => parseInt(spec.height))
        console.log(bitrates)

        var set = period.ele('AdaptationSet')
        set.att({
            contentType: "video",
            lang: "en",
            minBandwidth: Math.min(...bitrates),
            maxBandwidth: Math.max(...bitrates),
            minWidth: Math.min(...widths),
            maxWidth: Math.max(...widths),
            minHeight: Math.min(...heights),
            maxHeight: Math.min(...heights),
            segmentAlignment: "true",
            mimeType: video_specs[0].mime_type,
            codecs: video_specs[0].codec,
            startWithSAP: "1"
        })

        video_specs.forEach(video_spec => {
            var rep_id = video_spec.bitrate + '-' + video_spec.width +
                'x' + video_spec.height + '-' + video_spec.fps;
            var seg = set.ele('SegmentTemplate', {
                 timescale: "1",
                 //duration: "200000",
                 startNumber: video_spec.start_number,
                 initialization: '/stream/' + this.streamId + "/" + video_spec.mime_type + "/$RepresentationID$/0." + video_spec.codec,
                 media: '/stream/' + this.streamId + "/" + video_spec.mime_type + "/$RepresentationID$/$Number$." + video_spec.codec
            })

            var seg = set.ele('Representation', {
                id: rep_id,
                mimeType: video_spec.mime_type,
                codecs: video_spec.codec,
                bandwidth: video_spec.bitrate,
                width: video_spec.width,
                height: video_spec.height,
                scanType: "progressive",
                frameRate: '' + video_spec.fps + '/1',
                startWithSAP: "1"
            })
        })
    }

    audioAdaptationSet(set_type, period) {
        var audio_specs = this.media_specs.audio
        if(!audio_specs.length) return

        var bitrates = audio_specs.map(spec => parseInt(spec.bitrate))

        var set = period.ele('AdaptationSet')
        set.att({
            contentType: "audio",
            lang: "en",
            minBandwidth: Math.min(...bitrates),
            maxBandwidth: Math.max(...bitrates),
            segmentAlignment: "true",
            mimeType: audio_specs[0].mime_type,
            codecs: audio_specs[0].codec
        })

        audio_specs.forEach(audio_spec => {
            set.ele('SegmentTemplate', {
                 timescale: "1",
                 startNumber: audio_spec.start_number,
                 initialization: '/stream/' + this.streamId + "/" + audio_spec.mime_type + "/$RepresentationID$/0." + audio_spec.codec,
                 media: '/stream/' + this.streamId + "/" + audio_spec.mime_type + "/$RepresentationID$/$Number$." + audio_spec.codec
            })

            var seg = set.ele('Representation', {
                id: '' + audio_spec.bitrate,
                mimeType: audio_spec.mime_type,
                codecs: audio_spec.codec,
                bandwidth: audio_spec.bitrate,
                startWithSAP: "1"
            })
        })
    }

    createMPD() {
        var root = xml.create('MPD',
            {version: '1.0', encoding: 'UTF-8', standalone: true}
        );
        root.att({
            'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
            'xsi:schemaLocation': 'urn:mpeg:dash:schema:mpd:2011 http://standards.iso.org/ittf/PubliclyAvailableStandards/MPEG-DASH_schema_files/DASH-MPD.xsd',
            type: 'static',
            minimumUpdatePeriod: "PT2.00S",
            timeShiftBufferDepth: "PT50.00S",
            minBufferTime: 'PT10S',
            profiles: 'urn:mpeg:dash:profile:isoff-live:2011'
        })
        var period = root.ele('Period')
        period.ele('BaseURL', {}, this.config.base_url + '/stream/' + this.streamId)
        period.att({
             id: "0",
             start: "PT0S"
        })

        this.videoAdaptationSet('video', period)
        this.audioAdaptationSet('audio', period)

        return root
    }

    render() {
        return new Promise((resolve, fail) => {
            this.loadStream().then(() => {
                let mpd = this.createMPD()
                resolve(mpd.end({ pretty: true }))
            })
            .catch(err => {
                fail(err)
            })
        })
    }
}

module.exports = DashManifest
