/* LinkedIn javascript API should be loaded by this time */

MOE.IN = {};

MOE.IN.RequestStatus = {
    OK : 1,
    FAIL : 2,
    BAD_URL : 3,
    BAD_ARGUMENT : 4
};

MOE.IN.RelationToViewer = {	
    CONNECTIONS : 1,
    GROUPS : 2,
    COMPANIES : 3
};

MOE.IN.Constants = {
    DOMAIN : "moe.linkedinlabs.com",
    PORT : 443,
    TRK_NAME : "trk",
    TRK_NAME_VALUE : "MOE",
    TRK_VER : "ver",
    TRK_VER_VALUE : "16"
};

MOE.IN.Tracking = {
    AddInfo : function(url) {
        var separator = "?", tracking = MOE.IN.Constants.TRK_NAME + "=" + MOE.IN.Constants.TRK_NAME_VALUE + 
            "&" + MOE.IN.Constants.TRK_VER + "=" + MOE.IN.Constants.TRK_VER_VALUE;
            
        if (url.indexOf("?") > -1) separator = "&";
        
        return url + separator + tracking;
    }
};

MOE.IN.API = {

	__profileFields : ["id", "first-name","last-name", "distance", "picture-url", "public-profile-url", "site-standard-profile-request",
        "headline", "industry", "location:(name)", "positions:(title,company:(id,name))", "three-current-positions:(title,company:(id,name,universal-name))",
		"educations:(school-name)", "api-standard-profile-request:(headers)"],

    __profileFieldsTLC : ["id","first-name","last-name","distance","picture-url","site-standard-profile-request",
        "headline","industry","location:(name)","three-current-positions:(title,company:(id,name))"],

	__groupFields : ["id", "name", "site-group-url"],
	
	__companyFields : ["id", "name", "universal-name", "description", "company-type", "website-url", "industry", 
		"employee-count-range", "logo-url", "square-logo-url", "locations:(description)"],
        
    __maxActivities : 64,
    
    __baseUrl : "https://" + MOE.IN.Constants.DOMAIN + ":" + MOE.IN.Constants.PORT,
    
    __baseAPIUrl : "https://" + MOE.IN.Constants.DOMAIN + ":" + MOE.IN.Constants.PORT + "/pal/v1",
    
    __baseAPIUrlTLC : "https://" + MOE.IN.Constants.DOMAIN + ":" + MOE.IN.Constants.PORT + "/pal2/v1",
    
    __baseOAuthUrl : "https://" + MOE.IN.Constants.DOMAIN + ":" + MOE.IN.Constants.PORT + "/oauth",
    
    __useTLC : true,
    
    __url : function(resource, opts) {
        if (typeof opts === "object") {
            if (typeof opts.auth !== "undefined" && opts.auth === true) {
                return MOE.IN.API.__baseOAuthUrl + resource;
            }
            
            if (typeof opts.base !== "undefined" && opts.base === true) {
                return MOE.IN.API.__baseUrl + resource;
            }
        }
        
        var baseURL = (MOE.IN.API.UseTLC() === true) ? MOE.IN.API.__baseAPIUrlTLC : MOE.IN.API.__baseAPIUrl;
        return baseURL + resource;
    },
    
    __addEscaping : function(url) {
        // return url; // temporary workaround to avoid API Error 500!
        var separator = "?";
        if (url.indexOf("?") > -1) separator = "&";
        return url + separator + "escape=html";
    },
	
	__MakeApiCall : function(url, method, body, callback, useEscaping) {
		if (typeof url === "undefined" || url === null || url.length === 0) {
			callback({ status : MOE.IN.RequestStatus.BAD_URL, content : null });
		}
        
        var settings = {}, ue = (typeof useEscaping !== "undefined") ? useEscaping : false, 
            urlTI = (ue) ? MOE.IN.API.__addEscaping(MOE.IN.Tracking.AddInfo(url)) : 
                MOE.IN.Tracking.AddInfo(url);
        
        settings["headers"] = {
            'X-MOE-MSExchangeUserIdentityToken': MOE.MS.API.Token(),
            'Location': MOE.IN.location.toString(),
            'Device-ID': "myDevice-ID"
        };
        
        settings["cache"] = false;
	
		if (method !== null && method.length > 0) {
			settings["type"] = method;
		}
		
		if (body !== null) {
			settings["data"] = body;
		}
        
        settings["success"] = function(data, textStatus, jqXHR) {
            // console.info("jqXHR Success:", jqXHR.statusText);
            callback({ "status": MOE.IN.RequestStatus.OK, "content": data, "statusHTTP": jqXHR.status });
        };
        
        settings["error"] = function(jqXHR, textStatus, errorThrown) {
            // console.warn("jqXHR ERROR:", jqXHR.statusText);
            callback({ "status": MOE.IN.RequestStatus.FAIL, "content": textStatus, "statusHTTP": jqXHR.status, "jqXHR" : jqXHR });
        };
        
        $.ajax(urlTI, settings);
	},
    
    __profile : function(id, fields, callback, extraData) {
        var wrapper = function(r, e) {
            if (r.status === MOE.IN.RequestStatus.OK && typeof r.content.values !== "undefined") {
                callback({"status":r.status, "content":r.content.values[0]}, e);
            } else {
                callback({"status":MOE.IN.RequestStatus.FAIL}, e);
            }
        };
        MOE.IN.API.__profiles([id], fields, wrapper, extraData);        
    },
    
    __profiles : function(ids, fields, callback, extraData) {
        var request = "/people::", prfs = "";
        
        for (var ix = 0, len = ids.length; ix < len; ix++) {
            if (prfs.length > 0) {
                prfs += ",";
            }
            prfs += MOE.IN.API.__discoverIDFmt(ids[ix]);
        }
        request += "(" + prfs + ")";
        
		if (fields !== null && fields.length > 0) {
			request += ":" + ((MOE.IN.API.UseTLC() === true) ? "public:" : "") + "(" + fields.join(",") + ")";
		} else {
			request += ":" + ((MOE.IN.API.UseTLC() === true) ? "public:" : "") + "(" + MOE.IN.API.__profileFields.join(",") + ")";			
		}
		
		var callbackWrapper = function(response) {
            if (typeof extraData !== "undefined") {
                callback(response, extraData);
            } else {
                callback(response);
            }
        };
		
		MOE.IN.API.__MakeApiCall(MOE.IN.API.__url(request), "GET", null, callbackWrapper, true);
    },
    
    __discoverIDFmt : function(id) {
        var sid = "", fmt = MOE.Utils.GetFormat(id);
        if (fmt === MOE.Utils.FormatTypes.ID) {
            sid = "id=" + id;
        } else if (fmt === MOE.Utils.FormatTypes.EMAIL) {
            sid = "email=" + id;
        } else if (fmt === MOE.Utils.FormatTypes.ME) {
            sid += "~";
        }
        return sid;
    },
    
    UseTLC : function(val) {
        if (typeof val === "undefined") {
            return MOE.IN.API.__useTLC;
        }
        MOE.IN.API.__useTLC = val;
    },
    
    IsAlive : function(callback) {
        var request = "/checkLogin";
        var callbackWrapper = function(response) {
            if (typeof extraData !== "undefined") {
                callback(response, extraData);
            } else {
                callback(response);
            }
        };
        MOE.IN.API.__MakeApiCall(MOE.IN.API.__url(request, {"auth":true}), "GET", null, callbackWrapper);
    },

    Signin : function(email, password, callback) {
        var request = "/directLogin";
        var content = "linked_member_id=" + email + "&linked_password=" + password;
        
        var callbackWrapper = function(response) {
            if (typeof extraData !== "undefined") {
                callback(response, extraData);
            } else {
                callback(response);
            }
        };
        
        MOE.IN.API.__MakeApiCall(MOE.IN.API.__url(request, {"auth":true}), "POST", content, callbackWrapper);
    },

	Profile : function(id, fields, callback, extraData) {
        var tyof = typeof id; 
        if (tyof === "string") {
            MOE.IN.API.__profile(id, fields, callback, extraData);
        } else if (tyof === "object") {
            if (id instanceof Array) {
                MOE.IN.API.__profiles(id, fields, callback, extraData);
            }
        }
	},
	
	Search : function(si, fields, callback, extraData) {
        if (si === null) {
			callback({ status : MOE.IN.RequestStatus.BAD_ARGUMENT, content : "No search parameters!" });
		}
    
		var request = "/people-search";
		if (fields !== null && fields.length > 0) {
			request += ":(people:(" + fields.join(",") + "),num-results)";
		}
		else {
			request += ":(people:(" + MOE.IN.API.__profileFields.join(",") + "),num-results)";			
		}
		
		request += "?";
		
		if (typeof si.firstName !== "undefined" && si.firstName !== null && si.firstName.length > 0) {			
			request += "first-name=" + si.firstName;
		}
		
		if (typeof si.lastName !== "undefined" && si.lastName !== null && si.lastName.length > 0) {
			if (request.lastIndexOf("?") < (request.length - 1)) {
				request += "&"
			}
			request += "last-name=" + si.lastName;
		}
		
		if (typeof si.keywords !== "undefined" && si.keywords !== null && si.keywords.length > 0) {			
			if (request.lastIndexOf("?") < (request.length - 1)) {
				request += "&"
			}
			request += "keywords=" + si.keywords;
		}
		
		if (typeof si.company !== "undefined" && si.company !== null && si.company.length > 0) {			
			if (request.lastIndexOf("?") < (request.length - 1)) {
				request += "&"
			}
			request += "company-name=" + si.company;
		}
		
		if (typeof si.paging !== "undefined") {
			if (request.lastIndexOf("?") < (request.length - 1)) {
				request += "&"
			}
			request += "start=" + si.paging.start + "&count=" + si.paging.count;
		}
		
		var callbackWrapper = function(response) {
            if (typeof extraData !== "undefined") {
                callback(response, extraData);
            } else {
                callback(response);
            }
        };
		
		MOE.IN.API.__MakeApiCall(MOE.IN.API.__url(request), "GET", null, callbackWrapper, true);
	},
    
    Groups : function(id, fields, callback, extraData) {
		var request = "/people/" + MOE.IN.API.__discoverIDFmt(id);
		if (fields !== null && fields.length > 0) {
			request += "/group-memberships:(group:(" + fields.join(",") + "))";
		} else {
			request += "/group-memberships:(group:(" + MOE.IN.API.__groupFields.join(",") + "))";
		}
		request += "?start=0&count=64";
		
		var callbackWrapper = function(response) {
            if (typeof extraData !== "undefined") {
                callback(response, extraData);
            } else {
                callback(response);
            }
        };
		
		MOE.IN.API.__MakeApiCall(MOE.IN.API.__url(request), "GET", null, callbackWrapper, true);
	},
	
	Companies : function(id, callback) {
        var request = "/people/" + MOE.IN.API.__discoverIDFmt(id) + ":(positions:(company:(id,name)))" +
		    "?start=0&count=64";
		
		var callbackWrapper = function(response) {
            if (typeof extraData !== "undefined") {
                callback(response, extraData);
            } else {
                callback(response);
            }
        };
		
		MOE.IN.API.__MakeApiCall(MOE.IN.API.__url(request), "GET", null, callbackWrapper, true);
    },
	
	Related : function(id, to, callback, extraData) {
		var request = "/people/" + MOE.IN.API.__discoverIDFmt(id);
		if (to === MOE.IN.RelationToViewer.CONNECTIONS) {
			request += ":(relation-to-viewer:(distance,related-connections))?start=0&count=64";            
            var callbackWrapper = function(response) {
                if (typeof extraData !== "undefined") {
                    callback(response, extraData);
                } else {
                    callback(response);
                }
            };            
            MOE.IN.API.__MakeApiCall(MOE.IN.API.__url(request), "GET", null, callbackWrapper, true);
		} else if (to === MOE.IN.RelationToViewer.GROUPS) {
			MOE.IN.API.Groups(id, null, function(r, e) {
                if (r.status === MOE.IN.RequestStatus.OK) {
                    var their = r.content, groups = [];
                    MOE.IN.Cache.OwnGroupMemberships(function(mine) {
                        if (typeof mine.values !== "undefined" && typeof their.values !== "undefined") {
                            for (var ix = 0, leni = mine.values.length; ix < leni; ix++) {
                                for (var jx = 0, lenj = their.values.length; jx < lenj; jx++) {
                                    if (mine.values[ix].group.id === their.values[jx].group.id) {
                                        groups.push(their.values[jx]);
                                    }
                                }
                            }
                        }
                        callback({"status": MOE.IN.RequestStatus.OK, "content": groups}, extraData);
                    });
                } else {
                    callback({"status": MOE.IN.RequestStatus.FAIL}, extraData);
                }
            });
		} else if (to === MOE.IN.RelationToViewer.COMPANIES) {
		    MOE.IN.API.Companies(id, function(r, e) {
                if (r.status === MOE.IN.RequestStatus.OK) {
                    var their = r.content.positions, companies = [];
                    MOE.IN.Cache.OwnCompanies(function(mine) {
                        var usedIds = {};
                        if (typeof mine.positions.values !== "undefined" && typeof their.values !== "undefined") {
                            for (var ix = 0, leni = mine.positions.values.length; ix < leni; ix++) {
                                for (var jx = 0, lenj = their.values.length; jx < lenj; jx++) {
                                    if (typeof their.values[jx].company.id !== "undefined" && 
                                        mine.positions.values[ix].company.id === their.values[jx].company.id) {
                                        if (typeof usedIds[their.values[jx].company.id] === "undefined") {
                                            companies.push(their.values[jx].company);
                                            usedIds[their.values[jx].company.id] = true;
                                        }
                                    }
                                }
                            }
                        }
                        callback({"status": MOE.IN.RequestStatus.OK, "content": companies}, extraData);
                    });
                } else {
                    callback({"status": MOE.IN.RequestStatus.FAIL}, extraData);
                }
            });
		}
	},
	
	NetworkUpdates : function(callback, extraData) {
		var request = "/people/~/network/updates?type=PRFU&start=0&count=" + 
            MOE.IN.API.__maxActivities;
            
		var callbackWrapper = function(response) {
            if (typeof extraData !== "undefined") {
                callback(response, extraData);
            } else {
                callback(response);
            }
        };
        
		MOE.IN.API.__MakeApiCall(MOE.IN.API.__url(request), "GET", null, callbackWrapper, true);
	},
    
    RecentActivity : function(id, callback, extraData) {
        var types = ["type=RECU","type=JGRP","type=STAT","type=CONN","type=PRFU","type=VIRL","type=MSFC"],
            request = "/people/" + MOE.IN.API.__discoverIDFmt(id) + "/network/updates?" + types.join("&") + "&scope=self&start=0&count=" + 
            MOE.IN.API.__maxActivities;
        
        var callbackWrapper = function(response) {
            if (typeof extraData !== "undefined") {
                callback(response, extraData);
            } else {
                callback(response);
            }
        };
        
		MOE.IN.API.__MakeApiCall(MOE.IN.API.__url(request), "GET", null, callbackWrapper, true);
	},
	
	Company : function(id, fields, callback, extraData) {
		var request = "/companies/";
        
        if (isNaN(id)) {
            request += "universal-name=" + id;
        } else {
            request += id;
        }
        
		if (fields !== null && fields.length > 0) {
			request += ":(" + fields.join(",") + ")";
		} else {
			request += ":(" + MOE.IN.API.__companyFields.join(",") + ")";
		}
		
		var callbackWrapper = function(response) {
            if (typeof extraData !== "undefined") {
                callback(response, {"extraData" : extraData, "key" : id});
            } else {
                callback(response);
            }
        };
		
		MOE.IN.API.__MakeApiCall(MOE.IN.API.__url(request), "GET", null, callbackWrapper, true);
	},
    
    VerifyDomain : function(domain, callback) {
        var request = "/companies?email-domain=" + domain;
        var callbackWrapper = function(response) {
            if (typeof extraData !== "undefined") {
                callback(response, extraData);
            } else {
                callback(response);
            }
        };		
		MOE.IN.API.__MakeApiCall(MOE.IN.API.__url(request), "GET", null, callbackWrapper, true);
    },
    
    Like : function(id, liked, callback, extraData) {
        var request = "/people/~/network/updates/key=" + id + "/is-liked";
        var callbackWrapper = function(response) {
            if (typeof callback !== "undefined" && callback !== null) {
                if (typeof extraData !== "undefined") {
                    callback(response, extraData);
                } else {
                    callback(response);
                }
            }
        };  

		MOE.IN.API.__MakeApiCall(MOE.IN.API.__url(request), "PUT", JSON.stringify(liked), callbackWrapper);
    },
    
    Follow : function(cid, callback, extraData) {
        var request = "/people/~/following/companies";
        var body = { "id":cid };
        
        var callbackWrapper = function(response) {
            if (typeof extraData !== "undefined") {
                callback(response, extraData);
            } else {
                callback(response);
            }
        };
        
		MOE.IN.API.__MakeApiCall(MOE.IN.API.__url(request), "POST", JSON.stringify(body), callbackWrapper);
    },
    
    Following : function(callback, extraData) {
        var request = "/people/~/following/companies:(id)?start=0&count=256";
        var callbackWrapper = function(response) {
            if (typeof extraData !== "undefined") {
                callback(response, extraData);
            } else {
                callback(response);
            }
        };       
		MOE.IN.API.__MakeApiCall(MOE.IN.API.__url(request), "GET", null, callbackWrapper, true);
    },
    
    Connect : function(contact, callback, extraData) {
        var request = "/people/~/mailbox";
        var body = {
            "recipients":
            { 
                "recipient":
                {
                    "person":
                    {
                        "_path":"/people/email=" + contact.email,
                        "first-name":contact.firstName,
                        "last-name":contact.lastName
                    }
                }
            },
            "subject":"Invitation to Connect",
            "body":"Please join my professional network on LinkedIn.",
            "item-content":{"invitation-request":{"connect-type":"friend"}}
        };
        var callbackWrapper = function(response) {
            if (typeof extraData !== "undefined") {
                callback(response, extraData);
            } else {
                callback(response);
            }
        };       
		MOE.IN.API.__MakeApiCall(MOE.IN.API.__url(request), "POST", JSON.stringify(body), callbackWrapper);
    },
    
    RegisterContact : function(email, id, prfApiId, callback, extraData) {
        var request = "/contacts", body = { "email":email, "id":id, "prfapiid":prfApiId };
            
        var callbackWrapper = function(response) {
            if (typeof extraData !== "undefined") {
                callback(response, extraData);
            } else {
                callback(response);
            }
        };
        MOE.IN.API.__MakeApiCall(MOE.IN.API.__url(request, {"base":true}), "POST", JSON.stringify(body), callbackWrapper);
    },
    
    UnregisterContact : function(email, callback, extraData) {
        var request = "/contacts", body = { "email":email };
            
        var callbackWrapper = function(response) {
            if (typeof extraData !== "undefined") {
                callback(response, extraData);
            } else {
                callback(response);
            }
        };
        MOE.IN.API.__MakeApiCall(MOE.IN.API.__url(request, {"base":true}), "DELETE", JSON.stringify(body), callbackWrapper);
    },
	
	Logout : function(callback, extraData) {
        var request = "/logout";
		var callbackWrapper = function(response) {
            if (typeof extraData !== "undefined") {
                callback(response, extraData);
            } else {
                callback(response);
            }
        };        
		MOE.IN.API.__MakeApiCall(MOE.IN.API.__url(request, {"auth":true}), "GET", null, callbackWrapper);
	}
};

MOE.IN.Cache = {

    OwnProfile : function(callback) {
		var callbackWrapper = function(response) {
            callback(response);
        };
        if (MOE.Store.Local.Contains("self:profile")) {
            callbackWrapper(MOE.Store.Local.Get("self:profile"));
        }
        else {
            MOE.IN.API.Profile("me", ["id","first-name","last-name"], function(response) {
                MOE.Store.Local.Add("self:profile", response.content);
                callbackWrapper(MOE.Store.Local.Get("self:profile"));
            });
        }
    },

    OwnFollowingCompanies : function(callback) {
		var callbackWrapper = function(response) {
            callback(response);
        };
        if (MOE.Store.Local.Contains("self:following-companies")) {
            callbackWrapper(MOE.Store.Local.Get("self:following-companies"));
        }
        else {
            MOE.IN.API.Following(function(res) {
                var cpies = (res.status === MOE.IN.RequestStatus.OK && res.content._total > 0) ? res.content.values : null;
                MOE.Store.Local.Add("self:following-companies", cpies);
                callbackWrapper(MOE.Store.Local.Get("self:following-companies"));
            });
        }
    },

	OwnGroupMemberships : function(callback) {
		var callbackWrapper = function(response) {
            callback(response);
        };
        if (MOE.Store.Local.Contains("self:group-memberships")) {
            callbackWrapper(MOE.Store.Local.Get("self:group-memberships"));
        }
        else {
            MOE.IN.API.Groups("me", null, function(res) {
                MOE.Store.Local.Add("self:group-memberships", (res.status === MOE.IN.RequestStatus.OK) ? res.content : null);
                callbackWrapper(MOE.Store.Local.Get("self:group-memberships"));
            });
        }
	},
	
	OwnCompanies : function(callback) {
		var callbackWrapper = function(response) {
            callback(response);
        };
        if (MOE.Store.Local.Contains("self:companies")) {
            callbackWrapper(MOE.Store.Local.Get("self:companies"));
        }
        else {
            MOE.IN.API.Companies("me", function(res) {
                MOE.Store.Local.Add("self:companies", (res.status === MOE.IN.RequestStatus.OK) ? res.content : null);
                callbackWrapper(MOE.Store.Local.Get("self:companies"));
            });
        }
	}

};

MOE.IN.Events = {

    __handlers : {},
    
    On : function(eName, eHandler) {
        if (typeof MOE.IN.Events.__handlers[eName] === "undefined") {
            MOE.IN.Events.__handlers[eName] = [];
        }
        MOE.IN.Events.__handlers[eName].push(eHandler);
    },
    
    Call : function(eName, args) {
        if (typeof MOE.IN.Events.__handlers[eName] !== "undefined") {
            var handlers = MOE.IN.Events.__handlers[eName];
            for (var ix = 0, len = handlers.length; ix < len; ix++) {              
                (function(cb, cbArgs) {
                    if (typeof cbArgs !== "undefined") {
                        setTimeout(function() { cb.call(null, cbArgs); }, 0);
                    } else {
                        setTimeout(function() { cb.call(null); }, 0);    
                    }
                })(handlers[ix], args);
            }
        }
    },
    
    Remove : function(eName) {
        if (typeof MOE.IN.Events.__handlers[eName] !== "undefined") {
            delete MOE.IN.Events.__handlers[eName];
        }
    }
};

MOE.IN.Initialize = function() {
    console.log("MOE.IN.Initialize()...");
    MOE.IN.Events.On("auth", function() {
        console.log("MOE.IN.Initialize: Event >> 'auth'");
        MOE.UI.Loading.Show();
        MOE.UI.Menu.Initialize();
        MOE.onAuthChange();
    });
    MOE.IN.Events.On("tlc", function() {
        console.log("MOE.IN.Initialize: Event >> 'tlc'");
        MOE.UI.Loading.Show();
        MOE.UI.Menu.Disable();
        MOE.onAuthChange();
    });
    MOE.IN.location = new Location ();
    MOE.IN.location.request();
    MOE.IN.Initialized = true;
    console.info("MOE.IN.Initialized!");
    MOE.checkEverythingIsInitialized();
    console.log("MOE.IN.Initialize(): Done; waiting for onAuth event...");
};

(function () {
    MOE.IN.Initialized = false;
    try {
        console.log("MOE.IN.Initialized = false");
    }
    catch (e) {
    }
})();
