var xml2js = require('xml2js'),
    _ = require('lodash'),
    VideoMetadata = require('replay-schemas/VideoMetadata');

// parses the raw data from the metadata file into metadataVideo objects
// params is a json of:
// sourceId (must)
// videoId (optional)
// methods (must)

module.exports.parse = function(data, params) {
    var result = [];

    var delimiter = '</VIMSMessage>';

    var xmls = data.split(delimiter);
    // pop last item since it's the delimiter itself
    xmls.pop();

    xmls.forEach(function(xmlString) {
        if (xmlString) {

            xmlString += delimiter;

            // parse xmlString while:
            // do not make an array for each child
            // remove root element
            // ignore attributes
            xml2js.parseString(xmlString, {
            	explicitArray: false,
            	explicitRoot: false,
            	ignoreAttrs: true
            }, function(err, xmlObj) {
                if (err)
                	throw err;
                else if (xmlObj)
                    result.push(xmlObj);
            });
        }
    });

    return metadataObjectsToVideoMetadata(result, params);
}

function metadataObjectsToVideoMetadata(metadatas, params){
    return _.map(metadatas, function(metadata){
        return new VideoMetadata({
            sourceId: params.sourceId,
            videoId: params.videoId,
            receivingMethod: params.method,
            data: metadata
        });
    });
}
