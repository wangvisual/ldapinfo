/* LinkedIn javascript API should be loaded by this time */

MOE.UI.VirtField = function(id, seeMoreCallback, resizeHandler) {
    if (MOE.Utils.IsUndefOrNull(id) || id.length === 0) throw "Invalid Argument (id)";
    if (MOE.Utils.IsUndefOrNull(seeMoreCallback)) throw "Invalid Argument (seeMoreCallback)";
    if (MOE.Utils.IsUndefOrNull(resizeHandler)) throw "Invalid Argument (resizeHandler)";
    
    this._id = id;
    this._jqId = "#" + id;
    this._jqObj = $(this._jqId);
    this._str = "";
    this._data = null;
    this._lines = 3;
    this._seeMoreCallback = seeMoreCallback;
    this._resizeHandler = resizeHandler;
    
    $(window).unbind("resize", this._resizeHandler);
    $(window).resize({"me":this}, this._resizeHandler);
};

MOE.UI.VirtField.prototype.updateContent = function() {
    var divWidth = this._jqObj.width(), chrWidth = MOE.Utils.MeasureString("a").width, 
        maxChrCount = Math.floor((divWidth / chrWidth) * this._lines);

    if (maxChrCount < this._str.length) {
        this._jqObj.html(MOE.Utils.Trim(this._str.substr(0, maxChrCount)) + "... " + this._seeMoreCallback(this._data));
    } else {
        this._jqObj.html(this._str);
    }
};

MOE.UI.VirtField.prototype.str = function(val) {
    if (typeof val === "undefined") {
        return this._str;
    }
    this._str = val;
};

MOE.UI.VirtField.prototype.data = function(val) {
    if (typeof val === "undefined") {
        return this._data;
    }
    this._data = val;
};

MOE.UI.VirtField.prototype.initialize = function() {
    $(window).resize();
};
