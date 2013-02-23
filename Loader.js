(function(global) {

  if (typeof Filter === 'undefined') {
    console.log('Filter.js required');
    return;
  }

  if (!global.Filter) return;

  if (global.Filter && global.Loader) return;

  function Loader(filter, image) {
    this.filter = filter;
    this.imageLarge = this.image = image;
  };

  Loader.prototype.setLargeImage = function(image) {
    this.imageLarge = image;
  };

  Loader.prototype.load = function(callback) {
    if (this.loaded) {
      callback(this.data);
      return;
    }
    var cvs = document.createElement('canvas');
    cvs.width = this.image.width;
    cvs.height = this.image.height;
    var ctx = cvs.getContext('2d');
    var self = this;
    this.convertToImage(this.filter.filter(this.image), function(data) {
      self.loaded = true;
      callback(self.data = data);
      delete data.src;
    });
    return this.result;
  };

  Loader.prototype.loadLarge = function(callback) {
    if (this.loadedLarge) {
      callback.call(this, this.dataLarge);
      return;
    }
    var cvs = document.createElement('canvas');
    cvs.width = this.imageLarge.width;
    cvs.height = this.imageLarge.height;
    var ctx = cvs.getContext('2d');
    var self = this;
    this.filter.filterLazy(this.imageLarge, function(data) {
      self.convertToImage(data, function(resultLarge) {
        self.loadedLarge = true;
        callback.call(self, self.dataLarge = resultLarge);
      delete resultLarge.src;
      });
    });
    return this.result;
  };

  Loader.prototype.convertToImage = function(data, callback) {
    var cvs = document.createElement('canvas');
    cvs.width = data.width;
    cvs.height = data.height;
    var ctx = cvs.getContext('2d');
    ctx.putImageData(data, 0, 0);
    var image = new Image();
    image.onload = function(event) {
      callback(image);
    };
    image.src = cvs.toDataURL();
  };

  global.Loader = Loader;

})(this);

