/* LinkedIn javascript API should be loaded by this time */

MOE.UI.PeoplePanel = function(containerId, itemSize, itemRenderCallback) {
    if (MOE.Utils.IsUndefOrNull(containerId) || containerId.length === 0) throw "Invalid Argument (containerId)";
    if (MOE.Utils.IsUndefOrNull(itemSize)) throw "Invalid Argument (itemSize)";
    if (MOE.Utils.IsUndefOrNull(itemRenderCallback)) throw "Invalid Argument (itemRenderCallback)";
    
    this._containerId = containerId;
    this._jqContainerId = "#" + containerId;
    this._clientAreaId = containerId + "-client-area";
    this._jqClientAreaId = "#" + this._clientAreaId;
    this._navAreaId = containerId + "-nav-area";
    this._jqNavAreaId = "#" + this._navAreaId;
    this._itemRenderCallback = itemRenderCallback;
    this._itemSize = itemSize;
    this._items = [];
    this._lastDisplayableCount = 0;
    this._navAreaWidth = 64;
    this._currentPage = 0;
    this._clickable = false;
    this._displayedItemsCount = 0;
};

MOE.UI.PeoplePanel.prototype._getDisplayableItemsCount = function() {
    var height = $(this._jqClientAreaId).height(), width = $(this._jqClientAreaId).width(),
        countHorizontal = Math.floor(width / this._itemSize.width),
        countVertical = Math.floor(height / this._itemSize.height);
    
    return countHorizontal * countVertical;
};

MOE.UI.PeoplePanel.prototype._recalulatePage = function() {
    var count = this._getDisplayableItemsCount(), pages = Math.ceil(this._items.length / count);
    if (this._currentPage >= pages) this._currentPage = pages - 1;
    if (this._currentPage < 0) this._currentPage = 0;
};

MOE.UI.PeoplePanel.prototype._resizeHandler = function(e) {
    e.data.me.empty();
    e.data.me._recalulatePage();
    e.data.me.update();
};

MOE.UI.PeoplePanel.prototype._prevHandler = function(e) {
    var count = e.data.owner._getDisplayableItemsCount(), pages = Math.ceil(e.data.owner._items.length / count);
    
    if (e.data.owner._currentPage - 1 > -1) {
        e.data.owner._currentPage--;
        e.data.owner.empty();
        e.data.owner.update();
    }
    
    if (e.data.owner._currentPage - 1 === -1) {
        $(".people-panel-pointer-prev").css("border-right", "6px solid #BBBBBB");
        $(".people-panel-pointer-prev").css("cursor", "default");
    } 
    if (pages > 0) {
        $(".people-panel-pointer-next").css("border-left", "6px solid #777777");
        $(".people-panel-pointer-next").css("cursor", "pointer");
    }
};

MOE.UI.PeoplePanel.prototype._nextHandler = function(e) {
    var count = e.data.owner._getDisplayableItemsCount(), moved = false,
        pages = Math.ceil(e.data.owner._items.length / count);
    if (e.data.owner._currentPage + 1 < pages) {
        moved = true;
        e.data.owner._currentPage++;
        e.data.owner.empty();
        e.data.owner.update();
    }
    if (e.data.owner._currentPage + 1 === pages) {
        $(".people-panel-pointer-next").css("border-left", "6px solid #BBBBBB");
        $(".people-panel-pointer-next").css("cursor", "default");
    } 
    if (e.data.owner._currentPage - 1 === 0 && moved) {
        $(".people-panel-pointer-prev").css("border-right", "6px solid #777777");
        $(".people-panel-pointer-prev").css("cursor", "pointer");
    }
};

MOE.UI.PeoplePanel.prototype._setupNavArea = function() {
    var dispCount = this._getDisplayableItemsCount(), itemsCount = this._items.length,
        navArea = $(this._jqNavAreaId);
    
    if (dispCount < itemsCount) {
        navArea.show();
        if ($(".people-panel-pointer-prev").length === 0) {
            navArea
                .append($("<div>")
                            .attr("class", "people-panel-pointer-prev")
                            .click({"owner":this}, this._prevHandler))
                .append($("<div>")
                            .attr("class", "people-panel-pointer-next")
                            .click({"owner":this}, this._nextHandler));
        }
    } else {
        $(this._jqNavAreaId).hide();
    }
};

MOE.UI.PeoplePanel.prototype._createClientArea = function() {
    if ($(this._jqClientAreaId).length === 0) {
        var jqObj = $(this._jqContainerId);
        jqObj.append($("<div>")
                        .css("display", "table")
                        .css("width", "100%")
                        .css("height", "100%")
                        .css("table-layout", "fixed")
                        .append($("<div>")
                                    .css("display", "table-row")
                                    .css("width", "100%")
                                    .css("height", "100%")
                                    .append($("<div>")
                                                .css("display", "table-cell")
                                                .css("width", "100%")
                                                .css("height", "100%")
                                                .append($("<div>")
                                                            .css("display", "inline-block")
                                                            .css("width", "100%")
                                                            .css("height", "100%")
                                                            .attr("id", this._clientAreaId)))
                                    .append($("<div>")
                                                .css("display", "table-cell")
                                                .css("width", this._navAreaWidth + "px")
                                                .css("height", "100%")
                                                .attr("id", this._navAreaId))));
    } else {
        $(this._jqClientAreaId).empty();
    }
};

MOE.UI.PeoplePanel.prototype.container = function() {
    return $(this._jqClientAreaId);
};

MOE.UI.PeoplePanel.prototype.update = function() {
    if (this._items.length > 0) {
        var ix = 0, len = this._items.length, count = this._getDisplayableItemsCount(),
            base = this._currentPage * count;
        
        for ( ; base < len && ix < count; ix++, base++) {
            this.updateIndex(base);
        }
        this._setupNavArea();
    }
};

MOE.UI.PeoplePanel.prototype.updateIndex = function(index) {
    var displayable = this._getDisplayableItemsCount(), 
        from = this._currentPage * displayable, 
        to = (this._currentPage * displayable) + displayable;
    
    if (index >= from && index < to) {
        this._itemRenderCallback({"contact":this._items[index].contact, "index":index});
    }
};

MOE.UI.PeoplePanel.prototype.addItem = function(item) {
    this._items.push(item);
    
    var displayable = this._getDisplayableItemsCount(), 
        from = this._currentPage * displayable, 
        to = (this._currentPage * displayable) + displayable,
        index = this._items.length - 1;
    
    if (this._displayedItemsCount < displayable && index >= from && index < to) {
        this.updateIndex(this._items.length - 1);
        this._displayedItemsCount++;
    }
};

MOE.UI.PeoplePanel.prototype.empty = function() {
    this._displayedItemsCount = 0;
    $(this._jqClientAreaId).empty();
};

MOE.UI.PeoplePanel.prototype.emptyAll = function() {
    this.empty();
    this._items = new Array();
};

MOE.UI.PeoplePanel.prototype.clickable = function(val) {
    if (typeof val === "undefined") return this._clickable;
    this._clickable = val;
};

MOE.UI.PeoplePanel.prototype.getContact = function(index) {
            return this._items[index].contact;
        };

MOE.UI.PeoplePanel.prototype.initialize = function() {
    this._createClientArea();
    $(this._jqContainerId).css("min-width", this._itemSize.width + this._navAreaWidth + "px");
    $(this._jqClientAreaId).css("min-width", this._itemSize.width + "px");
    $(window).unbind("resize", this._resizeHandler);
    $(window).resize({"me":this}, this._resizeHandler);
};
