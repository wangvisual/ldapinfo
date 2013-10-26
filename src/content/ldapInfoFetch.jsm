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
Cu.import("chrome://ldapInfo/content/sprintf.jsm");

let ldapInfoFetch =  {
    ldapConnections: {}, // {dn : connection}, should I use nsILDAPService?
    queue: [], // request queue
    lastTime: Date.now(), // last connection use time
    currentAddress: null,
    timer: null,
    fetchTimer: null,

    getPasswordForServer: function (serverUrl, hostName, login /*binddn*/, force, realm) {
        ldapInfoLog.info('getPasswordForServer ' + serverUrl + ' login:' + login);
        let passwordManager = Services.logins;
        if (passwordManager) {
            
            let password = { value: "" };
            let check = { value: true };
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
            } catch(err) {
                ldapInfoLog.logException(err);
            }
            let strBundle = Services.strings.createBundle('chrome://mozldap/locale/ldap.properties');
            let strBundle2 = Services.strings.createBundle('chrome://passwordmgr/locale/passwordmgr.properties');

            let prompts = Services.prompt;
            let okorcancel = prompts.promptPassword(null, strBundle.GetStringFromName("authPromptTitle"), 
                                strBundle.formatStringFromName("authPromptText", [login + '@' + hostName], 1), // Please enter your password for %1$S.
                                password, 
                                strBundle2.GetStringFromName("rememberPassword"),
                                check);
            if(!okorcancel) {
                return;
            }
            if(check.value) {
                let nsLoginInfo = new CC("@mozilla.org/login-manager/loginInfo;1", Ci.nsILoginInfo, "init");
                let loginInfo = new nsLoginInfo(serverUrl, null, realm, "", password.value, "", ""); // user name is null, it's the same as adddressbook does
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
        if ( pStatus | 0x800590000 ) {
            let ldapBundle = Services.strings.createBundle('chrome://mozldap/locale/ldap.properties');
            try { return ldapBundle.GetStringFromID(pStatus & 0x0000000ff); } catch(err) {};
        } else {
            for ( let p in Cr ) {
                ldapInfoLog.info('error ' + p + ':' + pStatus);
                if ( Cr[p] == pStatus ) {
                    return p;
                }
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
                fail = '0x' + pStatus.toString(16) + ": " + ldapInfoFetch.getErrorMsg(pStatus);
            } catch (err) {
                ldapInfoLog.logException(err, false);
                fail = "exception!";
            }
            ldapInfoLog.info("onLDAPInit failed with " + fail);
            this.connection = null;
            this.callbackData.cache.ldap.state = ldapInfoUtil.STATE_TEMP_ERROR;
            this.callbackData.cache.ldap['_Status'] = ["LDAP " + fail];
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
                this.callbackData.cache.ldap.state = ldapInfoUtil.STATE_TEMP_ERROR;
                this.callbackData.cache.ldap['_Status'] = ["LDAP startSearch Fail"];
                ldapInfoFetch.clearCache();
                ldapInfoFetch.callBackAndRunNext(this.callbackData); // with failure
            }
        };
        this.onLDAPMessage = function(pMsg) {
            try {
                ldapInfoLog.info('get msg with type 0x' + pMsg.type.toString(16) );
                switch (pMsg.type) {
                    case Ci.nsILDAPMessage.RES_BIND :
                        if ( pMsg.errorCode == Ci.nsILDAPErrors.SUCCESS ) {
                            ldapInfoFetch.ldapConnections[this.dn] = this.connection;
                            this.startSearch(false);
                        } else {
                            try {
                                pMsg.operation.abandonExt();
                            } catch (err) {};
                            this.callbackData.cache.ldap.state = ldapInfoUtil.STATE_TEMP_ERROR;
                            // http://dxr.mozilla.org/mozilla-central/source/xpcom/base/nsError.h
                            this.callbackData.cache.ldap['_Status'] = ['LDAP Bind Error 0x8005900' + pMsg.errorCode.toString(16) + " " + ldapInfoFetch.getErrorMsg(0x800590000+pMsg.errorCode)];
                            ldapInfoLog.log('ldapInfoShow ' + this.callbackData.cache.ldap['_Status'], 1);
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
                                this.callbackData.cache.ldap[attr] = pMsg.getValues(attr, count);
                            }
                        }
                        if (image_bytes && image_bytes.length > 2) {
                            let win = this.callbackData.win.get();
                            if ( win && win.btoa ) {
                                this.callbackData.cache.ldap.src = "data:image/jpeg;base64," + ldapInfoUtil.byteArray2Base64(win, image_bytes);
                            }
                        }
                        this.callbackData.cache.ldap['_dn'] = [pMsg.dn];
                        this.callbackData.cache.ldap['_Status'] = ['LDAP \u2714'];
                        //break; // as we only query 1, so we now get enough data, and may need quite a while (and maybe timeout) for get the next message, so we don't break here and just callnext
                    case Ci.nsILDAPMessage.RES_SEARCH_RESULT :
                    default:
                        if ( typeof(this.callbackData.cache.ldap['_Status']) == 'undefined' ) {
                            ldapInfoLog.info("No Match for " + this.callbackData.address + " with error: " + this.connection.errorString, "Not Match");
                            this.callbackData.cache.ldap['_dn'] = [this.callbackData.address];
                            this.callbackData.cache.ldap['_Status'] = ['LDAP \u2718'];
                        }
                        this.connection = null;
                        if ( ldapInfoUtil.options.load_from_photo_url && !this.callbackData.cache.ldap.src ) {
                          try {
                            this.callbackData.cache.ldap.src = ldapInfoSprintf.sprintf( ldapInfoUtil.options['photoURL'], this.callbackData.cache.ldap );
                          } catch ( err ) {
                            ldapInfoLog.info('photoURL format error: ' + err);
                          }
                        }
                        //this.callbackData.cache.ldap.state = ldapInfoUtil.STATE_DONE; // finished, will be set in callBackAndRunNext
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
            if ( this.fetchTimer ) this.fetchTimer.cancel();
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
        this.currentAddress = this.timer = this.fetchTimer = ldapInfoLog = ldapInfoUtil = ldapInfoSprintf = null;
    },
    
    callBackAndRunNext: function(callbackData) {
        ldapInfoLog.info('callBackAndRunNext, now is ' + callbackData.address);
        if ( this.timer ) this.timer.cancel();
        if ( typeof(callbackData.ldapOp) != 'undefined' ) {
            try {
                callbackData.ldapOp.abandonExt(); // abandon the RES_SEARCH_RESULT message for successfull query
            } catch (err) {};
            ldapInfoFetch.lastTime = Date.now();
            delete callbackData.ldapOp;
        }
        if ( callbackData.address != 'retry' &&  callbackData.cache.ldap.state <= ldapInfoUtil.STATE_QUERYING ) callbackData.cache.ldap.state = ldapInfoUtil.STATE_DONE;
        ldapInfoFetch.queue = ldapInfoFetch.queue.filter( function (args) { // call all callbacks if for the same address
            let cbd = args[0];
            if ( cbd.address != callbackData.address ) return true;
            try {
                cbd.image.classList.remove('ldapInfoLoading');
                cbd.callback(cbd);
            } catch (err) {
                ldapInfoLog.logException(err);
            }
            return false;
        });
        //ldapInfoLog.logObject(this.queue.map( function(one) {
        //    return one[5];
        //} ), 'after queue', 0);
        if (ldapInfoFetch.queue.length >= 1) {
            //this.fetchTimer.initWithCallback( function() { // can be function, or nsITimerCallback
            //    ldapInfoFetch._fetchLDAPInfo.apply(ldapInfoFetch, ldapInfoFetch.queue[0]);
            //}, 0, Ci.nsITimer.TYPE_ONE_SHOT );
            this._fetchLDAPInfo.apply(ldapInfoFetch, ldapInfoFetch.queue[0]);
        }
    },
    
    queueFetchLDAPInfo: function(...theArgs) {
        ldapInfoLog.info('queueFetchLDAPInfo');
        if ( !ldapInfoFetch.fetchTimer ) ldapInfoFetch.fetchTimer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
        this.queue.push(theArgs);
        let callbackData = theArgs[0];
        if (this.queue.length === 1) {
            ldapInfoLog.info('first');
            //this.fetchTimer.initWithCallback( function() { // can be function, or nsITimerCallback
            //    ldapInfoFetch._fetchLDAPInfo.apply(ldapInfoFetch, theArgs);
            //}, 0, Ci.nsITimer.TYPE_ONE_SHOT );
            this._fetchLDAPInfo.apply(this, theArgs);
        } else {
            let className = 'ldapInfoLoadingQueue';
            if ( callbackData.address == this.currentAddress ) className = 'ldapInfoLoading';
            callbackData.image.classList.add(className);
            //ldapInfoLog.logObject(this.queue.map( function(one) {
            //    return one[5];
            //} ), 'new queue', 0);
        }
    },

    _fetchLDAPInfo: function (callbackData, host, prePath, basedn, binddn, filter, attribs, scope, original_spec) {
        try {
            let password = null;
            this.currentAddress = callbackData.address;
            this.queue.forEach( function(args) {
                if ( args[0].address == ldapInfoFetch.currentAddress ) {
                    args[0].image.classList.remove('ldapInfoLoadingQueue');
                    args[0].image.classList.add('ldapInfoLoading');
                }
            } );
            if ( typeof(binddn) == 'string' && binddn != '' ) {
                password = this.getPasswordForServer(prePath, host, binddn, false, original_spec);
                if (password == "") password = null;
                else if (!password) {
                    callbackData.cache.ldap.state = ldapInfoUtil.STATE_TEMP_ERROR;
                    callbackData.cache.ldap['_Status'] = ['LDAP No Password'];
                    this.callBackAndRunNext(callbackData);
                }
            }
            if ( Services.io.offline ) {
                ldapInfoLog.info("offline mode");
                callbackData.cache.ldap.state = ldapInfoUtil.STATE_TEMP_ERROR;
                callbackData.cache.ldap['_Status'] = ['LDAP Offline'];
                return this.callBackAndRunNext(callbackData); // with failure
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
                    let connectionListener = new this.photoLDAPMessageListener(callbackData, ldapconnection, password, basedn, scope, filter, attribs);
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
            let connectionListener = new this.photoLDAPMessageListener(callbackData, ldapconnection, password, basedn, scope, filter, attribs);
            // ldap://directory.foo.com/o=foo.com??sub?(objectclass=*)
            let urlSpec = prePath + '/' + basedn + "?" + attribs + "?sub?" +  filter;
            let url = Services.io.newURI(urlSpec, null, null).QueryInterface(Ci.nsILDAPURL);
            ldapconnection.init(url, binddn, connectionListener, /*nsISupports aClosure*/null, ldapconnection.VERSION3);
        } catch (err) {
            ldapInfoLog.logException(err);
            callbackData.cache.ldap.state = ldapInfoUtil.STATE_TEMP_ERROR;
            callbackData.cache.ldap['_Status'] = ['LDAP Exception'];
            this.callBackAndRunNext(callbackData); // with failure
        }
    }
}