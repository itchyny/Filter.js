importScripts('Filter.js');

onmessage = function(e) {
  var image = e.data.image;
  var ans = e.data.ans;
  var type = e.data.type;
  var arg = typeof (e.data.variable) !== 'undefined'
          ? Filter[e.data.name].arg(e.data.variable)
          : Filter[e.data.name].arg;
  var offset = 0;
  var rgb = [];
  var height = image.height;
  var width = image.width;
  if (type === 'each') {
    for (var i = 0; i < height; i++) {
      for (var j = 0; j < width; j++) {
        // offset = (i * width + j) * 4;
        rgb = arg(image.data[offset], image.data[offset + 1], image.data[offset + 2]);
        ans.data[offset++] = rgb[0];
        ans.data[offset++] = rgb[1];
        ans.data[offset++] = rgb[2];
        ans.data[offset] = image.data[offset++];
      }
    }
  } else if (type === 'kernel') {
    var arglen = arg.length;
    var halfsize = parseInt(arg.length / 2);
    var width4 = width * 4;
    var offset = 0, dataoffset = 0;
    for (var i = 0; i < height; i++) {
      var kmax = Math.min(arglen, height + halfsize - i);
      var kmin = Math.max(0, halfsize - i);
      for (var j = 0; j < width; j++) {
        var r = 0, g = 0, b = 0;
        var lmax = Math.min(arglen, width + halfsize - j);
        var lmin = Math.max(0, halfsize - j);
        var kdiff = width4 + (lmin - lmax) * 4;
        var argkl, k, l;
        dataoffset = ((i + kmin - halfsize) * width + j + lmin - halfsize) * 4;
        for (k = kmin; k < kmax; k++, dataoffset += kdiff) {
          for (l = lmin; l < lmax; l++, dataoffset++) {
            dataoffset = ((i + (k - halfsize)) * width + j + (l - halfsize)) * 4;
            argkl = arg[k][l];
            r += argkl * image.data[dataoffset++];
            g += argkl * image.data[dataoffset++];
            b += argkl * image.data[dataoffset++];
          }
        }
        ans.data[offset++] = r;
        ans.data[offset++] = g;
        ans.data[offset++] = b;
        ans.data[offset] = image.data[offset++];
      }
    }
  }
  postMessage(ans);
};
onerror = function(e) {
  postMessage('');
};


