(function() {

  var test = document.createElement("canvas");
  if (!test || !test.getContext){
    console.log('canvas not supported');
    return;
  }

  var image;
  var image_data;
  var image_data_cache;
  var image_data_small_cache;
  var image_data_small;
  var cvs;
  var cursordown_cvs;
  var loaded;

  var filterList = [
    {},
    { group: 'rgb', filter: Filter.red },
    { group: 'rgb', filter: Filter.green },
    { group: 'rgb', filter: Filter.blue },
    { group: 'rgb', filter: Filter.luminance },
    { group: 'cmy', filter: Filter.cyan },
    { group: 'cmy', filter: Filter.magenta },
    { group: 'cmy', filter: Filter.yellow },
    { group: 'cmy', filter: Filter.negative },
    { group: 'gray', filter: Filter.luminance },
    // { group: 'gray', filter: Filter.luminance2 },
    { group: 'gray', filter: Filter.minimum },
    { group: 'gray', filter: Filter.average },
    { group: 'gray', filter: Filter.sepia },
    { group: 'flip', filter: Filter.id },
    { group: 'flip', filter: Filter.flipVertical },
    { group: 'flip', filter: Filter.flipHorizontal },
    { group: 'flip', filter: Filter.flipBoth },
    { group: 'binary', filter: Filter.binary(128 + 48) },
    { group: 'binary', filter: Filter.binary(128 + 24) },
    { group: 'binary', filter: Filter.binary(128) },
    { group: 'binary', filter: Filter.binary(128 - 24) },
    { group: 'bright', filter: Filter.brightness(36 * 2) },
    { group: 'bright', filter: Filter.brightness(36 * 1) },
    { group: 'bright', filter: Filter.brightness(36 * -1) },
    { group: 'bright', filter: Filter.brightness(36 * -2) },
    { group: 'contrast', filter: Filter.contrast(36 * 1) },
    { group: 'contrast', filter: Filter.contrast(36 * 2) },
    { group: 'contrast', filter: Filter.contrast(36 * 3) },
    { group: 'contrast', filter: Filter.contrast(36 * 4) },
    { group: 'gamma', filter: Filter.gamma(1 / 3) },
    { group: 'gamma', filter: Filter.gamma(1 / 2) },
    { group: 'gamma', filter: Filter.gamma(2) },
    { group: 'gamma', filter: Filter.gamma(3) },
  ];

  var currentFilters = [
    {},
    1,
    2,
    3,
    4
  ];

  var sourceList = [];

  var filterGroup = {};

  var groupDescription = {
    'rgb': 'Red, Green, Blue, Black (NTSC gray scale)',
    'cmy': 'Cyan, Magenta, Yellow, Negative',
    'gray': 'NTSC gray scale, Minimum value, Average, Sepia',
    'flip': 'Identity, Vertical flip, Horizontal flip, Filp by both axes',
    'binary': '',
    'contrast': '',
    'gamma': '',
  };

  CanvasRenderingContext2D.prototype.clear =
  CanvasRenderingContext2D.prototype.clear || function(preserveTransform) {
    if (preserveTransform) {
      this.save();
      this.setTransform(1, 0, 0, 1, 0, 0);
    }
    this.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (preserveTransform) {
      this.restore();
    }
  };

  function initialize(event) {
    var input = document.getElementById('input');
    input.addEventListener('change', onchange);
    var filterdiv = document.getElementById('filter');
    for (var i = 0; i < filterList.length; i++) {
      filterList[i].id = i;
      if (typeof (filterList[i].group) !== 'undefined') {
        if (typeof (filterGroup[filterList[i].group]) === 'undefined') {
          filterGroup[filterList[i].group] = [];
          var div = document.createElement('div');
          var p = document.createElement('p');
          div.appendChild(p);
          div.className = 'eachfilter';
          p.innerText = filterList[i].group;
          p.title = groupDescription[filterList[i].group] || '';
          div.onclick = function(e) {
            var filterdivs = document.getElementsByClassName('select');
            for (var i = 0; i < filterdivs.length; i++) {
              filterdivs[i].className = 'eachfilter';
            }
            e.target.parentNode.className = e.target.parentNode.className + ' select';
            var name = e.target.innerText;
            var group = filterGroup[name];
            for (var i = 0; i < group.length; i++) {
              currentFilters[i + 1] = group[i].id;
            }
            if (image_data_small) {
              processImage(image_data_small);
              setTimeout (function() {
                processImageLazy();
              }, 20);
              setTimeout (function() {
                processImageLazy();
              }, 1000);
            }
          };
          filterdiv.appendChild(div);
        }
        filterGroup[filterList[i].group].push(filterList[i]);
      }
    }
    document.body.ondragover = function(event) {
      event.preventDefault();
    };
    document.body.ondrop = function(event) {
      event.stopPropagation();
      event.preventDefault();
      if (event.dataTransfer && event.dataTransfer.files) {
        event.target.files = event.dataTransfer.files;
        onchange(event);
      }
    };
    document.getElementsByClassName('eachfilter')[0].className += ' select';
    image = new Image();
    cvs = [];
    image_data = [];
    image_data_cache = [];
    image_data_small_cache = [];
    loaded = false;
    cvs[0] = document.getElementById('main');
    cvs[1] = document.getElementById('red');
    cvs[2] = document.getElementById('green');
    cvs[3] = document.getElementById('blue');
    cvs[4] = document.getElementById('black');
    initcvss(event);
    if (typeof InitializeTwitter !== 'undefined') InitializeTwitter();
    if (typeof InitializeFacebook !== 'undefined') InitializeFacebook();
  }

  function initcvss(event) {
    for (var i = 0; i < 5; i++) {
     initcvs(cvs[i], cvs[(i + 1) % 5]);
    }
  }

  function browserToCanvas(event, cvs) {
    if (!event) return;
    if (!cvs) return;
    return { x: event.clientX - cvs.offsetLeft,
             y: event.clientY - cvs.offsetTop };
  }

  function canvasToBrowser(pos, cvs) {
    if (!pos) return;
    if (!cvs) return;
    return { x: pos.x + cvs.offsetLeft,
             y: pos.y + cvs.offsetTop };
  }

  function imageToCanvas(pos, cvs) {
    if (!pos) return;
    if (!cvs) return;
    return { x: cvs.__scale * (pos.x + cvs.__translateX),
             y: cvs.__scale * (pos.y + cvs.__translateY) };
  }

  function canvasToImage(pos, cvs) {
    if (!pos) return;
    if (!cvs) return;
    return { x: pos.x / cvs.__scale - cvs.__translateX,
             y: pos.y / cvs.__scale - cvs.__translateY };
  }

  function imageToProp(pos, cvs) {
    if (!cvs) return;
    var image = cvs.__image_data;
    if (!image) return;
    var scale = cvs.__img_scale;
    var offsetx = Math.max((cvs.width - image.width / scale) / 2, 0);
    var offsety = Math.max((cvs.height - image.height / scale) / 2, 0);
    return { x: (pos.x - offsetx) * scale / image.width,
             y: (pos.y - offsety) * scale / image.height };
  }

  function propToImage(pos, cvs) {
    if (!cvs) return;
    var image = cvs.__image_data;
    if (!image) return;
    var scale = cvs.__img_scale;
    if (!scale) return;
    var offsetx = Math.max((cvs.width - image.width / scale) / 2, 0);
    var offsety = Math.max((cvs.height - image.height / scale) / 2, 0);
    return { x: pos.x * image.width / scale + offsetx,
             y: pos.y * image.height / scale + offsety };
  }

  function browserToProp(event, cvs) {
    if (!cvs) return;
    if (!event) return;
    return imageToProp(
           canvasToImage(
           browserToCanvas(event, cvs), cvs), cvs);
  }

  function propToBrowser(pos, cvs) {
    if (!cvs) return;
    if (!pos) return;
    return canvasToBrowser(
           imageToCanvas(
           propToImage(pos, cvs), cvs), cvs);
  }

  function initcvs(cvs, next) {
    if (!cvs) { console.log("assert failed: !cvs"); return; }
    if (!next) { console.log("assert failed: !next"); return; }
    cvs.width = cvs.clientWidth;
    cvs.height = cvs.clientHeight;
    cvs.__translateX = cvs.__translateY = 0;
    cvs.__orig_scale = cvs.__scale = 1.0;
    cvs.__mousedown = false;
    cvs.__counterpart = next;
    cvs.onmousedown = function(e) {
      if (typeof e.rec === 'undefined') {
        cursordown_cvs = e.master = cvs;
        e.rec = 4;
        e.pos = browserToProp(e, e.master);
      } else {
        e.rec--;
      }
      cvs.__mousedown = true;
      cvs.__mousemove = false;
      cvs.__savepos = e.pos;
      if (e.rec > 0) cvs.__counterpart.onmousedown(e);
    };
    cvs.onmousemove = function(e) {
      if (typeof e.rec === 'undefined') {
        e.master = cvs;
        e.rec = 4;
        e.pos = browserToProp(e, cursordown_cvs);
      } else {
        e.rec--;
      }
      if (cvs.__mousedown) {
        cvs.__mousemove = true;
        var ctx = cvs.getContext('2d');
        var posprev = propToImage(e.master.__savepos, cvs);
        var posnew = propToImage(e.pos, cvs);
        cvs.__translateX += posnew.x - posprev.x;
        cvs.__translateY += posnew.y - posprev.y;
        drawimage(cvs);
        if (e.rec > 0) cvs.__counterpart.onmousemove(e);
      }
    };
    cvs.onmouseup = function(e) {
      if (typeof e.rec === 'undefined') {
        e.master = cvs;
        e.rec = 4;
      } else {
        e.rec--;
      }
      var ctx = cvs.getContext('2d');
      cvs.__mousedown = false;
      drawimage(cvs);
      if (e.rec > 0) cvs.__counterpart.onmouseup(e);
    };
    var onmousewheel = function(e) {
      if (typeof e.rec === 'undefined') {
        e.master = cvs;
        e.rec = 4;
        e.pos = browserToProp(e, cvs);
      } else {
        e.rec--;
      }
      var ctx = cvs.getContext('2d');
      var delta = (e.wheelDelta ? e.wheelDelta : 0) / 1600;
      var zoom = 1 + delta;
      if (cvs.__scale / cvs.__orig_scale < 0.30 && zoom < 1) return;
      cvs.__scale *= zoom;
      var pos = imageToCanvas(propToImage(e.pos, cvs), cvs);
      if (!pos) return;
      cvs.__translateX += pos.x * (1 - zoom) / cvs.__scale;
      cvs.__translateY += pos.y * (1 - zoom) / cvs.__scale;
      drawimage(cvs);
      if (e.rec > 0) {
        if ('onmousewheel' in document) {
          cvs.__counterpart.onmousewheel(e);
        } else {
          var element = cvs.__counterpart;
          var event = e;
          if (document.createEvent) {
            event = document.createEvent("HTMLEvents");
            event.initEvent("dataavailable", true, true);
          } else {
            event = document.createEventObject();
            event.eventType = "dataavailable";
          }
          event.eventName = 'DOMMouseScroll';
          event.memo = {};
          if (document.createEvent) {
            element.dispatchEvent(event);
          } else {
            element.fireEvent("on" + event.eventType, event);
          }
        }
      }
    };
    if ('onmousewheel' in document) {
      cvs.onmousewheel = onmousewheel;
    } else {
      cvs.addEventListener('DOMMouseScroll', onmousewheel, false);
    }
  }

  function onchange(event) {
    var files = event.target.files;
    if (!files) { console.log("assert failed: !files"); return; }
    var file = files[0];
    if (!file) { console.log("assert failed: !file"); return; }
    initcvss(null);
    resize(null);
    dealfile(file);
  }

  function resize(event) {
    if (!cvs.length) return;
    for (var i = 0; i < cvs.length; i++) {
      if (!cvs[i]) { console.log("assert failed: !cvs[i]"); continue; }
      cvs[i].width = cvs[i].clientWidth;
      cvs[i].height = cvs[i].clientHeight;
      if (event) {
        drawimage(cvs[i]);
      }
    }
  }

  function loadimage(image) {
    if (loaded) return;
    loaded = true;
    var cvs = document.createElement('canvas');
    if (!cvs) { console.log("assert failed: !cvs"); return; }
    cvs.width = image.width;
    cvs.height = image.height;
    var ctx = cvs.getContext('2d');
    if (!ctx) { console.log("assert failed: !ctx"); return; }
    ctx.drawImage(image, 0, 0, cvs.width, cvs.height);
    return ctx.getImageData(0, 0, cvs.width, cvs.height);
  }

  function loadimageAutosize(image) {
    var cvs = document.createElement('canvas');
    if (!cvs) { console.log("assert failed: !cvs"); return; }
    var scale = Math.max(Math.max(image.width / window.document.body.clientWidth / 0.95,
                                  image.height / window.document.body.clientHeight * 2 / 0.95),
                                  1.0);
    cvs.width = image.width / scale;
    cvs.height = image.height / scale;
    var ctx = cvs.getContext('2d');
    if (!ctx) { console.log("assert failed: !ctx"); return; }
    ctx.drawImage(image, 0, 0, cvs.width, cvs.height);
    return ctx.getImageData(0, 0, cvs.width, cvs.height);
  }

  function convertToImage(data, cb) {
    if (!data) { console.log("assert failed: !data"); return; }
    if (!cb) { console.log("assert failed: !cb"); return; }
    var cvs = document.createElement('canvas');
    if (!cvs) { console.log("assert failed: !cvs"); return; }
    cvs.width = data.width;
    cvs.height = data.height;
    var ctx = cvs.getContext('2d');
    if (!ctx) { console.log("assert failed: !ctx"); return; }
    ctx.putImageData(data, 0, 0);
    var image = new Image();
    image.onload = function(event) {
      cb(event, image);
    };
    image.src = cvs.toDataURL();
    return image;
  }

  function dealfile(file) {
    if (window.URL) {
      var url = window.URL;
    } else if (window.webkitURL) {
      var url = window.webkitURL;
    } else {
      return;
    }
    delete image_data;
    delete image_data_cache;
    delete image_data_small_cache;
    delete image;
    delete image_data_small;
    image = new Image();
    image_data = [];
    image_data_cache = [];
    loaded = false;
    image.onload = function(event) {
      var scale = Math.max(image.width / window.document.body.clientWidth / 0.95,
                           image.height / window.document.body.clientHeight * 2 / 0.95);
      image_data[0] = loadimageAutosize(image);
      if (scale < 1.0) {
        image_data_small = image_data_cache[0] = image_data[0] = Filter.upConvert(image_data[0], 1 / scale);
        loaded = true;
        convertToImage(image_data[0], function(event, result) {
          image = result;
          processImage();
        });
      } else {
        processImage();
      }
      if (!loaded) {
        setTimeout(function() {
          loaded = false;
          image_data_small = image_data[0];
          image_data_cache[0] = image_data[0] = loadimage(image);
          loaded = true;
          setTimeout(function() {
            processImageLazy();
          }, 100);
        }, 100);
      }
    };
    image.src = url.createObjectURL(file);
  }

  function processImage(img) {
    if (!cvs[0] || !cvs[1] || !cvs[2] || !cvs[3] || !cvs[4]) return;
    if (!img) {
      cvs[0].__image_data = image;
      drawimage(cvs[0]);
    }
    for (var i = 1; i < 5; i++) {
      var source = image;
      (function(i, filterId) {
        setTimeout(function() {
          sourceList[i] = source;
          image_data_small_cache[filterId] =
          image_data[i] = filterList[currentFilters[i]].filter.filter(img || image_data[0]);
          if (img) {
            image_data_cache[filterId] = image_data_small_cache[filterId];
          }
          convertToImage(image_data[i], function(event, result) {
            if (sourceList[i] === source) {
              cvs[i].__image_data = result;
              if (currentFilters[i] === filterId) {
                drawimage(cvs[i]);
              }
            }
          });
        }, i * 2);
      })(i, currentFilters[i]);
    }
  }

  // TODO: 次々にファイルを読み込んだら前のlazyが残ったままになる→新しいファイルで全てのlazyプロセスをキャンセルする
  // TODO: まだなんかバギー... 次々とフィルター変えていくと狂う → wheelがオカシイ気がする
  function processImageLazy() {
    var source = image;
    if (!cvs[0] || !cvs[1] || !cvs[2] || !cvs[3] || !cvs[4]) return;
    cvs[0].__image_data = image;
    drawimage(cvs[0]);
    var lazycb = function(result, i, filterId) {
      image_data_cache[filterId] = result;
      if (sourceList[i] === source) {
        image_data[i] = result;
        convertToImage(image_data[i], function(event, result) {
          if (sourceList[i] === source) {
            cvs[i].__image_data = result;
            if (currentFilters[i] === filterId) {
              drawimage(cvs[i]);
            }
          }
        });
      }
    };
    var go = function(i, filterId) {
      sourceList[i] = source;
      if (image_data_cache[filterList[currentFilters[i]].id]) {
        lazycb(image_data_cache[filterList[currentFilters[i]].id], i, filterId);
        if (++i < 5) {
          if (sourceList[i - 1] === source) {
            setTimeout (function () {
              go(i, currentFilters[i]);
            }, 5);
          }
        }
      } else {
        filterList[currentFilters[i]].filter.filterLazy(image_data[0], function(result) {
          if (sourceList[i] === source) {
            lazycb(result, i, filterId);
            if (++i < 5) {
              if (sourceList[i - 1] === source) {
                go(i, currentFilters[i]);
              }
            }
          }
        });
      }
    };
    go(1, currentFilters[1]);
  }

  function drawimage(cvs) {
    if (!cvs) { console.log("assert failed: !cvs"); return; }
    var ctx = cvs.getContext('2d');
    if (!ctx) { console.log("assert failed: !ctx"); return; }
    ctx.clear(true);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(cvs.__scale, cvs.__scale);
    ctx.translate(cvs.__translateX, cvs.__translateY);
    ctx.imageSmoothingEnabled =
    ctx.webkitImageSmoothingEnabled =
    ctx.mozImageSmoothingEnabled = false;
    var image = cvs.__image_data;
    if (!image) return;
    var scale = Math.max(Math.max(image.width / cvs.width / 0.95,
                                  image.height / cvs.height / 0.95), 1);
    cvs.__img_scale = scale;
    var offsetx = Math.max((cvs.width - image.width / scale) / 2, 0);
    var offsety = Math.max((cvs.height - image.height / scale) / 2, 0);
    ctx.drawImage(image, offsetx, offsety, image.width / scale, image.height / scale);
  }

  window.onload = initialize;
  window.onresize = resize;

})();

