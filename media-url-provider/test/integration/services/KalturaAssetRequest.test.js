var assert = require('chai').assert,
	nock = require('nock'),
	parser = require('xml2json');
// sinon = require('sinon'),
// request = require('supertest');

var kalturaAssetRequest = require('../../../api/services/KalturaAssetRequest.js')();

const MANIFEST_SUFFIX = '/manifest.mpd';

function test() {
	describe('Kaltura asset service testing', function() {
		describe('Exported methods testing', exportedMethodsTesting);
	});
}

function exportedMethodsTesting() {
	describe('Method: getMpd', function() {
		getMpdInputTests();
		getMpdNormalBehavior();
	});
}

test();

function getMpdInputTests() {
	describe('inputTesting', function() {
		describe('undefined entryId specified', function() {
			it('should return reject', function(done) {
				kalturaAssetRequest.getMpd(undefined)
					.then(function() {
						assert.fail(undefined, undefined, 'should have rejected');
						done();
					})
					.catch(function(err) {
						done();
					});
			});
		});
	});
}

function getMpdNormalBehavior() {
	describe('Normal behavior tests', function() {
		describe('testing manifest url return', function() {
			var entryId = '0_noi1pzr6_0';
			beforeEach(function() {
				var server = sails.config.settings.services.kaltura.server,
					port = sails.config.settings.services.kaltura.port,
					partnerId = '/p/' + sails.config.settings.services.kaltura.partnerId + '/sp/0',
					Manifest = '/playManifest/entryId/',
					format = '/format/mpegdash/protocol/http/flavorParamId/1',
					baseurl = server + ':' + port,
					requestParams = partnerId + Manifest + entryId + format,
					kalturaApiMock = nock(baseurl)
					.defaultReplyHeaders({
						'Content-Type': 'application/xml'
					})
					.get(requestParams)
					.reply(200, parser.toXml({
						manifest: {
							media: [{ url: 'http://vod.linnovate.net:1935/weplay/_definst_/kaltura_content/20160627/0/0_noi1pzr6_0_7azp5yfe_2.mp4' }, {}]
						}
					}));
			});
			it('should return valid manifest url', function(done) {
				kalturaAssetRequest.getMpd(entryId)
					.then(function(url) {
						assert.include(url, MANIFEST_SUFFIX);
						assert.include(url, entryId);
						done();
					})
					.catch(function(err) {
						assert.fail(undefined, undefined, err + 'should have resolved');
						done();
					});
			});
		});
	});
}
