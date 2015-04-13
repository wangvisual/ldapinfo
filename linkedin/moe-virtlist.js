/* LinkedIn javascript API should be loaded by this time */

MOE.UI.VirtList = function(id, seeAllCallback, resizeHandler) {
    if (MOE.Utils.IsUndefOrNull(id) || id.length === 0) throw "Invalid Argument (id)";
    if (MOE.Utils.IsUndefOrNull(seeAllCallback)) throw "Invalid Argument (seeAllCallback)";
    if (MOE.Utils.IsUndefOrNull(resizeHandler)) throw "Invalid Argument (resizeHandler)";
        
    this._id = id;
    this._jqId = "#" + id;
    this._jqObj = $(this._jqId);
    this._items = [];
    this._validCount = 0;
    this._seeAllCallback = seeAllCallback;
    this._lines = 3;
    this._resizeHandler = resizeHandler;
    this._providedTotal = 0;
    
    $(window).unbind("resize", this._resizeHandler);
    $(window).resize({"me":this}, this._resizeHandler);
};

MOE.UI.VirtList.prototype._calculateMaxHeight = function() {
    if (this._items.length > 0) {
        var size = MOE.Utils.MeasureJSObj(this._items[0]), maxHeight = size.height * this._lines;
        this._jqObj.css("max-height", maxHeight.toString() + "px");
    } else {
        this._jqObj.css("max-height", "0px");
    }
};

MOE.UI.VirtList.prototype._displayableItemsCount = function() {
    var ctnrW = this._jqObj.width(), count = 0, countValid = 0, accumWidth = 0;  
    for (var ix = 0, len = this._items.length; ix < len; ix++, count++) {
        if ((accumWidth + this._items[ix].width()) <= ctnrW) {
            accumWidth += this._items[ix].width();
            if (this._items[ix].attr("data-status") === "valid") countValid++;
        }
        else break;
    }
    return {"count":(count * this._lines)};
};

MOE.UI.VirtList.prototype._updateContent = function(initilization) {
    var dic = this._displayableItemsCount(), len = this._items.length, 
        visibleLen = 0, ix = 0, lastVisible = -1, diff = 0, validCount = 0;
        
    visibleLen = (dic.count > len) ? len - 1 : dic.count - 1;
    
    for ( ; ix < visibleLen; ix++) {
        this._items[ix].css("display", "inline");
        if (this._items[ix].attr("data-status") === "valid") validCount++;
    }
    
    diff = (this._providedTotal > 0) ? (this._providedTotal - validCount) : 0;
    lastVisible = ix - 1;
    
    if (lastVisible > -1 && this._items[lastVisible].attr("data-status") === "invalid" && diff === 0) {
        this._items[lastVisible].css("display", "none");
    }
    for ( ; ix < len; ix++) {
        this._items[ix].css("display", "none");
    }
    if (lastVisible > -1 && this._items[lastVisible].attr("data-status") === "valid" && diff > 0) {
        this._items[lastVisible + 1].css("display", "inline");
    }
    
    this._seeAllCallback(diff);
};

MOE.UI.VirtList.prototype.initialize = function() {
    this._calculateMaxHeight();
    this._updateContent();
};

MOE.UI.VirtList.prototype.add = function(item) {
    this._jqObj.append(item);
    this._items.push(item);
    if (item.attr("data-status") === "valid") this._validCount++;
};

MOE.UI.VirtList.prototype.empty = function() {
    this._items = [];
    this._validCount = 0;
    this._jqObj.empty();
};

MOE.UI.VirtList.prototype.providedTotal = function(val) {
    if (typeof val === "undefined") return this._providedTotal;
    this._providedTotal = val;
};
