var path = require('path')
var fs = require('fs')

const DashManifest = require('./manifest')

class DashServer {
    stream_map = {}

    constructor(app, config) {
        this.app = app
        this.config = config
        // Get real path
        this.config.data_path = path.resolve(this.config.data_path)

        this.init()
    }

    storeMediaFile(data, file_path) {
        return new Promise(function(resolve, reject) {
            fs.writeFile(file_path, data, function(err) {
               if (err) reject(err);
               else resolve(data);
            });
        })
    }

    waitForFile(file_path, callback, wait) {
        fs.access(file_path, fs.F_OK, (err) => {
            if(err) {
                wait -= 100
                if(wait <= 0) return callback(false)

                return setTimeout(() => {
                    return this.waitForFile(file_path, callback, wait)
                }, 100)
            }
            callback(true)
        })
    }

    init() {
        this.app.get('/stream/:streamId/dash.mpd', (req, res) => {
            var stream_info = {}
            const mpd = new DashManifest(req.params.streamId, stream_info, this.config)

            mpd.render().then(xml => {
                res.set('Content-Type', 'text/xml')
                res.send(xml);
            })
        });

        this.app.get('/stream/:streamId/:streamType/:mimeType/:specId/:segmentId.:format', (req, res) => {
            var dest_dir = path.join(this.config.data_path, req.params.streamId,
                req.params.streamType, req.params.mimeType, req.params.specId)
            var file_path = path.join(dest_dir,
                req.params.segmentId + '.' + req.params.format)

            this.waitForFile(file_path, found => {
                if(found) res.sendFile(file_path)
                else res.status(404).send({result: false, message: 'File not found'})
            }, 30000)
        });

        this.app.post('/stream/:streamId/:streamType/upload', (req, res) => {
            if(!req.files || !req.files.media) {
                return res.status(400).send({result: 'Error', message: 'No data found'})
            }

            var streamType = req.params.streamType
            var streamId = req.params.streamId
            var data = req.body
            if(!data.mime_type || !data.segment_id || !data.bitrate || !data.codec) {
                return res.status(400).send({result: 'Error', message: 'Missing required fields'})
            }

            var dest_dir = path.join(this.config.data_path, streamId, data.mime_type)
            if(streamType == 'video') {
                if(!data.width || !data.height || !data.fps) {
                    return res.status(400).send({result: 'Error', message: 'Missing width & height fields'})
                }
                dest_dir = path.join(dest_dir, data.bitrate + '-' + data.width + 'x' + data.height + '-' + data.fps)
            } else {
                dest_dir = path.join(dest_dir, data.bitrate)
            }
            var file_path = path.join(dest_dir, data.segment_id + '.' + data.codec)
            console.log(file_path)

            var media_file = req.files.media;
            media_file.mv(file_path, function(err) {
                if (err) {
                    console.log(err)
                    if(err.code === 'ENOENT') {
                        // Create the directory
                        fs.mkdirSync(dest_dir, { recursive: true });

                        // and try again
                        media_file.mv(file_path, function(err) {
                            if (err) {
                                console.log(err)
                                return res.status(500).send(err)
                            }
                            res.send({result: true});
                        })
                    } else {
                        res.status(500).send(err)
                    }
                } else {
                    res.send({result: true});
                }
            });
        });
    }
}

module.exports = DashServer
