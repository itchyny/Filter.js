(function(global) {

  if (typeof Filter === 'undefined') {
    console.log('Filter.js required');
    return;
  }

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

  if (!global.Filter) return;

  if (global.Filter && global.Filter.Loader) return;

  if (global.Canvas) return;

  function Canvas(canvas) {
    this.canvas = canvas;
    this.initialize();
  }

  Canvas.prototype.setFilter = function(filter) {
    this.filter = filter;
    this.image = null;
    this.imageLarge = null;
    this.canvas.title = filter.filter.description || '';
  };

  Canvas.prototype.setImage = function(image) {
    this.image = image;
    this.imageLarge = null;
  };

  Canvas.prototype.setNext = function(next) {
    this.nextCanvas = next;
  };

  Canvas.prototype.initializeSettings = function() {
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
    this.translateX = this.translateY = 0;
    this.orig_scale = this.scale = 1.0;
    this.mousedown = false;
    this.image = this.imageLarge = null;
  };

  Canvas.prototype.initialize = function() {
    var self = this;
    self.initializeSettings();
    var cvs = this.canvas;
    cvs.onselectstart = function(e) {
      return false;
    };
    cvs.onmousedown = function(e) {
      e.preventDefault();
      if (typeof e.rec === 'undefined') {
        Canvas.cursordown_cvs = e.master = self;
        e.rec = 4;
        e.pos = self.browserToProp(e);
      } else {
        e.rec--;
      }
      self.mousedown = true;
      self.mousemove = false;
      self.savepos = e.pos;
      if (e.rec > 0) self.nextCanvas.canvas.onmousedown(e);
    };
    cvs.onmousemove = function(e) {
      if (typeof e.rec === 'undefined') {
        e.master = self;
        e.rec = 4;
        e.pos = Canvas.cursordown_cvs ? Canvas.cursordown_cvs.browserToProp(e) : {};
      } else {
        e.rec--;
      }
      if (self.mousedown) {
        self.mousemove = true;
        cvs.style.cursor = 'move';
        var ctx = cvs.getContext('2d');
        var posprev = self.propToImage(e.master.savepos);
        var posnew = self.propToImage(e.pos);
        self.translateX += posnew.x - posprev.x;
        self.translateY += posnew.y - posprev.y;
        self.load();
        if (e.rec > 0) self.nextCanvas.canvas.onmousemove(e);
      } else {
        cvs.style.cursor = '';
        document.body.onselectstart = function(e) {
          return true;
        };
      }
    };
    cvs.onmouseup = function(e) {
      if (typeof e.rec === 'undefined') {
        e.master = self;
        e.rec = 4;
      } else {
        e.rec--;
      }
      cvs.style.cursor = '';
      var ctx = cvs.getContext('2d');
      self.mousedown = false;
      self.load();
      if (e.rec > 0) self.nextCanvas.canvas.onmouseup(e);
    };
    self.onmousewheel = function(e) {
      var selff = self;
      if (typeof e.rec === 'undefined') {
        e.master = self;
        e.rec = 4;
        e.pos = self.browserToProp(e);
      } else {
        e.rec--;
      }
      var delta = (e.wheelDelta ? e.wheelDelta : e.detail ? e.detail * (-100) : 0) / 1600;
      var zoom = 1 + delta;
      if (selff.scale / selff.orig_scale < 0.30 && zoom < 1) return;
      selff.scale *= zoom;
      var pos = selff.imageToCanvas(selff.propToImage(e.pos));
      if (!pos) return;
      selff.translateX += pos.x * (1 - zoom) / selff.scale;
      selff.translateY += pos.y * (1 - zoom) / selff.scale;
      selff.load();
      if (e.rec > 0) {
        selff.nextCanvas.onmousewheel(e);
      }
    };
    if ('onmousewheel' in document) {
      cvs.onmousewheel = self.onmousewheel;
    } else {
      cvs.addEventListener('DOMMouseScroll', self.onmousewheel, false);
    }
  };

  Canvas.prototype.resize = function() {
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
    this.mousedown = false;
  };

  Canvas.prototype.load = function() {
    var self = this;
    if (self.filter) {
      if (self.image) {
        self.draw(self.image);
      } else {
        self.filter.load(function(result) {
          self.image = result;
          self.draw(result);
        });
      }
    } else {
      this.draw();
    }
  };

  Canvas.prototype.loadLarge = function(callback) {
    if (!callback) return;
    var self = this;
    if (self.filter) {
      if (self.imageLarge) {
        self.draw(self.imageLarge);
        callback();
      } else {
        self.filter.loadLarge(function(result) {
          if (self.filter === this) {
            self.imageLarge = result;
            self.draw(result);
          }
          callback();
        });
      }
    } else {
      this.draw();
      callback();
    }
  };

  Canvas.prototype.draw = function(result) {
    if (result) {
      this.image = result;
    }
    if (!this.image) return;
    var cvs = this.canvas;
    var ctx = cvs.getContext('2d');
    ctx.clear(true);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(this.scale, this.scale);
    ctx.translate(this.translateX, this.translateY);
    ctx.imageSmoothingEnabled =
    ctx.webkitImageSmoothingEnabled =
    ctx.mozImageSmoothingEnabled = false;
    var scale = Math.max(Math.max(this.image.width / cvs.width / 0.95,
                                  this.image.height / cvs.height / 0.95), 1);
    this.img_scale = scale;
    var offsetx = Math.max((cvs.width - this.image.width / scale) / 2, 0);
    var offsety = Math.max((cvs.height - this.image.height / scale) / 2, 0);
    ctx.drawImage(this.image, offsetx, offsety, this.image.width / scale, this.image.height / scale);
  };

  Canvas.prototype.browserToCanvas = function(event) {
    if (!event) return;
    return { x: event.clientX - this.canvas.offsetLeft,
             y: event.clientY - this.canvas.offsetTop };
  };

  Canvas.prototype.canvasToBrowser = function(pos) {
    if (!pos) return;
    return { x: pos.x + this.canvas.offsetLeft,
             y: pos.y + this.canvas.offsetTop };
  };

  Canvas.prototype.imageToCanvas = function(pos) {
    if (!pos) return;
    return { x: this.scale * (pos.x + this.translateX),
             y: this.scale * (pos.y + this.translateY) };
  };

  Canvas.prototype.canvasToImage = function(pos) {
    if (!pos) return;
    return { x: pos.x / this.scale - this.translateX,
             y: pos.y / this.scale - this.translateY };
  };

  Canvas.prototype.imageToProp = function(pos) {
    var cvs = this.canvas;
    if (!cvs) return;
    var image = this.image;
    if (!image) return;
    var scale = this.img_scale;
    var offsetx = Math.max((cvs.width - image.width / scale) / 2, 0);
    var offsety = Math.max((cvs.height - image.height / scale) / 2, 0);
    return { x: (pos.x - offsetx) * scale / image.width,
             y: (pos.y - offsety) * scale / image.height };
  };

  Canvas.prototype.propToImage = function(pos) {
    var cvs = this.canvas;
    if (!cvs) return;
    var image = this.image;
    if (!image) return;
    var scale = this.img_scale;
    if (!scale) return;
    var offsetx = Math.max((cvs.width - image.width / scale) / 2, 0);
    var offsety = Math.max((cvs.height - image.height / scale) / 2, 0);
    return { x: pos.x * image.width / scale + offsetx,
             y: pos.y * image.height / scale + offsety };
  };

  Canvas.prototype.browserToProp = function(event) {
    if (!event) return;
    return this.imageToProp(
           this.canvasToImage(
           this.browserToCanvas(event)));
  };

  global.Canvas = Canvas;

})(this);

