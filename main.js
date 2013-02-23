(function() {

  var test = document.createElement("canvas");
  if (!test || !test.getContext) {
    console.log('canvas not supported');
    return;
  }
  delete test;

  if (typeof Canvas === 'undefined') {
    console.log('Canvas.js required');
    return;
  }

  if (typeof Filter === 'undefined') {
    console.log('Filter.js required');
    return;
  }

  function Main() {
    this.initializeFilterList();
  }

  Main.prototype.start = function() {
    this.windowEventAssign();
  };

  Main.prototype.windowEventAssign = function() {
    var self = this;
    window.onload = function(event) {
      self.initializeFilters();
      self.initializeUserInterface();
      self.initializeCanvas();
      if (typeof InitializeTwitter !== 'undefined') InitializeTwitter();
      if (typeof InitializeFacebook !== 'undefined') InitializeFacebook();
    };
    window.onresize = function(event) {
      return self.resize(event);
    };
  };

  Main.prototype.resize = function(event) {
    var cvs = this.cvs;
    var self = this;
    if (!cvs.length) return;
    for (var i = 0; i < cvs.length; i++) {
      cvs[i].resize();
    }
    if (event) {
      self.viewQuickly();
      setTimeout (function () {
        self.view();
      }, 5);
    }
  };

  Main.prototype.initializeUserInterface = function() {
    var self = this;
    document.getElementById('input').addEventListener('change', function(event) {
      if (event.target && event.target.files) {
        self.inputFile(event.target.files);
      }
    });
    document.body.ondragover = function(event) {
      event.preventDefault();
    };
    document.body.ondrop = function(event) {
      event.stopPropagation();
      event.preventDefault();
      if (event.dataTransfer && event.dataTransfer.files) {
        self.inputFile(event.dataTransfer.files);
      }
    };
  };

  Main.prototype.initializeFilterList = function() {
    this.filterList = [
      { filter: Filter.id, title: 'Identity' },
      { group: 'rgb', filter: Filter.red, title: 'Red' },
      { group: 'rgb', filter: Filter.green, title: 'Green' },
      { group: 'rgb', filter: Filter.blue, title: 'Blue' },
      { group: 'rgb', filter: Filter.luminance, title: 'Luminance' },
      { group: 'cmy', filter: Filter.cyan, title: 'Cyan' },
      { group: 'cmy', filter: Filter.magenta, title: 'Magenta' },
      { group: 'cmy', filter: Filter.yellow, title: 'Yellow' },
      { group: 'cmy', filter: Filter.negative, title: 'Negative' },
      { group: 'gray', filter: Filter.luminance, title: 'Luminance' },
      { group: 'gray', filter: Filter.minimum, title: 'Minimum' },
      { group: 'gray', filter: Filter.average, title: 'Average' },
      { group: 'gray', filter: Filter.sepia, title: 'Sepia' },
      { group: 'flip', filter: Filter.id, title: 'Identity' },
      { group: 'flip', filter: Filter.flipVertical, title: 'Flip vertical' },
      { group: 'flip', filter: Filter.flipHorizontal, title: 'Flip horizontal' },
      { group: 'flip', filter: Filter.flipBoth, title: 'Flip by both axes' },
      { group: 'binary', filter: Filter.binary(128 + 48), title: 'Binary threshold 176' },
      { group: 'binary', filter: Filter.binary(128 + 24), title: '152' },
      { group: 'binary', filter: Filter.binary(128), title: '128' },
      { group: 'binary', filter: Filter.binary(128 - 24), title: '104' },
      { group: 'bright', filter: Filter.brightness(36 * 2), title: 'Brightness 72' },
      { group: 'bright', filter: Filter.brightness(36 * 1), title: '36' },
      { group: 'bright', filter: Filter.brightness(36 * -1), title: '-36' },
      { group: 'bright', filter: Filter.brightness(36 * -2), title: '-72' },
      { group: 'contrast', filter: Filter.contrast(1.5), title: 'Contrast 1.5' },
      { group: 'contrast', filter: Filter.contrast(2), title: '2' },
      { group: 'contrast', filter: Filter.contrast(3), title: '3' },
      { group: 'contrast', filter: Filter.contrast(4), title: '4' },
      { group: 'gamma', filter: Filter.gamma(1 / 3), title: 'Gamma 1/3' },
      { group: 'gamma', filter: Filter.gamma(1 / 2), title: '1/2' },
      { group: 'gamma', filter: Filter.gamma(2), title: '2' },
      { group: 'gamma', filter: Filter.gamma(3), title: '3' },
      { group: 'edge', filter: Filter.edge, title: 'Edge' },
      { group: 'edge', filter: Filter.edge2, title: 'Edge' },
      { group: 'edge', filter: Filter.prewitt , title: 'Prewitt' },
      { group: 'edge', filter: Filter.sobel, title: 'Sobel' },
      { group: 'kernel', filter: Filter.sharp, title: 'Sharp' },
      { group: 'kernel', filter: Filter.movingaverage, title: 'Moving average (3x3)' },
      { group: 'kernel', filter: Filter.gauss, title: 'Gaussian (3x3)' },
      { group: 'kernel', filter: Filter.gauss2, title: 'Gaussian (5x5)' },
    ];
  };

  Main.prototype.inputFile = function(files) {
    if (!files || !files[0]) return;
    var self = this;
    if (this.filterLoaders && this.filterLoaders.length) {
      for (var i = 0; i < this.filterLoaders.length; i++) {
        delete this.filterLoaders[i].imageLarge;
        delete this.filterLoaders[i].dataLarge;
      }
    }
    delete this.image;
    delete this.imageDataLarge;
    this.cvs[0].setImage(null);
    this.filterLoaders = [];
    this.imageDataAutosize = null;
    this.imageDataLarge = null;
    this.load(files[0], function(result) {
      self.viewQuickly(result);
      setTimeout (function () {
        self.view();
      }, 10);
    });
    for (var i = 0; i < this.cvs.length; i++) {
      this.cvs[i].initializeSettings();
    }
  };

  Main.prototype.load = function(file, callback) {
    if (!file || !callback) return;
    var url;
    if (window.URL) {
      url = window.URL;
    } else if (window.webkitURL) {
      url = window.webkitURL;
    } else {
      return;
    }
    this.file = file;
    var image = this.image = new Image();
    this.image.onload = function(event) {
      callback(image);
    };
    this.image.src = url.createObjectURL(file);
  };

  Main.prototype.viewQuickly = function(image) {
    if (image) {
      this.image = image;
    }
    if (!this.image) return;
    if (!this.imageDataAutosize)  {
      this.imageDataAutosize = this.loadImageAutosize(this.image);
      if (this.filterLoaders.length === 0) {
        for (var i = 0; i < this.filterList.length; i++) {
          this.filterLoaders[i] = new Filter.Loader(this.filterList[i].filter, this.imageDataAutosize);
        }
      }
    }
    this.cvs[0].setImage(this.image);
    this.cvs[0].draw();
    for (var i = 1; i < this.cvs.length; i++) {
      this.cvs[i].setFilter(this.filterLoaders[this.currentFilters[i]]);
      this.cvs[i].load();
    }
  };

  Main.prototype.view = function(image) {
    if (image) {
      this.image = image;
    }
    if (!this.image) return;
    if (!this.imageDataLarge)  {
      var scale = Math.max(this.image.width / window.document.body.clientWidth / 0.95,
                           this.image.height / window.document.body.clientHeight * 2 / 0.95);
      this.imageDataLarge = this.loadImage(this.image);
      for (var i = 0; i < this.filterLoaders.length; i++) {
        this.filterLoaders[i].setLargeImage(this.imageDataLarge);
      }
    }
    this.cvs[0].draw();
    var self = this;
    var go = function(i) {
      self.cvs[i].loadLarge(function() {
        if (++i < self.cvs.length) {
          setTimeout(function () {
            go(i);
          }, 5);
        }
      });
    };
    go(1, 0);
  };

  Main.prototype.initializeFilters = function() {
    var self = this;
    this.filterGroup = {};
    var filterdiv = document.getElementById('filter');
    this.currentFilters = [0];
    for (var i = 0; i < this.filterList.length; i++) {
      if (typeof (this.filterList[i].filter) !== 'undefined') {
        this.filterList[i].id = i;
        if (typeof (this.filterList[i].group) !== 'undefined') {
          if (typeof (this.filterGroup[this.filterList[i].group]) === 'undefined') {
            this.filterGroup[this.filterList[i].group] = [];
            var div = document.createElement('div');
            var p = document.createElement('a');
            div.appendChild(p);
            div.className = 'eachfilter';
            if (typeof p.innerText === 'undefined') {
              p.textContent = this.filterList[i].group;
            } else {
              p.innerText = this.filterList[i].group;
            }
            this.filterGroup[this.filterList[i].group].p = p;
            div.onclick = function(e) {
              var filterdivs = document.getElementsByClassName('select');
              for (var i = 0; i < filterdivs.length; i++) {
                filterdivs[i].className = 'eachfilter';
              }
              e.target.parentNode.className = e.target.parentNode.className + ' select';
              var name = e.target.innerText || e.target.textContent;
              var group = self.filterGroup[name];
              for (var i = 0; i < group.length; i++) {
                self.currentFilters[i + 1] = group[i].id;
              }
              self.viewQuickly();
              setTimeout (function () {
                self.view();
              }, 10);
            };
            filterdiv.appendChild(div);
          }
          this.filterGroup[this.filterList[i].group].push(this.filterList[i]);
          var p = this.filterGroup[this.filterList[i].group].p;
          p.title = p.title + (p.title === '' ? '' : ', ') + this.filterList[i].title;
        }
      }
    }
    document.getElementsByClassName('eachfilter')[0].className += ' select';
    var group = self.filterGroup['rgb'];
    for (var i = 0; i < group.length; i++) {
      self.currentFilters[i + 1] = group[i].id;
    }
    delete filterdiv;
  };

  Main.prototype.loadImageAutosize = function(image) {
    var cvs = document.createElement('canvas');
    if (!cvs) return;
    var scale = Math.max(Math.max(image.width / window.document.body.clientWidth / 0.95,
                                  image.height / window.document.body.clientHeight * 2 / 0.95),
                                  1.0);
    cvs.width = image.width / scale;
    cvs.height = image.height / scale;
    var ctx = cvs.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(image, 0, 0, cvs.width, cvs.height);
    return ctx.getImageData(0, 0, cvs.width, cvs.height);
  };

  Main.prototype.loadImage = function(image) {
    var cvs = document.createElement('canvas');
    if (!cvs) return;
    cvs.width = image.width;
    cvs.height = image.height;
    var ctx = cvs.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(image, 0, 0, cvs.width, cvs.height);
    return ctx.getImageData(0, 0, cvs.width, cvs.height);
  };

  Main.prototype.initializeCanvas = function() {
    this.cvs = [];
    this.cvs[0] = new Canvas(document.getElementById('main'));
    this.cvs[1] = new Canvas(document.getElementById('red'));
    this.cvs[2] = new Canvas(document.getElementById('green'));
    this.cvs[3] = new Canvas(document.getElementById('blue'));
    this.cvs[4] = new Canvas(document.getElementById('black'));
    for (var i = 0; i < this.cvs.length; i++) {
      this.cvs[i].setNext(this.cvs[(i + 1) % 5]);
    }
  };

  var main = new Main();
  main.start();

  return;

})();

