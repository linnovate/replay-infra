

var stanag4609 = require('./standards/4609');


/**
  * @param data, data String to be parsed.
  *
  */
var formatting = function(value, units) {

  var text;

  switch (units) {
    case 'Degrees':
      text = value.toFixed(2) + '°';
    break;
    case 'Celcius':
      text = value + '°';
    break;
    case 'Kilogram':
      text = value.toFixed(2) + ' kg';
    break;
    case 'Microseconds':
      text = new Date(value/1000).toISOString();
    break;
    case 'Millibar':
      text = value.toFixed(2) + ' mb';
    break;
    case 'Meters':
      text = value.toFixed(2) + ' m';
    break;
    case 'Meters/Second':
      text = value.toFixed(2) + ' M/s';
    break;
    case 'Percent':
      text = value.toFixed(2) + '%';
    break;
    case 'Pixels':
      text = value + ' px';
    break;
    default:
      text = value;
    break;
  }

  return text;
}



var tlv = function(data) {

  var result = new Object();
  var i = 0;

  while (i < data.length) {

    var name, units;
    var tag = parseInt(data.slice(i,i+2),16);
    var length = parseInt(data.slice(i+2,i+4),16);
    var value = data.slice(i+4, i+4+length * 2);

    value = stanag4609[tag].formula(value);
    name = stanag4609[tag].name;
    units = stanag4609[tag].units;


    // format raw value

    var formatted = formatting(value, units)
    value.formatted = formatted;


    result[tag] = {
      tag: tag,
      length: length,
      name: name,
      units: units,
      value: value,
      formatted: formatted
    };

    i += 4 + length * 2;

  }



  // some Values of Tags (26-33) are depended on other Tags' values, so we can add it only after all Tags are parsed.

  var keys = Object.keys(result);
  keys = keys.slice(keys.indexOf('26'), keys.indexOf('33')+1)
  keys.forEach(function(key){
    result[key].value += result[23 + key%2].value;
    result[key].formatted = formatting(result[key].value, result[key].units);
  })

  return result;

}





var checksum = function(data, checksum) {

  data = data.slice(0, data.lastIndexOf('0102' + checksum) + 4);
  data += data & 2;

  var sum = 0;

  for (var i=0; i<data.length; i+=4) {
    sum += parseInt(data.slice(i,i+4),16);
  }

  sum = sum.toString(16).slice(-4)

  if(sum === checksum) {
    return 'correct';
  } else {
    return 'incorrect, sum is: ' + sum;
  }

}





/**
  * @param buffer, Buffer array to be parsed.
  * @param format, format of returned output.
  *
  */

var klv = function(buffer, format) {


  // validate format parameter;

  var format = format || 'tag';
  var validFormats = ['name','tag'];
  if(!validFormats.some(function(v){return v == format})) {
    throw new Error('Invalid format: "' + format + '". Valid formats are: ' + validFormats.join(', '));
  }


  // treating the buffer as a string, where each 2 characters represent 1 byte.
  // read each Tag byte, Length byte, and Value bytes, parse Value and asign to 'result'.

  var data = buffer.toString('hex');
  var result = new Array();
  var keyLength = 16;
  var pointer = 0;

  while (pointer < data.length) {


    // used later. to count whole packet's length, including key.

    var start = pointer;


    // asign the key, and increase pointer value respectively.

    var key = data.slice(pointer ,pointer + keyLength * 2);
    pointer += keyLength * 2;


    // asign the length, and increase pointer value respectively.

    var length = parseInt(data.slice(pointer, pointer + 2), 16);
    pointer += 2;


    // BER decoding for 'length'.
    // if the high bit is set (value is then > 127), then the rest bits
    // represents the number of bytes that represents the length's value.

    if (length > 127) {
      pointer += (length & 127) * 2;
      length = parseInt(data.slice(pointer - (length & 127) * 2, pointer), 16);
    }


    // asign the value, and increase pointer value respectively.

    var value = data.slice(pointer, pointer + length * 2);
    value = tlv(value);
    pointer += length * 2;


    // asign all properties to result object.

    result.push({
      key: key,
      length: length,
      value: value
    });

    
    // check file length. original length is supllied in value[1].

    if(value[1]) {
      result[result.length - 1].checksum = checksum(data.slice(start,pointer), value[1].value)
    }

  }




  // formatting the output.

  switch (format) {
    case 'name':
    for(var i=0; i<result.length; i++) {
      var packet = result[i].value;
      for (tag in packet) {
        var name = packet[tag].name;
        name = name.toLowerCase();
        name = name.replace(/(\s)(\w)/g, function(match, p1, p2){return p2.toUpperCase()})
        result[i].value[name] = packet[tag];
        delete result[i].value[tag];
      }
    }
    break;
    case 'tag':
    case undefined:
    default:
      result = result;
    break;
  }


  return result;

}



module.exports = klv;