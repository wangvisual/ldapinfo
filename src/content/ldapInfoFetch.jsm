// copy from ldap_contact_photo https://addons.mozilla.org/en-US/thunderbird/addon/ldap-contact-photo/ by Piotr Piastucki
// license: MPL
// Modified by Opera Wang to enable queue and timeout etc.

"use strict";
var EXPORTED_SYMBOLS = ["ldapInfoFetch"];
const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, results: Cr, manager: Cm } = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("chrome://ldapInfo/content/log.jsm");
Cu.import("chrome://ldapInfo/content/ldapInfoUtil.jsm");

let ldapInfoFetch =  {
    ldapConnections: {}, // {dn : connection}, should I use nsILDAPService?
    queue: [], // request queue
    lastTime: Date.now(), // last connection use time
    currentAddress: null,
    timer: null,

    getPasswordForServer: function (serverUrl, hostName, login, force, realm) {
        let passwordManager = Services.logins;
        if (passwordManager) {
            
            let password = { value: "" };
            let check = { value: false };
            let oldLoginInfo;
            try {    
                let logins = passwordManager.findLogins({}, serverUrl, null, realm);            
                let foundCredentials = false;
                for (let i = 0; i < logins.length; i++) {
                    if (logins[i].username == '' || logins[i].username == login) {
                        password.value = logins[i].password;
                        foundCredentials = true;
                        oldLoginInfo = logins[i];
                        break;
                    }
                }
                if(foundCredentials & (!force)) {
                    return password.value;
                }
            } catch(e) {}
            let strBundle = Services.strings.createBundle('chrome://mozldap/locale/ldap.properties');
            let strBundle2 = Services.strings.createBundle('chrome://passwordmgr/locale/passwordmgr.properties');

            let prompts = Services.prompt;
            let okorcancel = prompts.promptPassword(null, strBundle.GetStringFromName("authPromptTitle"), 
                                strBundle.formatStringFromName("authPromptText", [hostName + " photo"], 1),
                                password, 
                                strBundle2.GetStringFromName("rememberPassword"),
                                check);
            if(!okorcancel) {
                return;
            }
            if(check.value) {
                let nsLoginInfo = new Cc("@mozilla.org/login-manager/loginInfo;1", Ci.nsILoginInfo, "init");     
                let loginInfo = new nsLoginInfo(serverUrl, null, realm, "", password.value,"", "");
                try {        
                    if(oldLoginInfo) {
                      passwordManager.modifyLogin(oldLoginInfo, loginInfo);
                    } else {
                      passwordManager.addLogin(loginInfo);
                    }
                } catch(e){}
            }
            return password.value;
        }
        return false;
    },
    
    getErrorMsg: function(pStatus) {
        for ( let p in Cr ) {
            if ( Cr[p] == pStatus ) {
                return p;
            }
        }
        return 'Unknown Error';
    },

    photoLDAPMessageListener: function (callbackData, connection, bindPassword, dn, scope, filter, attributes) {
        this.callbackData = callbackData;
        this.connection = connection;
        this.bindPassword = bindPassword;
        this.dn = dn;
        this.scope = scope;
        this.filter = filter;
        this.attributes = attributes;
        this.QueryInterface = XPCOMUtils.generateQI([Ci.nsISupports, Ci.nsILDAPMessageListener]);
        
        this.onLDAPInit = function(pConn, pStatus) {
            let fail = "";
            try {
                ldapInfoLog.info("onLDAPInit");
                if ( pStatus === Cr.NS_OK ) {
                    let ldapOp = Cc["@mozilla.org/network/ldap-operation;1"].createInstance().QueryInterface(Ci.nsILDAPOperation);
                    this.callbackData.ldapOp = ldapOp;
                    ldapOp.init(pConn, this, null);
                    ldapOp.simpleBind(this.bindPassword);
                    return;
                }
                fail = pStatus.toString(16) + ": " + ldapInfoFetch.getErrorMsg(pStatus);
            } catch (err) {
                ldapInfoLog.logException(err);
                fail = "exception!";
            }
            ldapInfoLog.info("onLDAPInit failed with " + fail);
            this.connection = null;
            //this.callbackData.ldap['_filter'] = [this.filter];
            this.callbackData.ldap['_Status'] = [fail];
            ldapInfoFetch.callBackAndRunNext(this.callbackData); // with failure
        };
        this.startSearch = function(cached) {
            try {
                let ldapOp = Cc["@mozilla.org/network/ldap-operation;1"].createInstance().QueryInterface(Ci.nsILDAPOperation);
                this.callbackData.ldapOp = ldapOp;
                ldapOp.init(this.connection, this, null);
                let timeout = ldapInfoUtil.options['ldapTimeoutInitial'];
                if ( cached ) timeout = ldapInfoUtil.options['ldapTimeoutWhenCached'];
                ldapInfoLog.info("startSearch dn:" + this.dn + " filter:" + this.filter + " scope:" + this.scope + " attributes:" + this.attributes);
                ldapOp.searchExt(this.dn, this.scope, this.filter, this.attributes, /*aTimeOut, not implemented yet*/(timeout-1)*1000, /*aSizeLimit*/1);
                ldapInfoFetch.lastTime = Date.now();
                if ( !ldapInfoFetch.timer ) ldapInfoFetch.timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
                ldapInfoFetch.timer.initWithCallback( function() { // can be function, or nsITimerCallback
                    ldapInfoLog.log("ldapInfoShow searchExt timeout " + timeout + " reached", 1);
                    try {
                        ldapOp.abandonExt();
                    } catch (err) {};
                    ldapInfoFetch.clearCache();
                    ldapInfoFetch.callBackAndRunNext({address: 'retry'}); // retry current search
                }, timeout * 1000, Ci.nsITimer.TYPE_ONE_SHOT );
            }  catch (err) {
                ldapInfoLog.info("search issue");
                ldapInfoLog.logException(err);
                this.callbackData.ldap['_Status'] = ["startSearch Fail"];
                ldapInfoFetch.clearCache();
                ldapInfoFetch.callBackAndRunNext(this.callbackData); // with failure
            }
        };
        this.onLDAPMessage = function(pMsg) {
            try {
                ldapInfoLog.info('get msg with type ' + pMsg.type.toString(16) );
                switch (pMsg.type) {
                    case Ci.nsILDAPMessage.RES_BIND :
                        if ( pMsg.errorCode == Ci.nsILDAPErrors.SUCCESS ) {
                            ldapInfoFetch.ldapConnections[this.dn] = this.connection;
                            this.startSearch(false);
                        } else {
                            ldapInfoLog.log('ldapInfoShow bind fail');
                            try {
                                pMsg.operation.abandonExt();
                            } catch (err) {};
                            //this.callbackData.ldap['_filter'] = [this.filter];
                            this.callbackData.ldap['_Status'] = ['Bind Error ' + pMsg.errorCode.toString(16)];
                            this.connection = null;
                            ldapInfoFetch.callBackAndRunNext(this.callbackData); // with failure
                        }
                        break;
                    case Ci.nsILDAPMessage.RES_SEARCH_ENTRY :
                        let count = {};
                        let attrs = pMsg.getAttributes(count); // count.value is number of attributes
                        let image_bytes = null;
                        for(let attr of attrs) {
                            if ( ['thumbnailphoto', 'jpegphoto', 'photo'].indexOf(attr.toLowerCase()) >= 0 ) {
                                if ( !image_bytes && !this.callbackData.validImage ) {
                                    let values = pMsg.getBinaryValues(attr, count); //[xpconnect wrapped nsILDAPBERValue]
                                    if (values && values.length > 0 && values[0]) {
                                        image_bytes = values[0].get(count);
                                    }
                                }
                            } else {
                                if ( typeof (this.callbackData.ldap) == 'undefined' ) this.callbackData.ldap = {};
                                this.callbackData.ldap[attr] = pMsg.getValues(attr, count);
                            }
                        }
                        if (image_bytes && image_bytes.length > 2) {
                            let win = this.callbackData.win.get();
                            if ( win && win.btoa ) {
                                let encImg = win.btoa(String.fromCharCode.apply(null, image_bytes));
                                this.callbackData.src = "data:image/jpeg;base64," + encImg;
                                this.callbackData.validImage = true;
                            }
                        }
                        this.callbackData.ldap['_dn'] = [pMsg.dn];
                        this.callbackData.ldap['_Status'] = ['Query Successful'];
                        break;
                    case Ci.nsILDAPMessage.RES_SEARCH_RESULT :
                    default:
                        if ( typeof(this.callbackData.ldap['_Status']) == 'undefined' ) {
                            ldapInfoLog.info("No Match for " + this.callbackData.address + " with error: " + this.connection.errorString, "Not Match");
                            this.callbackData.ldap['_dn'] = [this.callbackData.address];
                            this.callbackData.ldap['_Status'] = ['No Match'];
                        }
                        this.connection = null;
                        ldapInfoFetch.callBackAndRunNext(this.callbackData);
                        break;
                }
            } catch (err) {
                ldapInfoLog.logException(err);
            }
        };
    },

    clearCache: function () {
        ldapInfoLog.info("clear ldapConnections");
        this.ldapConnections = {};
    },
    
    cleanup: function() {
        try {
            ldapInfoLog.info("ldapInfoFetch cleanup");
            this.clearCache();
            if ( this.timer ) this.timer.cancel();
            if ( this.queue.length >= 1 && typeof(this.queue[0][0]) != 'undefined' ) {
                let callbackData = this.queue[0][0];
                if ( typeof(callbackData.ldapOp) != 'undefined' ) {
                    try {
                        ldapInfoLog.info("ldapInfoFetch abandonExt");
                        callbackData.ldapOp.abandonExt();
                    } catch (err) {};
                }
            }
            this.queue = [];
        } catch (err) {
            ldapInfoLog.logException(err);
        }
        ldapInfoLog.info("ldapInfoFetch cleanup done");
        this.currentAddress = this.timer = ldapInfoLog = ldapInfoUtil = null;
    },
    
    callBackAndRunNext: function(callbackData) {
        ldapInfoLog.info('callBackAndRunNext, now is ' + callbackData.address);
        if ( this.timer ) this.timer.cancel();
        if ( typeof(callbackData.ldapOp) != 'undefined' ) {
            ldapInfoFetch.lastTime = Date.now();
            delete callbackData.ldapOp;
        }
        ldapInfoFetch.queue = ldapInfoFetch.queue.filter( function (args) { // call all callbacks if for the same address
            let cbd = args[0];
            if ( cbd.address != callbackData.address ) return true;
            try {
                if ( !( cbd === callbackData ) ) {
                    if ( typeof(callbackData.src) != 'undefined' ) cbd.src = callbackData.src;
                    cbd.validImage = callbackData.validImage;
                    for ( let i in callbackData.ldap ) {
                        cbd.ldap[i] = callbackData.ldap[i];
                    }
                }
                cbd.image.classList.remove('ldapInfoLoading');
                //cbd.image.classList.remove('ldapInfoLoadingQueue');
                cbd.callback(cbd);
            } catch (err) {
                ldapInfoLog.logException(err);
            }
            return false;
        });
        ldapInfoLog.logObject(this.queue.map( function(one) {
            return one[5];
        } ), 'after queue', 0);
        if (ldapInfoFetch.queue.length >= 1) {
            this._fetchLDAPInfo.apply(ldapInfoFetch, ldapInfoFetch.queue[0]);
        }
    },
    
    queueFetchLDAPInfo: function(...theArgs) {
        ldapInfoLog.info('queueFetchLDAPInfo');
        this.queue.push(theArgs);
        let callbackData = theArgs[0];
        if (this.queue.length === 1) {
            ldapInfoLog.info('first');
            this._fetchLDAPInfo.apply(this, theArgs);
        } else {
            let className = 'ldapInfoLoadingQueue';
            if ( callbackData.address == this.currentAddress ) className = 'ldapInfoLoading';
            callbackData.image.classList.add(className);
            ldapInfoLog.logObject(this.queue.map( function(one) {
                return one[5];
            } ), 'new queue', 0);
        }
    },

    _fetchLDAPInfo: function (callbackData, host, prePath, basedn, binddn, filter, attribs) {
        try {
            let password = null;
            this.currentAddress = callbackData.address;
            this.queue.forEach( function(args) {
                if ( args[0].address == ldapInfoFetch.currentAddress ) {
                    args[0].image.classList.remove('ldapInfoLoadingQueue');
                    args[0].image.classList.add('ldapInfoLoading');
                }
            } );
            // ldap://directory.foo.com/o=foo.com??sub?(objectclass=*)
            let urlSpec = prePath + '/' + basedn + "?" + attribs + "?sub?" +  filter;
            if ( typeof(binddn) == 'string' && binddn != '' ) {
                password = this.getPasswordForServer(prePath, host, binddn, false, urlSpec);
                if (password == "") password = null;
                else if (!password) {
                    callbackData.ldap['_Status'] = ['No Password'];
                    this.callBackAndRunNext(callbackData);
                }
            }
            let ldapconnection = this.ldapConnections[basedn];
            // if idle too long, might get disconnected and later we won't get notified
            if ( ldapconnection && ( Date.now() - this.lastTime ) >= ldapInfoUtil.options.ldapIdleTimeout * 1000 ) {
                ldapInfoLog.info("invalidate cached connection");
                ldapconnection = null;
                delete this.ldapConnections[basedn];
            }
            if (ldapconnection) {
                ldapInfoLog.info("use cached connection");
                try {
                    let connectionListener = new this.photoLDAPMessageListener(callbackData, ldapconnection, password, basedn, Ci.nsILDAPURL.SCOPE_SUBTREE, filter, attribs);
                    connectionListener.startSearch(true);
                    return; // listener will run next
                } catch (err) {
                    ldapInfoLog.info("cached issue " + ldapconnection.errorString);
                    ldapInfoLog.logException(err);
                    this.clearCache();
                }
            }
            ldapInfoLog.info("create new connection");
            ldapconnection = Cc["@mozilla.org/network/ldap-connection;1"].createInstance().QueryInterface(Ci.nsILDAPConnection);
            let connectionListener = new this.photoLDAPMessageListener(callbackData, ldapconnection, password, basedn, Ci.nsILDAPURL.SCOPE_SUBTREE, filter, attribs);
            let url = Services.io.newURI(urlSpec, null, null).QueryInterface(Ci.nsILDAPURL);
            ldapconnection.init(url, binddn, connectionListener, /*nsISupports aClosure*/null, ldapconnection.VERSION3);
        } catch (err) {
            ldapInfoLog.logException(err);
            //callbackData.ldap['_filter'] = [filter];
            callbackData.ldap['_Status'] = ['Exception'];
            this.callBackAndRunNext(callbackData); // with failure
        }
    }
}