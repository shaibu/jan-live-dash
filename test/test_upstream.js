
var request = require('supertest');

describe('loading express', function () {
    var server;
    var test_stream_id = 'ABCD1234';

    beforeEach(function () {
        server = require('../server');
    });
    afterEach(function () {
        server.close();
    });
    it('upload video', function testVideoUpstream(done) {
        request(server)
            .post('/stream/' + test_stream_id + '/video/upload')
            .field('mime_type', 'video/webm')
            .field('codec', 'vp8')
            .field('width', 320)
            .field('height', 240)
            .field('bitrate', 250000)
            .field('fps', 29.97)
            .field('segment_id', 1)
            .attach('media', __dirname + '/files/test.webm')
            .expect(200)
            .end(function(err, res) {
                done(err);
            })
    });
    it('upload audio', function testVideoUpstream(done) {
        request(server)
            .post('/stream/' + test_stream_id + '/audio/upload')
            .field('mime_type', 'audio/webm')
            .field('codec', 'opus')
            .field('bitrate', 128000)
            .field('segment_id', 1)
            .attach('media', __dirname + '/files/test.webm')
            .expect(200)
            .end(function(err, res) {
                done(err);
            })
    });
});
