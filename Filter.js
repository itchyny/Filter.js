(function(global) {

  if (global.Filter) return;

  function formatnumber(num) {
    return Math.round(num * 10000) / 10000;
  }

  function format(arr) {
    var newarr = [];
    for (var i = 0; i < arr.length; i++) {
      newarr[i] = formatnumber(arr[i]);
    }
    return newarr;
  }

  function Filter(type, arg) {
    this.arg = arg;
    this.type = 'each';
    this.filter = Filter.filter.each;
    this.filterLazy = Filter.filterLazy.each;
    if (type === 'color') {
      this.arg = function(r, g, b) {
        return [ r * arg[0], g * arg[1], b * arg[2] ];
      };
      this.description = "r' = " + (arg[0] ? ((arg[0] === 1 ? '' : (arg[0] + ' * ')) + 'r') : '0') + ',\n' +
                         "g' = " + (arg[1] ? ((arg[1] === 1 ? '' : (arg[1] + ' * ')) + 'g') : '0') + ',\n' +
                         "b' = " + (arg[2] ? ((arg[2] === 1 ? '' : (arg[2] + ' * ')) + 'b') : '0');
    } else if (type === 'gray') {
      this.arg = function(r, g, b) {
        var w = r * arg[0] + g * arg[1] + b * arg[2];
        return [ w, w, w ];
      };
      this.description = "w' = " + arg[0] + ' * r' + ' + ' +
                                   arg[1] + ' * g' + ' + ' +
                                   arg[2] + ' * b,\n' +
                         "r' = g' = b' = w'";
    } else if (type === 'matrix') {
      this.arg = function(r, g, b) {
        var rr = r * arg[0][0] + g * arg[0][1] + b * arg[0][2];
        var gg = r * arg[1][0] + g * arg[1][1] + b * arg[1][2];
        var bb = r * arg[2][0] + g * arg[2][1] + b * arg[2][2];
        return [ rr, gg, bb ];
      };
      this.description = 'matrix:\n' + '[[' + format(arg[0]).toString() + '],\n' +
                                      ' [' + format(arg[1]).toString() + '],\n' +
                                      ' [' + format(arg[2]).toString() + ']] ';
    } else if (type === 'kernel') {
      this.type = 'kernel';
      this.filter = Filter.filter[type];
      this.filterLazy = Filter.filterLazy[type];
      var s = 'kernel:\n['
      for (var i = 0; i < arg.length; i++) {
        s += '[' + format(arg[i]).toString() + '],\n ';
      }
      s = s.slice(0, s.length - 3) + ']';
      this.description = s;
    } else if (type === 'translate') {
      this.type = 'translate';
      this.filter = Filter.filter[type];
      this.filterLazy = Filter.filterLazy[type];
    }
  }

  Filter.option = {};

  Filter.option.LAZY_WEIGHT = 9000;

  Filter.option.LAZY_WAIT_MSEC = 1;

  // NTSC gray scale (Reference: http://en.wikipedia.org/wiki/Grayscale)
  Filter.option.luminance = [ 0.298912, 0.586611, 0.114478 ];
  Filter.option.luminanceFn = function(r, g, b) {
    var l = Filter.option.luminance;
    return r * l[0] + g * l[1] + b * l[2];
  };

  // ATSC
  Filter.option.luminance2 = [ 0.2126, 0.7152, 0.0722 ];
  Filter.option.luminance2Fn = function(r, g, b) {
    var l = Filter.option.luminance2;
    return r * l[0] + g * l[1] + b * l[2];
  };

  Filter.filter = {};

  Filter.filter.each = function(image) {
    var cvs = document.createElement('canvas');
    cvs.width = image.width;
    cvs.height = image.height;
    var ctx = cvs.getContext('2d');
    var ans = ctx.createImageData(cvs.width, cvs.height);
    ans.data = new Uint8ClampedArray(ans.width * ans.height * 4);
    var offset = 0;
    var arg = this.arg;
    var height = image.height;
    var width = image.width;
    var rgb;
    for (var i = 0; i < height; i++) {
      for (var j = 0; j < width; j++) {
        rgb = arg(image.data[offset], image.data[offset + 1], image.data[offset + 2]);
        ans.data[offset++] = rgb[0];
        ans.data[offset++] = rgb[1];
        ans.data[offset++] = rgb[2];
        ans.data[offset] = image.data[offset++];
      }
    }
    return ans;
  };

  Filter.filter.translate = function(image) {
    var cvs = document.createElement('canvas');
    cvs.width = image.width;
    cvs.height = image.height;
    var ctx = cvs.getContext('2d');
    var ans = ctx.createImageData(cvs.width, cvs.height);
    ans.data = new Uint8ClampedArray(ans.width * ans.height * 4);
    var offset = 0;
    var dataoffset = 0;
    var arg = this.arg;
    var height = image.height;
    var width = image.width;
    for (var i = 0; i < height; i++) {
      for (var j = 0; j < width; j++) {
        var xy = arg(j, i, width, height);
        dataoffset = (xy[1] * width + xy[0]) * 4;
        ans.data[offset++] = image.data[dataoffset++];
        ans.data[offset++] = image.data[dataoffset++];
        ans.data[offset++] = image.data[dataoffset++];
        ans.data[offset++] = image.data[dataoffset++];
      }
    }
    return ans;
  };

  Filter.filter.kernel = function(image) {
    var cvs = document.createElement('canvas');
    cvs.width = image.width;
    cvs.height = image.height;
    var ctx = cvs.getContext('2d');
    var ans = ctx.createImageData(cvs.width, cvs.height);
    ans.data = new Uint8ClampedArray(ans.width * ans.height * 4);
    var offset = 0, dataoffset = 0;
    var arg = this.arg;
    var arglen = arg.length;
    var halfsize = parseInt(arg.length / 2);
    var height = image.height;
    var width = image.width;
    var width4 = width * 4;
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
          for (l = lmin; l < lmax; l++) {
            // dataoffset = ((i + (k - halfsize)) * width + j + (l - halfsize)) * 4;
            argkl = arg[k][l];
            r += argkl * image.data[dataoffset++];
            g += argkl * image.data[dataoffset++];
            b += argkl * image.data[dataoffset++];
          }
        }
        ans.data[offset++] = r;
        ans.data[offset++] = g;
        ans.data[offset++] = b;
        ans.data[offset++] = image.data[dataoffset++];
      }
    }
    return ans;
  };

  Filter.filter.kernel = function(image) {
    var cvs = document.createElement('canvas');
    cvs.width = image.width;
    cvs.height = image.height;
    var ctx = cvs.getContext('2d');
    var ans = ctx.createImageData(cvs.width, cvs.height);
    ans.data = new Uint8ClampedArray(ans.width * ans.height * 4);
    var offset = 0, dataoffset = 0;
    var arg = this.arg;
    var halfsize = parseInt(arg.length / 2);
    var restsize = arg.length - halfsize;
    var height = image.height;
    var width = image.width;
    for (var i = 0; i < height; i++) {
      for (var j = 0; j < width; j++) {
        var r = 0, g = 0, b = 0;
        var kmax = Math.min(i + restsize, height) - i;
        var lmax = Math.min(j + restsize, width) - j;
        for (var k = Math.max(i - halfsize, 0) - i; k < kmax; k++) {
          for (var l = Math.max(j - halfsize, 0) - j; l < lmax; l++) {
            dataoffset = ((i + k) * width + j + l) * 4;
            r += arg[k + halfsize][l + halfsize] * image.data[dataoffset++];
            g += arg[k + halfsize][l + halfsize] * image.data[dataoffset++];
            b += arg[k + halfsize][l + halfsize] * image.data[dataoffset++];
          }
        }
        ans.data[offset++] = r;
        ans.data[offset++] = g;
        ans.data[offset++] = b;
        ans.data[offset] = image.data[offset++];
      }
    }
    return ans;
  };

  Filter.filterLazy = {};

  Filter.filterLazy.each = function(image, callback) {
    var cvs = document.createElement('canvas');
    cvs.width = image.width;
    cvs.height = image.height;
    var ctx = cvs.getContext('2d');
    var ans = ctx.createImageData(cvs.width, cvs.height);
    ans.data = new Uint8ClampedArray(ans.width * ans.height * 4);
    if (typeof Worker === 'undefined') {
      var arg = this.arg;
      var offset = 0;
      var icounter = parseInt(Filter.option.LAZY_WEIGHT / image.width) + 1;
      var rgb;
      var go = function(i) {
        var irest = icounter;
        var height = image.height;
        var width = image.width;
        for (; i < height && irest; i++, irest--) {
          for (var j = 0; j < width; j++) {
            // offset = (i * image.width + j) * 4;
            rgb = arg(image.data[offset], image.data[offset + 1], image.data[offset + 2]);
            ans.data[offset++] = rgb[0];
            ans.data[offset++] = rgb[1];
            ans.data[offset++] = rgb[2];
            ans.data[offset] = image.data[offset++];
          }
        }
        if (i >= height) {
          callback(ans);
        } else {
          setTimeout (function() {
            go(i);
          }, Filter.option.LAZY_WAIT_MSEC);
        }
      };
      go(0);
    } else {
      var worker = new Worker('worker.js');
      worker.onmessage = function(e) {
        callback(e.data);
      };
      worker.postMessage({ image: image, ans: ans, name: this.name, type: this.type, variable: this.variable });
    }
  };

  Filter.filterLazy.translate = function(image, callback) {
    var cvs = document.createElement('canvas');
    cvs.width = image.width;
    cvs.height = image.height;
    var ctx = cvs.getContext('2d');
    var ans = ctx.createImageData(cvs.width, cvs.height);
    ans.data = new Uint8ClampedArray(ans.width * ans.height * 4);
    var icounter = parseInt(Filter.option.LAZY_WEIGHT / image.width) + 1;
    var offset = 0;
    var dataoffset = 0;
    var arg = this.arg;
    var height = image.height;
    var width = image.width;
    var go = function(i) {
      var irest = icounter;
      for (; i < height && irest; i++, irest--) {
        for (var j = 0; j < width; j++) {
          var xy = arg(j, i, width, height);
          dataoffset = (xy[1] * width + xy[0]) * 4;
          ans.data[offset++] = image.data[dataoffset++];
          ans.data[offset++] = image.data[dataoffset++];
          ans.data[offset++] = image.data[dataoffset++];
          ans.data[offset++] = image.data[dataoffset++];
        }
      }
      if (i >= height) {
        callback(ans);
      } else {
        setTimeout (function() {
          go(i);
        }, Filter.option.LAZY_WAIT_MSEC);
      }
    };
    go(0);
  };

  Filter.filterLazy.kernel = function(image, callback) {
    var cvs = document.createElement('canvas');
    cvs.width = image.width;
    cvs.height = image.height;
    var ctx = cvs.getContext('2d');
    var ans = ctx.createImageData(cvs.width, cvs.height);
    ans.data = new Uint8ClampedArray(ans.width * ans.height * 4);
    var icounter = parseInt(Filter.option.LAZY_WEIGHT / image.width) + 1;
    var offset = 0, dataoffset = 0;
    var arg = this.arg;
    var arglen = arg.length;
    var halfsize = parseInt(arg.length / 2);
    var height = image.height;
    var width = image.width;
    var width4 = width * 4;
    if (typeof Worker === 'undefined') {
      var go = function(i) {
        var irest = icounter;
        for (; i < height && irest; i++, irest--) {
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
                // dataoffset = ((i + (k - halfsize)) * width + j + (l - halfsize)) * 4;
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
        if (i >= height) {
          callback(ans);
        } else {
          setTimeout (function() {
            go(i);
          }, Filter.option.LAZY_WAIT_MSEC);
        }
      };
      go(0);
    } else {
      var worker = new Worker('worker.js');
      worker.onmessage = function(e) {
        callback(e.data);
      };
      worker.postMessage({ image: image, ans: ans, name: this.name, type: this.type, variable: this.variable });
    }
  };

  Filter.upConvert = function(image, scale) {
    var mag = parseInt(scale);
    var cvs = document.createElement('canvas');
    cvs.width = image.width * mag;
    cvs.height = image.height * mag;
    var ctx = cvs.getContext('2d');
    var ans = ctx.createImageData(cvs.width, cvs.height);
    ans.data = new Uint8ClampedArray(ans.width * ans.height * 4);
    var offset = 0;
    var dataoffset = 0;
    var height = image.height;
    var width = image.width;
    for (var i = 0; i < height; i++, dataoffset += width * 4) {
      for (var k = 0; k < mag; k++, dataoffset -= width * 4) {
        for (var j = 0; j < width; j++) {
          for (var l = 0; l < mag; l++) {
            // offset = ((i * mag + k) * ans.width + j * mag + l) * 4;
            ans.data[offset++] = image.data[dataoffset++];
            ans.data[offset++] = image.data[dataoffset++];
            ans.data[offset++] = image.data[dataoffset++];
            ans.data[offset++] = image.data[dataoffset++];
          }
        }
      }
    }
    return ans;
  }

  Filter.id = new Filter('color', [ 1, 1, 1 ]);

  Filter.red = new Filter('color', [ 1, 0, 0 ]);

  Filter.green = new Filter('color', [ 0, 1, 0 ]);

  Filter.blue = new Filter('color', [ 0, 0, 1 ]);

  Filter.cyan = new Filter('each', function(r, g, b) {
    return [ 0, 255 - r, 255 - r ];
  });
  Filter.cyan.description = "r' = 0,\ng' = 255 - r,\nb' = 255 - r";

  Filter.magenta = new Filter('each', function(r, g, b) {
    return [ 255 - g, 0, 255 - g ];
  });
  Filter.magenta.description = "r' = 255 - g,\ng' = 0,\nb' = 255 - g";

  Filter.yellow = new Filter('each', function(r, g, b) {
    return [ 255 - b, 255 - b, 0 ];
  });
  Filter.yellow.description = "r' = 255 - b,\ng' = 255 - b,\nb' = 0";

  Filter.luminance = new Filter('gray', Filter.option.luminance);

  Filter.luminance2 = new Filter('gray', Filter.option.luminance2);

  Filter.minimum = new Filter('each', function(r, g, b) {
    var w = r > g ? (g > b ? b : g)
                  : (r > b ? b : r);
    return [ w, w, w ];
  });
  Filter.minimum.description = "w' = min(r, g, b),\nr' = g' = b' = w'";

  Filter.average = new Filter('each', function(r, g, b) {
    var w = (r + g + b) / 3;
    return [ w, w, w ];
  });
  Filter.average.description = "w' = (r + g + b) / 3,\nr' = g' = b' = w'";

  Filter.negative = new Filter('each', function(r, g, b) {
    return [ 255 - r, 255 - g, 255 - b ];
  });
  Filter.negative.description = "r' = 255 - r,\ng' = 255 - g,\nb' = 255 - b";

  Filter.sepia = new Filter('matrix',
     [[ .393, .769, .189 ],
      [ .349, .686, .168 ],
      [ .272, .534, .131 ]]);

  Filter.flipVertical = new Filter('translate', function(x, y, width, height) {
    return [ width - x - 1, y ];
  });
  Filter.flipVertical.description = "(x, y) -> (width - x - 1, y)";

  Filter.flipHorizontal = new Filter('translate', function(x, y, width, height) {
    return [ x, height - y - 1 ];
  });
  Filter.flipHorizontal.description = "(x, y) -> (x, height - y - 1)";

  Filter.flipBoth = new Filter('translate', function(x, y, width, height) {
    return [ width - x - 1, height - y - 1 ];
  });
  Filter.flipBoth.description = "(x, y) -> (width - x - 1, height - y - 1)";

  Filter.binary = function(threshold) {
    var binary = new Filter('each', function(r, g, b) {
      if (Filter.option.luminanceFn(r, g, b) > threshold) {
        return [ 255, 255, 255 ];
      } else {
        return [ 0, 0, 0 ];
      }
    });
    binary.variable = threshold;
    binary.name = 'binary';
    var arg = Filter.option.luminance;
    binary.description = 'if (' + arg[0] + ' * r + ' +
                         arg[1] + ' * g + ' +
                         arg[2] + ' * b > ' + threshold + ")\n" +
                         "  r' = g' = b' = 255\nelse\n" +
                         "  r' = g' = b' = 0";
    return binary;
  };
  Filter.binary.arg = function(threshold) {
    return function(r, g, b) {
      if (Filter.option.luminanceFn(r, g, b) > threshold) {
        return [ 255, 255, 255 ];
      } else {
        return [ 0, 0, 0 ];
      }
    };
  };

  Filter.brightness = function(difference) {
    var brightness = new Filter('each', function(r, g, b) {
      return [ r + difference, g + difference, b + difference ];
    });
    brightness.variable = difference;
    brightness.name = 'brightness';
    brightness.description = "r' = r " + (difference >= 0 ? '+ ' + difference : '- ' + Math.abs(difference)) + ",\n" +
                             "g' = g " + (difference >= 0 ? '+ ' + difference : '- ' + Math.abs(difference)) + ",\n" +
                             "b' = b " + (difference >= 0 ? '+ ' + difference : '- ' + Math.abs(difference));
    return brightness;
  };
  Filter.brightness.arg = function(difference) {
    return function(r, g, b) {
      return [ r + difference, g + difference, b + difference ];
    };
  };

  Filter.brighten = Filter.brightness(36);

  Filter.darken = Filter.brightness(-36);

  Filter.contrast = function(tilt) {
    var cache = new Uint8ClampedArray(256);
    for (var i = 0; i < 256; i++) {
      cache[i] = tilt * (i - 128) + 128;
    }
    var contrast = new Filter('each', function(r, g, b) {
      return [ cache[r], cache[g], cache[b] ];
    });
    contrast.variable = tilt;
    contrast.name = 'contrast';
    contrast.description = 'f(x) = ' + formatnumber(tilt) + ' * (x - 128) + 128,\n' +
                           "r' = f(r), " + "g' = f(g), " + "b' = f(b)";
    return contrast;
  };
  Filter.contrast.arg = function(tilt) {
    return function(r, g, b) {
      return [ tilt * (r - 128) + 128,
               tilt * (g - 128) + 128,
               tilt * (b - 128) + 128 ];
    };
  };

  // http://en.wikipedia.org/wiki/Gamma_correction
  Filter.gamma = function(gamma) {
    var cache = new Uint8ClampedArray(256);
    for (var i = 0; i < 256; i++) {
      cache[i] = 255 * Math.pow(i / 255, gamma);
    }
    var filter = new Filter('each', function(r, g, b) {
      // return [ cache[r], cache[g], cache[b] ];
      return [ 255 * Math.pow(r / 255, gamma), 255 * Math.pow(g / 255, gamma), 255 * Math.pow(b / 255, gamma) ];
    });
    filter.variable = gamma;
    filter.name = 'gamma';
    gamma = formatnumber(gamma);
    filter.description = "r' = 255 * ((r / 255) ^ " + gamma + "),\n" +
                         "g' = 255 * ((g / 255) ^ " + gamma + "),\n" +
                         "b' = 255 * ((b / 255) ^ " + gamma + ")";
    return filter;
  };
  Filter.gamma.arg = function(gamma) {
    return function(r, g, b) {
      return [ 255 * Math.pow(r * 1.0 / 255, gamma), 255 * Math.pow(g * 1.0 / 255, gamma), 255 * Math.pow(b * 1.0 / 255, gamma) ];
    };
  };

  Filter.edge = new Filter('kernel',
     [[ -1, -1, -1 ],
      [ -1, 8, -1 ],
      [ -1, -1, -1 ]]);

  Filter.edge2 = new Filter('kernel',
     [[ 1, 0, -1 ],
      [ 0, 0, 0 ],
      [ -1, 0, 1 ]]);

  Filter.edge3 = new Filter('kernel',
     [[ 0, 1, 0 ],
      [ 1, -4, 1 ],
      [ 0, 1, 0 ]]);

  Filter.sobel = new Filter('kernel',
     [[ -1, -2, -1 ],
      [ 0, 0, 0 ],
      [ 1, 2, 1 ]]);

  Filter.prewitt = new Filter('kernel',
     [[ -1, -1, -1 ],
      [ 0, 0, 0 ],
      [ 1, 1, 1 ]]);

  Filter.sharp = new Filter('kernel',
     [[ 0, -1, 0 ],
      [ -1, 5, -1 ],
      [ 0, -1, 0 ]]);

  Filter.movingaverage = new Filter('kernel',
     [[ 1 / 9, 1 / 9, 1 / 9 ],
      [ 1 / 9, 1 / 9, 1 / 9 ],
      [ 1 / 9, 1 / 9, 1 / 9 ]]);

  Filter.gauss = new Filter('kernel',
     [[ 1 / 16, 2 / 16, 1 / 16 ],
      [ 2 / 16, 4 / 16, 2 / 16 ],
      [ 1 / 16, 2 / 16, 1 / 16 ]]);

  Filter.gauss2 = new Filter('kernel',
     [[ 1 / 256, 4 / 256, 6 / 256, 4 / 256, 1 / 256 ],
      [ 4 / 256, 16 / 256, 24 / 256, 16 / 256, 4 / 256 ],
      [ 6 / 256, 24 / 256, 36 / 256, 24 / 256, 6 / 256 ],
      [ 4 / 256, 16 / 256, 24 / 256, 16 / 256, 4 / 256 ],
      [ 1 / 256, 4 / 256, 6 / 256, 4 / 256, 1 / 256 ]]);
  
  for (var x in Filter) {
    Filter[x].name = x;
  }

  global.Filter = Filter;

})(this);

