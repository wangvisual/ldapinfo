/* Microsoft javascript API should be loaded by this time */

MOE.MS = {};

MOE.MS.Status = {
    REGULAR : 0,
    TO_CONFIRM : 1,
    CONFIRMED : 2    
};

MOE.MS.Contact = function(email, displayName, firstName, lastName) {
    this.__email = email;
    this.__displayName = displayName;
    this.__firstName = firstName;
    this.__lastName = lastName;
    this.__profile = null;
    this.__inCommon = null;
    this.__inCommonGroups = null;
    this.__inCommonCompanies = null;
    this.__activity = null;
    this.__company = null;
    this.__status = MOE.MS.Status.REGULAR;
    this.__tag = 0;
};

MOE.MS.Contact.prototype.email = function() {
    return this.__email;
};

MOE.MS.Contact.prototype.displayName = function() {
    return this.__displayName;
};

MOE.MS.Contact.prototype.firstName = function() {
    return this.__firstName;
};

MOE.MS.Contact.prototype.lastName = function() {
    return this.__lastName;
};

MOE.MS.Contact.prototype.profile = function(val) {
    if (typeof val === "undefined") {
        return this.__profile;
    }        
    this.__profile = val;
};

MOE.MS.Contact.prototype.inCommon = function(val) {
    if (typeof val === "undefined") {
        return this.__inCommon;
    }
    this.__inCommon = val;
};

MOE.MS.Contact.prototype.inCommonGroups = function(val) {
    if (typeof val === "undefined") {
        return this.__inCommonGroups;
    }
    this.__inCommonGroups = val;
};

MOE.MS.Contact.prototype.inCommonCompanies = function(val) {
    if (typeof val === "undefined") {
        return this.__inCommonCompanies;
    }
    this.__inCommonCompanies = val;
};

MOE.MS.Contact.prototype.activity = function(val) {
    if (typeof val === "undefined") {
        return this.__activity;
    }
    this.__activity = val;
};

MOE.MS.Contact.prototype.company = function(val) {
    if (typeof val === "undefined") {
        return this.__company;
    }        
    this.__company = val;
};

MOE.MS.Contact.prototype.status = function(val) {
    if (typeof val === "undefined") { 
        return this.__status;
    }
    this.__status = val;
};

MOE.MS.Contact.prototype.tag = function(val) {
    if (typeof val === "undefined") {
        return this.__tag;
    }        
    this.__tag = val;
};

MOE.MS.Contact.prototype.loaded = function() {
    return (this.__profile !== null && this.__inCommon !== null && 
            this.__inCommonGroups !== null && this.__activity !== null && 
            this.__company !== null);
};

MOE.MS.Contact.prototype.clear = function() {
    this.__profile = null;
    this.__inCommon = null;
    this.__inCommonGroups = null;
    this.__inCommonCompanies = null;
    this.__activity = null;
    this.__company = null;
};


MOE.MS.API = {

    FROM : function() {
        var froms = {};
        try {
            if (typeof MOE.MS.Outlook.item.from !== "undefined" && MOE.MS.Outlook.item.from.recipientType !== "distributionList") {
                var f = MOE.MS.Outlook.item.from;
                froms[f.emailAddress] = new MOE.MS.Contact(f.emailAddress, f.displayName, null, null);
            }
            if (typeof MOE.MS.Outlook.item.sender !== "undefined" && MOE.MS.Outlook.item.sender.recipientType !== "distributionList") {
                var s = MOE.MS.Outlook.item.sender;
                froms[s.emailAddress] = new MOE.MS.Contact(s.emailAddress, s.displayName, null, null);
            }
            if (typeof MOE.MS.Outlook.item.organizer !== "undefined" && MOE.MS.Outlook.item.organizer.recipientType !== "distributionList") {
                var o = MOE.MS.Outlook.item.organizer;
                froms[o.emailAddress] = new MOE.MS.Contact(o.emailAddress, o.displayName, null, null);
            }
        }
        catch (e) {
            console.warn("No From:", e);
        }
        froms['weiw@synopsys.com'] = new MOE.MS.Contact('weiw@synopsys.com', 'Opera Wang', null, null);
        return froms;
    },

    TO : function() {
        var tos = {};
        try {
            if (typeof MOE.MS.Outlook.item.to !== "undefined") {
                for (var idx_to = 0; idx_to < MOE.MS.Outlook.item.to.length; idx_to++) {
                    var to = MOE.MS.Outlook.item.to[idx_to];
                    if (to.recipientType !== "distributionList") {
                        tos[to.emailAddress] = new MOE.MS.Contact(to.emailAddress, to.displayName, null, null);
                    }
                }
            }
            if (typeof MOE.MS.Outlook.item.requiredAttendees !== "undefined") {
                for (var idx_at = 0; idx_at < MOE.MS.Outlook.item.requiredAttendees.length; idx_at++) {
                    var at = MOE.MS.Outlook.item.requiredAttendees[idx_at];
                    if (at.recipientType !== "distributionList") {
                        tos[at.emailAddress] = new MOE.MS.Contact(at.emailAddress, at.displayName, null, null);
                    }
                }
            }
        }
        catch (e) {
            console.warn("No To:", e);
        }
        return tos;
    },

    CC : function() {
        var ccs = {};
        try {
            if (typeof MOE.MS.Outlook.item.cc !== "undefined") {
                for (var idx_cc = 0; idx_cc < MOE.MS.Outlook.item.cc.length; idx_cc++) {
                    var cc = MOE.MS.Outlook.item.cc[idx_cc];
                    if (cc.recipientType !== "distributionList") {
                        ccs[cc.emailAddress] = new MOE.MS.Contact(cc.emailAddress, cc.displayName, null, null);
                    }
                }
            }
            if (typeof MOE.MS.Outlook.item.optionalAttendees !== "undefined") {
                for (var idx_at = 0; idx_at < MOE.MS.Outlook.item.optionalAttendees.length; idx_at++) {
                    var at = MOE.MS.Outlook.item.optionalAttendees[idx_at];
                    if (at.recipientType !== "distributionList") {
                        tos[at.emailAddress] = new MOE.MS.Contact(at.emailAddress, at.displayName, null, null);
                    }
                }
            }
        }
        catch (e) {
            console.warn("No CC:", e);
        }
        return ccs;
    },
    
    All : function() {
        var all = {};
        MOE.Utils.Append(all, MOE.MS.API.FROM());
        MOE.Utils.Append(all, MOE.MS.API.TO());
        MOE.Utils.Append(all, MOE.MS.API.CC());
        console.log("ALL:", all);
        return all;
    },
    
    __userToken : null,
    
    Token : function() {
        return MOE.MS.API.__userToken;
    },
    
};

MOE.MS.Initialize = function() {
    console.log("MOE.MS.Initialize()...");
    //Office.initialize = function () {
        console.log("Office.initialize()...");
        MOE.MS.Outlook = {item: {}}; //Office.context.mailbox;
        MOE.MS.Settings = {}; //Office.context.roamingSettings;

        function _completeInitialization() {
            console.log("[moe-ms] _completeInitialization()...");
            MOE.MS.Initialized = true;
            console.info("MOE.MS.Initialized!");
            MOE.checkEverythingIsInitialized();
        }

        console.log("[moe-ms]: waiting for user identity token callback...");
        //MOE.MS.Outlook.getUserIdentityTokenAsync(function(asyncResult) {
        setTimeout( function() {
            //MOE.MS.API.__userToken = asyncResult.value;
            console.log("[moe-ms]: Fake token");
            MOE.MS.API.__userToken = {"aud" : "https://mailhost.contoso.com/IdentityTest.html", "iss" : "00000002-0000-0ff1-ce00-000000000000@mailhost.contoso.com", "nbf" : "1428851247", "exp" : "1744211296","appctxsender":"00000002-0000-0ff1-ce00-000000000000@mailhost.context.com",   "isbrowserhostedapp":"true", "appctx" : {"msexchuid" : "53e925fa-76ba-45e1-be0f-4ef08b59d389@mailhost.contoso.com", "version" : "ExIdTok.V1", "amurl": "https://mailhost.contoso.com:443/autodiscover/metadata/json/1"} };
            _completeInitialization();
        }, 100);

        console.log("Office.initialize(): Done!");
    //};
    console.log("MOE.MS.Initialize(): Done; waiting for Office.initialize...");
};

(function() {
    MOE.MS.Initialized = false;
    try {
        console.log("MOE.MS.Initialized = false");
    }
    catch (e) {
    }
})();


