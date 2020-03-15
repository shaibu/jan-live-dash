
var request = require('supertest');

describe('loading express', function () {
    var server;
    var test_stream_id = 'IWLAZ2OA';

    beforeEach(function () {
        server = require('../server');
    });
    afterEach(function () {
        server.close();
    });
    it('get mpd', function testVideoUpstream(done) {
        request(server)
            .get('/stream/' + test_stream_id + '/dash.mpd')
            .expect(200)
            .end(function(err, res) {
                console.log(res.text)
                done(err);
            })
    });
});
