// Based on http://www.gwg.nga.mil/misb/docs/standards/ST0601.9.pdf

var int16 = function (v) {
  if(65535 < v | v < 0) throw new RangeError('int16() argument must be between 0 and 65535');
  return v - 65536 * (v >> 15);
}

var int32 = function (v) {
  if(4294967295 < v | v < 0) throw new RangeError('int32() argument must be between 0 and 4294967295');
  return v - 4294967296 * (v >>> 31);
}


module.exports = {

  1: {
    tag: 1,
    name: 'Checksum',
    units: 'None',
    format: 'uint16',
    length: 2,
    formula: function(v) {
      return v;
    }
  },

  2: {
    tag: 2,
    name: 'UNIX Time Stamp',
    units: 'Microseconds',
    format: 'uint64',
    length: 8,
    formula: function(v) {
      return parseInt(v,16);
    }
  },

  3: {
    tag: 3,
    name: 'Mission ID',
    units: 'String',
    format: 'ISO 646',
    length: 127,
    formula: function(v) {
      return new Buffer(v, 'hex').toString();
    }
  },

  4: {
    tag: 4,
    name: 'Platform Tail Number',
    units: 'String',
    format: 'ISO 646',
    formula: function(v) {
      return new Buffer(v, 'hex').toString();
    }
  },

  5: {
    tag: 5,
    name: 'Platform Heading Angle',
    units: 'Degrees',
    format: 'uint16',
    LS_range: 360,
    uint_range: 65535,
    formula: function(v) {
      return parseInt(v,16) * this.LS_range / this.uint_range;
    }
  },

  6: {
    tag: 6,
    name: 'Platform Pitch Angle',
    units: 'Degrees',
    format: 'int16',
    LS_range: 40,
    int_range: 65534,
    formula: function(v) {
      return int16(parseInt(v,16)) / this.int_range * this.LS_range; // -0.4315317239906003, have to be -0.4315251
    }
  },

  7: {
    tag: 7,
    name: 'Platform Roll Angle',
    units: 'Degrees',
    format: 'int16',
    LS_range: 100,
    int_range: 65534,
    formula: function(v) {
      return int16(parseInt(v,16)) * this.LS_range / this.int_range; // 3.4058656575212867, have to be 3.405814
    }
  },

  8: {
    tag: 8,
    name: 'Platform True Airspeed',
    units: 'Meters/Second',
    format: 'uint8',
    length: 1,
    formula: function(v) {
      return parseInt(v,16);
    }
  },

  9: {
    tag: 9,
    name: 'Platform Indicated Airspeed',
    units: 'Meters/Second',
    format: 'uint8',
    length: 1,
    formula: function(v) {
      return parseInt(v,16);
    }
  },

  10 :{
    tag: 10,
    name: 'Platform Designation',
    units: 'String',
    format: 'ISO 646',
    length: 127,
    formula: function(v) {
      return new Buffer(v, 'hex').toString();
    }
  },

  11: {
    tag: 11,
    name: 'Image Source Sensor',
    units: 'String',
    format: 'ISO 646',
    length: 127,
    formula: function(v) {
      return new Buffer(v, 'hex').toString();
    }
  },

  12: {
    tag: 12,
    name: 'Image Coordinate System',
    units: 'String',
    format: 'ISO 646',
    length: 127,
    formula: function(v) {
      return new Buffer(v, 'hex').toString();
    }
  },

  13: {
    tag: 13,
    name: 'Sensor Latitude',
    units: 'Degrees',
    format: 'int32',
    LS_range: 180,
    int_range: 4294967294,
    length: 4,
    formula: function(v) {
      return int32(parseInt(v,16)) * this.LS_range / this.int_range;
    }
  },

  14: {
    tag: 14,
    name: 'Sensor Longitude',
    units: 'Degrees',
    format: 'int32',
    LS_range: 360,
    int_range: 4294967294,
    length: 4,
    formula: function(v) {
      return int32(parseInt(v,16)) * this.LS_range / this.int_range;
    }
  },

  15: {
    tag: 15,
    name: 'Sensor True Altitude',
    units: 'Meters',
    format: 'uint16',
    LS_range: 19900,
    uint_range: 65535,
    Offset: 900,
    length: 2,
    formula: function(v) {
      return parseInt(v,16) * this.LS_range / this.uint_range - this.Offset;
    }
  },

  16: {
    tag: 16,
    name: 'Sensor Horizontal field of View',
    units: 'Degrees',
    format: 'uint16',
    LS_range: 180,
    uint_range: 65535,
    length: 2,
    formula: function(v) {
      return parseInt(v,16) * this.LS_range / this.uint_range;
    }
  },

  17: {
    tag: 17,
    name: 'Sensor Vertical Field of View',
    units: 'Degrees',
    format: 'uint16',
    LS_range: 180,
    uint_range: 65535,
    length: 2,
    formula: function(v) {
      return parseInt(v,16) * this.LS_range / this.uint_range;
    }
  },

  18: {
    tag: 18,
    name: 'Sensor Relative Azimuth Angle',
    units: 'Degrees',
    format: 'uint32',
    LS_range: 360,
    uint_range: 4294967295,
    length: 4,
    formula: function(v) {
      return parseInt(v,16) * this.LS_range / this.uint_range; // 160.71921143697557, have to be 160.719211474396.
    }
  },

  19: {
    tag: 19,
    name: 'Sensor Relative Elevation Angle',
    units: 'Degrees',
    format: 'int32',
    LS_range: 360,
    int_range: 4294967294,
    length: 4,
    formula: function(v) {
      return int32(parseInt(v,16)) * this.LS_range / this.int_range;
    }
  },

  20: {
    tag: 20,
    name: 'Sensor Relative Roll Angle',
    units: 'Degrees',
    format: 'uint32',
    LS_range: 360,
    uint_range: 4294967295,
    length: 4,
    formula: function(v) {
      return parseInt(v,16) * this.LS_range / this.uint_range; // 176.86543764939194, have to be 176.865437690572
    }
  },

  21: {
    tag: 21,
    name: 'Slant Range',
    units: 'Meters',
    format: 'uint32',
    LS_range: 5000000,
    uint_range: 4294967295,
    length: 4,
    formula: function(v) {
      return parseInt(v,16) * this.LS_range / this.uint_range;
    }
  },

  22: {
    tag: 22,
    name: 'Target Width',
    units: 'Meters',
    format: 'uint16',
    LS_range: 10000,
    uint_range: 65535,
    length: 2,
    formula: function(v) {
      return parseInt(v,16) * this.LS_range / this.uint_range;
    }
  },

  23: {
    tag: 23,
    name: 'Sensor Relative Roll Angle',
    units: 'Degrees',
    format: 'int32',
    LS_range: 180,
    int_range: 4294967294,
    length: 4,
    formula: function(v) {
      return int32(parseInt(v,16)) * this.LS_range / this.int_range;
    }
  },

  24: {
    tag: 24,
    name: 'Frame Center Longitude',
    units: 'Degrees',
    format: 'int32',
    LS_range: 360,
    int_range: 4294967294,
    length: 4,
    formula: function(v) {
      return int32(parseInt(v,16)) * this.LS_range / this.int_range;
    }
  },

  25: {
    tag: 25,
    name: 'Frame Center Elevation',
    units: 'Meters',
    format: 'uint16',
    LS_range: 19900,
    uint_range: 65535,
    Offset: 900,
    length: 2,
    formula: function(v) {
      return parseInt(v,16) * this.LS_range / this.uint_range - this.Offset;
    }
  },

  26: {
    tag: 26,
    name: 'Offset Corner Latitude Point',
    units: 'Degrees',
    format: 'int16',
    LS_range: 0.15,
    int_range: 65534,
    formula: function(v) {
      return int16(parseInt(v,16)) * this.LS_range / this.int_range;
    }
  },

  27: {
    tag: 27,
    name: 'Offset Corner Longitude Point 1',
    units: 'Degrees',
    format: 'int16',
    LS_range: 0.15,
    int_range: 65534,
    formula: function(v) {
      return int16(parseInt(v,16)) * this.LS_range / this.int_range;
    }
  },

  28: {
    tag: 28,
    name: 'Offset Corner Latitude Point 2',
    units: 'Degrees',
    format: 'int32',
    LS_range: 0.15,
    int_range: 65534,
    formula: function(v) {
      return int32(parseInt(v,16)) * this.LS_range / this.int_range; // -10.416177048319934, have to be -10.5661816260963
    }
  },

  29: {
    tag: 29,
    name: 'Offset Corner Longitude Point 2',
    units: 'Degrees',
    format: 'int16',
    LS_range: 0.15,
    int_range: 65534,
    formula: function(v) {
      return int16(parseInt(v,16)) * this.LS_range / this.int_range;
    }
  },

  30: {
    tag: 30,
    name: 'Offset Corner Latitude Point 3',
    units: 'Degrees',
    format: 'int16',
    LS_range: 0.15,
    int_range: 65534,
    formula: function(v) {
      return int16(parseInt(v,16)) * this.LS_range / this.int_range;
    }
  },

  31: {
    tag: 31,
    name: 'Offset Corner Longitude Point 3',
    units: 'Degrees',
    format: 'int16',
    LS_range: 0.15,
    int_range: 65534,
    formula: function(v) {
      return int16(parseInt(v,16)) * this.LS_range / this.int_range;
    }
  },

  32: {
    tag: 32,
    name: 'Offset Corner Latitude Point 4',
    units: 'Degrees',
    format: 'int16',
    LS_range: 0.15,
    int_range: 65534,
    formula: function(v) {
      return int16(parseInt(v,16)) * this.LS_range / this.int_range;
    }
  },

  33: {
    tag: 33,
    name: 'Offset Corner Longitude Point 4',
    units: 'Degrees',
    format: 'int16',
    LS_range: 0.15,
    int_range: 65534,
    formula: function(v) {
      return int16(parseInt(v,16)) * this.LS_range / this.int_range;
    }
  },

  34: {
    tag: 34,
    name: 'Icing Detected',
    units: 'Icing Code',
    format: 'uint8',
    LS_range: 0.15,
    uint_range: 65534,
    formula: function(v) {
      v = parseInt(v,16);
      switch (v) {
        case 0:
        v += ' Detector off';
        break;
        case 1:
        v += ' No icing Detected';
        break;
        case 2:
        v += ' Icing Detected';
        break;
        default:
        v += ' Invalid Icing Code';
      }
      return v;
    }
  },

  35: {
    tag: 35,
    name: 'Wind Direction',
    units: 'Degrees',
    format: 'uint16',
    LS_range: 360,
    uint_range: 65535,
    formula: function(v) {
      return parseInt(v,16) * this.LS_range / this.uint_range;
    }
  },

  36: {
    tag: 36,
    name: 'Wind Speed',
    units: 'Meters/Second',
    format: 'uint8',
    LS_range: 100,
    uint_range: 255,
    formula: function(v) {
      return parseInt(v,16) * this.LS_range / this.uint_range;
    }
  },

  37: {
    tag: 37,
    name: 'Static Pressure',
    units: 'Millibar',
    format: 'uint16',
    LS_range: 5000,
    uint_range: 65535,
    formula: function(v) {
      return parseInt(v,16) * this.LS_range / this.uint_range;
    }
  },

  38: {
    tag: 38,
    name: 'Density Altitude',
    units: 'Meters',
    format: 'uint16',
    LS_range: 19900,
    uint_range: 65535,
    Offset: 900,
    formula: function(v) {
      return parseInt(v,16) * this.LS_range / this.uint_range - this.Offset;
    }
  },

  39: {
    tag: 39,
    name: 'Outside Air Temperature',
    units: 'Celcius',
    format: 'int8',
    formula: function(v) {
      return parseInt(v,16);
    }
  },

  40: {
    tag: 40,
    name: 'Target Location Latitude',
    units: 'Degrees',
    format: 'int32',
    LS_range: 180,
    int_range: 4294967294,
    formula: function(v) {
      return int32(parseInt(v,16)) * this.LS_range / this.int_range;
    }
  },

  41: {
    tag: 41,
    name: 'Target Location Longitude',
    units: 'Degrees',
    format: 'int32',
    LS_range: 360,
    int_range: 4294967294,
    formula: function(v) {
      return int32(parseInt(v,16)) * this.LS_range / this.int_range;
    }
  },

  42: {
    tag: 42,
    name: 'Target Location Elevation',
    units: 'Meters',
    format: 'uint16',
    LS_range: 19900,
    uint_range: 65535,
    Offset: 900,
    formula: function(v) {
      return parseInt(v,16) * this.LS_range / this.uint_range - this.Offset;
    }
  },

  43: {
    tag: 43,
    name: 'Target Track Gate Width',
    units: 'Pixels',
    format: 'uint8',
    formula: function(v) {
      return parseInt(v,16) * 2; // in docs, need to round the result.
    }
  },

  44: {
    tag: 44,
    name: 'Target Track Gate Height',
    units: 'Pixels',
    format: 'uint8',
    formula: function(v) {
      return parseInt(v,16) * 2; // in docs, need to round the result.
    }
  },

  45: {
    tag: 45,
    name: 'Target Error Estimate - CE90',
    units: 'Meters',
    format: 'uint16',
    LS_range: 4095,
    uint_range: 65535,
    formula: function(v) {
      return parseInt(v,16) * this.LS_range / this.uint_range; // 425.2151522087434, have to be 425.319
    }
  },

  46: {
    tag: 46,
    name: 'Target Error Estimate - LE90',
    units: 'Meters',
    format: 'uint16',
    LS_range: 4095,
    uint_range: 65535,
    formula: function(v) {
      return parseInt(v,16) * this.LS_range / this.uint_range; // 608.9230945296406, have to be 609.0718
    }
  },

  47: {
    tag: 47,
    name: 'Generic Flag Data 01',
    units: 'None',
    format: 'uint8',
    formula: function(v) {
      return parseInt(v,16);
    }
  },

  48: {
    tag: 48,
    name: 'Security Local Metadata Set',
    units: 'None',
    format: 'Set',
    formula: function(v) {
                                                // ST0102 Local Set Security Metadata items within ST0601
    }
  },

  49: {
    tag: 50,
    name: 'Differential Pressure',
    units: 'Millibar',
    format: 'uint16',
    LS_range: 5000,
    uint_range: 65535,
    formula: function(v) {
      return parseInt(v,16) * this.LS_range / this.uint_range;
    }
  },

  50: {
    tag: 50,
    name: 'Platform Angle of Attack',
    units: 'Degrees',
    format: 'int16',
    LS_range: 40,
    int_range: 65534,
    formula: function(v) {
      return int16(parseInt(v,16)) * this.LS_range / this.int_range; // -8.670308542130803, have to be -8.670177
    }
  },

  51: {
    tag: 51,
    name: 'Platform Vertical Speed',
    units: 'Meters/Second',
    format: 'int16',
    LS_range: 360,
    int_range: 65534,
    formula: function(v) {
      return int16(parseInt(v,16)) * this.LS_range / this.int_range; // -61.88787499618519, have to be -61.88693
    }
  },

  52: {
    tag: 52,
    name: 'Platform Sideslip Angle',
    units: 'Degrees',
    format: 'int16',
    LS_range: 40,
    int_range: 65534,
    formula: function(v) {
      return int16(parseInt(v,16)) * this.LS_range / this.int_range; // -5.082552568132573, have to be -5.082475
    }
  },

  53: {
    tag: 53,
    name: 'Airfield Barometric Pressure',
    units: 'Millibar',
    format: 'uint16',
    LS_range: 5000,
    uint_range: 65535,
    formula: function(v) {
      return parseInt(v,16) * this.LS_range / this.uint_range;
    }
  },

  54: {
    tag: 54,
    name: 'Airfield Elevation',
    units: 'Meters',
    format: 'uint16',
    LS_range: 19900,
    uint_range: 65535,
    Offset: 900,
    formula: function(v) {
      return parseInt(v,16) * this.LS_range / this.uint_range - this.Offset;
    }
  },

  55: {
    tag: 55,
    name: 'Relative Humidity',
    units: 'Percent',
    format: 'uint8',
    LS_range: 100,
    uint_range: 255,
    formula: function(v) {
      return parseInt(v,16) * this.LS_range / this.uint_range; // 50.588235294117645, have to be 50.58823
    }
  },

  56: {
    tag: 56,
    name: 'Platform Ground Speed',
    units: 'Meters/Second',
    format: 'uint8',
    formula: function(v) {
      return parseInt(v,16);
    }
  },

  57: {
    tag: 57,
    name: 'Ground Range',
    units: 'Meters',
    format: 'uint32',
    LS_range: 5000000,
    uint_range: 4294967295,
    formula: function(v) {
      return parseInt(v,16) * this.LS_range / this.uint_range;
    }
  },

  58: {
    tag: 58,
    name: 'Platform Fuel Remaining',
    units: 'Kilogram',
    format: 'uint16',
    LS_range: 10000,
    uint_range: 65535,
    formula: function(v) {
      return parseInt(v,16) * this.LS_range / this.uint_range;
    }
  },

  59: {
    tag: 59,
    name: 'Platform Call Sign',
    units: 'String',
    format: 'ISO 646',
    formula: function(v) {
       return new Buffer(v, 'hex').toString();
   }
  },

  60: {
    tag: 60,
    name: 'Weapon Load',
    units: 'nibble',
    format: 'uint16',
    formula: function(v) {
      return parseInt(v,16);
    }
  },

  61: {
    tag: 61,
    name: 'Weapon Fired',
    units: 'nibble',
    format: 'uint8',
    formula: function(v) {
      return parseInt(v,16);
    }
  },

  62: {
    tag: 62,
    name: 'Laser PRF Code',
    units: 'None',
    format: 'uint16',
    formula: function(v) {
      return parseInt(v,16);
    }
  },

  63: {
    tag: 63,
    name: 'Sensor Field of View Name',
    units: 'List',
    format: 'uint8',
    formula: function(v) {
      return parseInt(v,16);
    }
  },

  64: {
    tag: 64,
    name: 'Platform Magnetic Heading',
    units: 'Degrees',
    format: 'uint16',
    LS_range: 360,
    uint_range: 65535,
    formula: function(v) {
      return parseInt(v,16) * this.LS_range / this.uint_range;
    }
  },

  65: {
    tag: 65,
    name: 'UAS LS Version Number',
    units: 'List',
    format: 'uint8',
    formula: function(v) {
      return parseInt(v,16);
    }
  },

  66: {
    tag: 66,
    name: 'Target Location Covariance Matrix',
    units: 'TBD',
    format: 'TBD',
    formula: function(v) {
                                  // not clear...
    }
  },

  67: {
    tag: 67,
    name: 'Alternate Platform Latitude',
    units: 'Degrees',
    format: 'int32',
    LS_range: 180,
    int_range: 4294967294,
    formula: function(v) {
      return int32(parseInt(v,16)) * this.LS_range / this.int_range;
    }
  },

  68: {
    tag: 68,
    name: 'Alternate Platform Longitude',
    units: 'Degrees',
    format: 'int32',
    LS_range: 360,
    int_range: 4294967294,
    formula: function(v) {
      return int32(parseInt(v,16)) * this.LS_range / this.int_range;
    }
  },

  69: {
    tag: 69,
    name: 'Alternate Platform Altitude',
    units: 'Meters',
    format: 'uint16',
    LS_range: 19900,
    uint_range: 65535,
    Offset: 900,
    formula: function(v) {
      return parseInt(v,16) * this.LS_range / this.uint_range - this.Offset;
    }
  },

  70: {
    tag: 70,
    name: 'Alternate Platform Name',
    units: 'String',
    format: 'ISO 646',
    formula: function(v) {
      return new Buffer(v, 'hex').toString();
    }
  },

  71: {
    tag: 71,
    name: 'Alternate Platform Heading',
    units: 'Degrees',
    format: 'uint16',
    LS_range: 360,
    uint_range: 65535,
    formula: function(v) {
      return parseInt(v,16) * this.LS_range / this.uint_range;
    }
  },

  72: {
    tag: 72,
    name: 'Event Start Time - UTC',
    units: 'Microseconds',
    format: 'uint64',
    formula: function(v) {
      return parseInt(v,16);
    }
  },

  73: {
    tag: 73,
    name: 'RVT Local Set',
    units: 'None',
    format: 'set',
    formula: function(v) {
                                              // include the ST0806 RVT Local Set metadata items within ST0601.
    }
  },

  74: {
    tag: 74,
    name: 'VMTI Data Set',
    units: 'None',
    format: 'set',
    formula: function(v) {
                                                // include the ST0903 VMTI Local Set metadata items within ST0601.
    }
  },

  75: {
    tag: 75,
    name: 'Sensor Ellipsoid Height',
    units: 'Meters',
    format: 'uint16',
    LS_range: 19900,
    uint_range: 65535,
    Offset: 900,
    formula: function(v) {
      return parseInt(v,16) * this.LS_range / this.uint_range - this.Offset;
    }
  },

  76: {
    tag: 76,
    name: 'Alternate Platform Ellipsoid Height',
    units: 'Meters',
    format: 'uint16',
    LS_range: 19900,
    uint_range: 65535,
    Offset: 900,
    formula: function(v) {
      return parseInt(v,16) * this.LS_range / this.uint_range - this.Offset;
    }
  },

  77: {
    tag: 77,
    name: 'Operational Mode',
    units: 'None',
    format: 'uint8',
    formula: function(v) {
      return parseInt(v,16);
    }
  },

  78: {
    tag: 78,
    name: 'Frame Center Height Above Ellipsoid',
    units: 'Meters',
    format: 'uint16',
    LS_range: 19900,
    uint_range: 65535,
    Offset: 900,
    formula: function(v) {
      return parseInt(v,16) * this.LS_range / this.uint_range - this.Offset;
    }
  },

  79: {
    tag: 79,
    name: 'Sensor North Velocity',
    units: 'Meters/Seconds',
    format: 'int16',
    LS_range: 654,
    int_range: 65534,
    formula: function(v) {
      return int16(parseInt(v,16)) * this.LS_range / this.int_range;
    }
  },

  80: {
    tag: 80,
    name: 'Sensor East Velocity',
    units: 'Meters/Seconds',
    format: 'int16',
    LS_range: 654,
    int_range: 65534,
    formula: function(v) {
      return int16(parseInt(v,16)) * this.LS_range / this.int_range;
    }
  },

  81: {
    tag: 81,
    name: 'Image Horizon Pixel Pack',
    units: 'Pack',
    format: 'Pack',
    formula: function(v) {
                                                // See Notes below.
    }
  },

  82: {
    tag: 82,
    name: 'Corner Latitude Point 1 (Full)',
    units: 'Degrees',
    format: 'int32',
    LS_range: 180,
    int_range: 4294967294,
    formula: function(v) {
      return int32(parseInt(v,16)) * this.LS_range / this.int_range; // -10.579638020405378, have to be -10.579637999887
    }
  },

  83: {
    tag: 83,
    name: 'Corner Longitude Point 1 (Full)',
    units: 'Degrees',
    format: 'int32',
    LS_range: 360,
    int_range: 4294967294,
    formula: function(v) {
      return int32(parseInt(v,16)) * this.LS_range / this.int_range; // 29.12736775778577, have to be 29.1273677986333
    }
  },

  84: {
    tag: 84,
    name: 'Corner Latitude Point 2 (Full)',
    units: 'Degrees',
    format: 'int32',
    LS_range: 180,
    int_range: 4294967294,
    formula: function(v) {
      return int32(parseInt(v,16)) * this.LS_range / this.int_range; // -10.56618162922849, have to be -10.5661816260963
    }
  },

  85: {
    tag: 85,
    name: 'Corner Longitude Point 2 (Full)',
    units: 'Degrees',
    format: 'int32',
    LS_range: 360,
    int_range: 4294967294,
    formula: function(v) {
      return int32(parseInt(v,16)) * this.LS_range / this.int_range; // 29.140824148962658, have to be 29.140824172424
    }
  },

  86: {
    tag: 86,
    name: 'Corner Latitude Point 3 (Full)',
    units: 'Degrees',
    format: 'int32',
    LS_range: 180,
    int_range: 4294967294,
    formula: function(v) {
      return int32(parseInt(v,16)) * this.LS_range / this.int_range; // -10.552727543074976, have to be -10.5527275411938
    }
  },

  87: {
    tag: 87,
    name: 'Corner Longitude Point 3 (Full)',
    units: 'Degrees',
    format: 'int32',
    LS_range: 360,
    int_range: 4294967294,
    formula: function(v) {
      return int32(parseInt(v,16)) * this.LS_range / this.int_range; // 29.15427827702569, have to be 29.1542782573265
    }
  },

  88: {
    tag: 88,
    name: 'Corner Latitude Point 4 (Full)',
    units: 'Degrees',
    format: 'int32',
    LS_range: 180,
    int_range: 4294967294,
    formula: function(v) {
      return int32(parseInt(v,16)) * this.LS_range / this.int_range; // -10.53927115189809, have to be -10.5392711674031
    }
  },

  89: {
    tag: 89,
    name: 'Corner Longitude Point 4 (Full)',
    units: 'Degrees',
    format: 'int32',
    LS_range: 360,
    int_range: 4294967294,
    formula: function(v) {
      return int32(parseInt(v,16)) * this.LS_range / this.int_range; // 29.167734668202574, have to be 29.1677346311172
    }
  },

  90: {
    tag: 90,
    name: 'Platform Pitch Angle (Full)',
    units: 'Degrees',
    format: 'int32',
    LS_range: 180,
    int_range: 4294967294,
    formula: function(v) {
      return int32(parseInt(v,16)) * this.LS_range / this.int_range; // 0.271599898241274, have to be -0.4315251
    }
  },

  91: {
    tag: 91,
    name: 'Platform Roll Angle (Full)',
    units: 'Degrees',
    format: 'int32',
    LS_range: 180,
    int_range: 4294967294,
    formula: function(v) {
      return int32(parseInt(v,16)) * this.LS_range / this.int_range;
    }
  },

  92: {
    tag: 92,
    name: 'Platform Angle of Attack (Full)',
    units: 'Degrees',
    format: 'int32',
    LS_range: 180,
    int_range: 4294967294,
    formula: function(v) {
      return int32(parseInt(v,16)) * this.LS_range / this.int_range;
    }
  },

  93: {
    tag: 93,
    name: 'Platform Sideslip Angle (Full)',
    units: 'Degrees',
    format: 'int32',
    LS_range: 360,
    int_range: 4294967294,
    formula: function(v) {
      return int32(parseInt(v,16)) * this.LS_range / this.int_range;
    }
  },

  94: {
    tag: 94,
    name: 'MIIS Core Identifier',
    units: 'None',
    format: 'Binary Value',
    LS_range: 180,
    int_range: 4294967294,
    formula: function(v) {
                                      // include the ST1204 MIIS Core Identifier Binary Value within ST0601.
    }
  },

  95: {
    tag: 95,
    name: 'SAR Motion Imagery Metadata',
    units: 'None',
    format: 'Set',
    LS_range: 180,
    int_range: 4294967294,
    formula: function(v) {
                                      // include the ST1206 SAR Motion Imagery Metadata Local Set data within ST0601.
    }
  },

  96: {
    tag: 96,
    name: 'Target Width Extended',
    units: 'Meters',
    format: 'IMAPB',
    LS_range: 180,
    int_range: 4294967294,
    formula: function(v) {
                                      // See MISB ST 1201
    }
  }
}