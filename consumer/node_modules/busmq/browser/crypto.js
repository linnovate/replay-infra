
module.exports = {
  randomBytes: function(size) {
    size = size * 2;
    var array = new Uint8Array(size);
    window.crypto.getRandomValues(array);

    array.toString = function(enc) {
      if (enc === 'hex') {
        var result = [];
        for (var i = 0; i < array.length; i++) {
          result.push(array[i].toString(16));
        }
        return result.join('').substr(0, size);
      } else {
        return array.toString(enc);
      }
    };

    return array;
  }
};
