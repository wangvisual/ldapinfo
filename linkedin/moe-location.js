function Location () {
    this.options = {
        timeout:60000
    };
}

Location.prototype.request = function () {    
    var that = this;
    console.info ("Requesting location...");

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function (position) {
                that.position = position;

                console.info ("Location obtain.");
            }, 
            function (err) {
                that.err = err;

                var msg = that.errorToString(err);
                console.info ("Couldn't obtain location : " + msg);
            },
            this.options);
    } else  {
        console.info ("Couldn't obtain location : Browser does not support geolocation");
    }
}

Location.prototype.get = function () {
    return this.position;
}

Location.prototype.toString = function () {
    if ((typeof (this.position) !== "undefined") && (typeof (this.position.coords) !== "undefined")) {
        return this.position.coords.latitude + "," + this.position.coords.longitude;
    }
    else {
        return "0,0";
    }
}

Location.prototype.getError = function () {
    if ((typeof (this.err) !== "undefined")) {
        return this.err;
    }
    else {
        return "No error";
    }
}

Location.prototype.errorToString = function (err) {
    var msg = "";
    switch (err.code) {
        case 0 :
            msg = "Unkown error, " + err.message;
            break;
        case 1 :
            msg = "Access is denied"
            break;
        case 2 :
            msg = "Position is unavailable";
            break;
        case 3 :
            msg = "Timeout";
            break;
        default :
            msg = "Unkown error, code : " + err.code + ", message : " + err.message;
            break;
    }
    return msg;
}