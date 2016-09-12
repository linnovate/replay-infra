var xml2js = require('xml2js');
var Promise = require('bluebird');
var http = require('http');

isUserAuthorized('System 1', 2, 'user').then(function(isauthorized){console.log('the result is ' + isauthorized)});

function getUserPermissions(userCode, success){
	var options = {
  	host: process.env.COMPARTMENT_HOST, //
  	port: process.env.COMPARTMENT_PORT, //
  	path: '/compartment/getCompartment',
  	method: 'GET'
	};

	http.request(options, function(res) {
  	res.setEncoding('utf8');
  	var responseString = '';

    res.on('data', function(data) {
      responseString += data;
    });

    res.on('end', function() {
      success(responseString);
    });
	}).end();
}

function parseXml(data, success) {
	var parser = new xml2js.Parser();
	parser.parseString(data, function (err, result) {
    	var permissions = result.permissions.allow[0].userPermission;
    	success(permissions);
    });
}

function isUserAuthorized(trid, level, userCode) {
	var parser = new xml2js.Parser();
    return new Promise(function(resolve){ getUserPermissions(userCode,function(permissionsXml){
    	parseXml(permissionsXml, function(permissions) {
    	for (i = 0; i < permissions.length; i++) {
    		if (trid === permissions[i].id[0] && level <= parseInt(permissions[i].level[0])) {
    			console.log('return true');
    			return Promise.resolve(true);
    			break;
    		}
    		else if(i === permissions.length - 1) {
    			console.log('return false');
				return Promise.resolve(false);
				break;
    		}
		}
		});
	})
});
}
