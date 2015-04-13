MOE.Utils = {

    FormatTypes : {
        ID: 1,
        EMAIL : 2,
        ME : 3
    },
    
    IsUndefOrNull : function(obj) {
        if (typeof obj === "undefined" || obj === null) {
            return true;
        }
        return false;
    },

    GetLength : function(obj) {
        if (MOE.Utils.IsUndefOrNull(obj)) return 0;
        
        var len = 0;
        if (!Object.keys) {
            /* workaround for IE9 */
            len = (function(o) {
                        var result = [];
                        for(var name in o) {
                            if (o.hasOwnProperty(name))
                              result.push(name);
                        }
                        return result;
                    })(obj).length;
        } else {
            len = Object.keys(obj).length;
        }
        return len;
    },

    IsEmpty : function(obj) {
        var len = MOE.Utils.GetLength(obj);
        return len === 0;
    },
    
    Append : function(dest, src) {
        if (typeof dest === "object" && typeof src === "object") {
            for (k in src) {
                dest[k] = src[k];
            }
        }
    },
    
    ExtractID : function(text) {
        var re = new RegExp("PROF\-([a-zA-Z0-9]+)\-.");
        var matches = re.exec(text);        
        if (matches.length === 2) {
            return matches[1];
        }        
        return null;
    },
    
    GetFormat : function(str) {
        if (str === "me") {
            return MOE.Utils.FormatTypes.ME;
        }
        var re = new RegExp("^[a-zA-Z0-9\._\-]+@[a-zA-Z0-9\.\-]+\.[a-zA-Z]{2,4}$");
        if (re.exec(str) === null) {
            return MOE.Utils.FormatTypes.ID;
        }
        return MOE.Utils.FormatTypes.EMAIL;
    },
    
    EscapeHTML : function(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#x27;").replace(/\//g, "&#x2F;");
    },
    
    UnEscapeHTML : function(str) {
        return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#x27;/g, "'").replace(/&#x2F;/g, "/");
    },
    
    ActivateURLs : function(text) {
        var str = text;
        var matches = str.match(/(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/g);
        if (matches !== null) {
            for (var ix = 0, len = matches.length; ix < len; ix++) {
                str = str.replace(matches[ix], "<a href='" + matches[ix] + "' target='_blank'>" + matches[ix] + "</a>");  
            }
        }
        return str;
    },
    
    MakeImgSecure : function(url) {
        if (!MOE.Utils.IsUndefOrNull(url) && url.length > 0) {
            // url = url.replace("http://media.", "https://www."); // (?)
            url = url.replace(/http:\/\/m([0-9])\.licdn\.com\//, "https://m$1-s.licdn.com/"); // media
            url = url.replace(/http:\/\/s([0-9])\.licdn\.com\//, "https://s$1-s.licdn.com/"); // static
        }
        return url;
    },
    
    GetCallStack : function() {
        var calls = [];
        try { var defVar = undefVar; }
        catch (ex) {
            var stack = ex.stack.split("\n");
            for (var ix = 1, len = stack.length; ix < len; ix++) {
                if (stack[ix].length > 0) {
                    calls.push(stack[ix]);
                }
            }
        }
        return calls;
    },

    LogEvent : function(event) {
        var logTarget = "[id="+$(event.target).attr("id")+"; href="+$(event.target).attr("href")+"]";
        var logMsg = "Event: type=" + event.type + "; phase=" + event.eventPhase + "; target=" + logTarget;
        console.log(logMsg);
        var logElem = $(".moe-utils-event-log").first();
        if (logElem) {
            logElem.empty().append(
                $('<span>').text(logMsg)
            );
        }
    },
    
    Trim : function(str, chr) { 
        var bexpr = "^\\s+", eexpr = "\\s+$";
        if (typeof chr !== "undefined" && chr !== null && chr.length > 0) {
            bexpr = "^[" + chr + "]+";
            eexpr = "[" + chr + "]+$";
        }        
        return str.replace(new RegExp(bexpr, "g"), "").replace(new RegExp(eexpr, "g"), "");
    },
    
    MeasureString : function(str) {
        var objID = "MOEMeasureString", jqObjID = "#" + objID, jqObj = $(jqObjID);
        if (jqObj.length === 0) {
            $("body")
                .append($("<div>")
                            .css("visibility", "hidden")
                            .css("display", "none")
                            .attr("id", objID));
            jqObj = $(jqObjID);
        }
        jqObj.html(str);
        return {"width":jqObj.width(), "height":jqObj.height()};
    },
    
    MeasureJSObj : function(jqObj) {
        return {"width":jqObj.width(), "height":jqObj.height()};
    },

    DataSync : function(name) {
        var __count = 0, __taskCallback = null, __ms = 0, __name = "anonymous";
        
        if (typeof name !== "undefined" && name !== null && name.length > 0) {
            __name = name;
        }
        
        this.setup = function(taskCallback, ms) {
            __taskCallback = taskCallback;
            __ms = ms;
        };
        
        this.launch = function(ms) {
            setTimeout(this.task, ms);
        };
        
        this.addRef = function() {
            __count++;
        };
        
        this.release = function() {
            __count--;
        };
        
        this.count = function() {
            return __count;
        };
        
        this.task = function() {
            if (__count > 0) {
                setTimeout(arguments.callee, __ms);
            } else {
                __taskCallback();
            }
        };
    }
};
