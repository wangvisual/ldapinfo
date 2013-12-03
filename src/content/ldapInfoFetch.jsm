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
    batchCacheLDAP: {},

    photoLDAPMessageListener: function (callbackData, connection, bindPassword, dn, scope, filter, attributes, uuid) {
        this.callbackData = callbackData;
        this.connection = connection;
        this.bindPassword = bindPassword;
        this.dn = dn;
        this.scope = scope;
        this.filter = filter;
        this.attributes = attributes;
        this.uuid = uuid;
        this.sizeLimit = 1;
        this.sizeCount = 1;
        this.addtionalAttributes = [];
        this.QueryInterface = XPCOMUtils.generateQI([Ci.nsISupports, Ci.nsILDAPMessageListener]);
        
        this.onLDAPInit = function(pConn, pStatus) {
            let fail = "";
            try {
                ldapInfoLog.info("onLDAPInit");
                if ( pStatus === Cr.NS_OK ) {
                    let ldapOp = Cc["@mozilla.org/network/ldap-operation;1"].createInstance().QueryInterface(Ci.nsILDAPOperation);
                    this.callbackData.ldapOp = ldapOp;
                    ldapOp.init(pConn, this, null);
                    ldapInfoLog.info("simpleBind");
                    ldapOp.simpleBind(this.bindPassword); // when connection reset, simpleBind still need 1 seconds to exception
                    ldapInfoLog.info("simpleBind OK");
                    return;
                }
                fail = '0x' + pStatus.toString(16) + ": " + ldapInfoUtil.getErrorMsg(pStatus);
            } catch (err) {
                ldapInfoLog.logException(err, false);
                fail = "exception!";
                if ( err.result ) fail += " " + ldapInfoUtil.getErrorMsg(err.result);
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
                let useFilter = this.filter;
                let filters = [];
                this.sizeLimit = 0;
                let self = this;
                let attributes = this.attributes.split(',');
                let lowerCaseAttributes = attributes.map( function(str) { return str.toLowerCase(); } );
                ldapInfoFetch.batchCacheLDAP = {};
                ldapInfoFetch.queue.every( function (args) {
                    if ( args[8] == self.uuid && args[2] == self.dn ) {
                        let cb = args[0];
                        let f = args[4];
                        f = ( f.startsWith('(') && f.endsWith(')') ) ? f : '(' + f + ')'
                        if ( filters.indexOf(f) < 0 ) filters.push(f);
                        ldapInfoFetch.batchCacheLDAP[cb.address] = {cache: cb.cache, filter: {}};
                        ldapInfoFetch.batchCacheLDAP[cb.address].filter['_basedn_'] = self.dn.toLowerCase();
                        f.split(/[^\w=@.:~<>*!\-]+/).forEach( function(str) {
                            let index;
                            if ( str != '' && ( index = str.indexOf('=') ) ) {
                                let name = str.substr(0, index);
                                let value = str.substr(index+1).toLowerCase();
                                if ( name && value && cb.address.indexOf(value) >= 0 ) { // value must be part of address
                                    if ( attributes.length > 0 && lowerCaseAttributes.indexOf(name.toLowerCase()) < 0 ) {
                                        attributes.push(name);
                                        self.addtionalAttributes.push(name);
                                    }
                                    ldapInfoFetch.batchCacheLDAP[cb.address].filter[name] = value;
                                }
                            }
                        });
                        self.sizeLimit ++;
                        return filters.length < ldapInfoUtil.options.ldap_batch;
                    }
                } );
                if ( filters.length > 1 ) useFilter = '(|' + filters.join('') + ')';
                this.sizeCount = this.sizeLimit;
                
                let timeout = ldapInfoUtil.options['ldapTimeoutInitial'];
                if ( cached ) timeout = ldapInfoUtil.options['ldapTimeoutWhenCached'];
                timeout += Math.round(this.sizeLimit - 1)/5; // if batch query, set a longer timeout
                ldapInfoLog.info("startSearch dn:" + this.dn + " filter:" + useFilter + " scope:" + this.scope + " attributes:" + attributes.join(',') );
                ldapOp.searchExt(this.dn, this.scope, useFilter, attributes.join(','), /*aTimeOut, not implemented yet*/(timeout-1)*1000, /*aSizeLimit*/this.sizeLimit);
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
                ldapInfoLog.info('get msg for ' + ( Object.keys(ldapInfoFetch.batchCacheLDAP).join(', ') || this.callbackData.address ) + ' with type 0x' + pMsg.type.toString(16) );
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
                            this.callbackData.cache.ldap['_Status'] = ['LDAP Bind Error 0x805900' + pMsg.errorCode.toString(16) + " " + ldapInfoUtil.getErrorMsg(0x80590000+pMsg.errorCode)];
                            ldapInfoLog.log('ldapInfoShow ' + this.callbackData.cache.ldap['_Status'], 1);
                            this.connection = null;
                            ldapInfoFetch.callBackAndRunNext(this.callbackData); // with failure
                        }
                        break;
                    case Ci.nsILDAPMessage.RES_SEARCH_ENTRY :
                        let count = {};
                        let attrs = pMsg.getAttributes(count); // count.value is number of attributes
                        let lowerCaseAttrs = attrs.map( function(str) { return str.toLowerCase(); } );
                        /* for batch operation, only support to search uid & full address
                           if filter template is (|(mail=%(email)s)(mailLocalAddress=%(email)s)(uid=%(mailid)s))
                           then check mail, mailLocalAddress & uid of current pMsg, if the value contains our value, then use the address */
                        let scores = {};
                        for ( let address in ldapInfoFetch.batchCacheLDAP ) {
                            scores[address] = 0;
                            let filter = ldapInfoFetch.batchCacheLDAP[address].filter;
                            if ( filter['_basedn_'] == pMsg.dn.toLowerCase() ) {
                                scores[address] = 10000;
                                break;
                            }
                            for(let f in filter) { // values are lowercase, keys maybe not
                                if ( f == '_basedn_' ) continue;
                                let index = lowerCaseAttrs.indexOf(f.toLowerCase());
                                if ( index >= 0 ) {
                                    let values = pMsg.getValues(attrs[index], count).map( function(str) { return str.toLowerCase(); } );
                                    if ( values.indexOf(filter[f]) >= 0 ) {
                                        scores[address] ++;
                                    }
                                }
                            }
                        }
                        let score = 0; let email; let c = 0; let OK = true;
                        for ( let address in scores ) {
                            if ( scores[address] > score ) {
                                email = address;
                                score = scores[address];
                            }
                        }
                        if ( score == 0 && this.sizeLimit == 1) {
                          email = this.callbackData.address;
                          score = 1;
                        }
                        if ( score == 0 ) {
                            ldapInfoLog.log("Can't find address for LDAP search result, Disable batch query for LDAP", "Error");
                            ldapInfoUtil.prefs.setIntPref('ldap_batch', 0);
                            OK = false;
                        } else {
                            for ( let address in scores ) if ( scores[address] >= score ) c++;
                            if ( c >= 2 ) {
                                ldapInfoLog.log("Found " + c + " addresses for same LDAP search result, Disable batch query for LDAP", "Error");
                                ldapInfoUtil.prefs.setIntPref('ldap_batch', 0);
                                OK = false;
                            }
                        }
                        if (OK) {
                            let image_bytes = null;
                            let cache = ldapInfoFetch.batchCacheLDAP[email].cache;
                            for(let attr of attrs) {
                                if ( ['thumbnailphoto', 'jpegphoto', 'photo'].indexOf(attr.toLowerCase()) >= 0 ) {
                                    if ( !image_bytes ) {
                                        let values = pMsg.getBinaryValues(attr, count); //[xpconnect wrapped nsILDAPBERValue]
                                        if (values && values.length > 0 && values[0]) {
                                            image_bytes = values[0].get(count);
                                        }
                                    }
                                } else {
                                    if ( this.addtionalAttributes.indexOf(attr) < 0 ) cache.ldap[attr] = pMsg.getValues(attr, count);
                                }
                            }
                            if (image_bytes && image_bytes.length > 2) {
                                let win = this.callbackData.win.get();
                                if ( win && win.btoa ) {
                                    cache.ldap.src = "data:image/jpeg;base64," + ldapInfoUtil.byteArray2Base64(win, image_bytes);
                                }
                            }
                            cache.ldap['_dn'] = [pMsg.dn];
                            cache.ldap['_Status'] = ['LDAP ' + ldapInfoUtil.CHAR_HAVEPIC];
                            this.sizeCount --;
                        }
                        if ( this.sizeCount && OK ) break; // we now get enough data, and may need quite a while (and maybe timeout) for get the next message, so we don't break here and just callnext
                    case Ci.nsILDAPMessage.RES_SEARCH_RESULT :
                    default:
                        this.connection = null;
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
            this.batchCacheLDAP = {};
        } catch (err) {
            ldapInfoLog.logException(err);
        }
        ldapInfoLog.info("ldapInfoFetch cleanup done");
        this.currentAddress = this.timer = this.fetchTimer = ldapInfoLog = ldapInfoUtil = ldapInfoSprintf = null;
    },
    
    callBackAndRunNext: function(callbackData) {
        ldapInfoLog.info('callBackAndRunNext, now is ' + callbackData.address);
        //ldapInfoLog.logObject(this.queue.map( function(one) {
        //    return one[5];
        //} ), 'before filter queue', 0);
        if ( this.timer ) this.timer.cancel();
        if ( typeof(callbackData.ldapOp) != 'undefined' ) {
            try {
                callbackData.ldapOp.abandonExt(); // abandon the RES_SEARCH_RESULT message for successfull query
            } catch (err) {};
            this.lastTime = Date.now();
            delete callbackData.ldapOp;
        }

        let removed = false; // to prevent fetch the same twice and hang TB
        let retry = ( callbackData.address == 'retry' );
        if ( retry || callbackData.cache.ldap.state == ldapInfoUtil.STATE_TEMP_ERROR ) this.batchCacheLDAP = {};
        if ( !retry && callbackData.cache.ldap.state <= ldapInfoUtil.STATE_QUERYING ) {
            callbackData.cache.ldap.state = ldapInfoUtil.STATE_DONE;
            if ( typeof(callbackData.cache.ldap['_Status']) == 'undefined' ) {
                ldapInfoLog.info("No Match for " + callbackData.address, "Not Match");
                callbackData.cache.ldap['_dn'] = [callbackData.address];
                callbackData.cache.ldap['_Status'] = ['LDAP ' + ldapInfoUtil.CHAR_NOUSER];
            } else if ( ldapInfoUtil.options.load_from_photo_url && !callbackData.cache.ldap.src ) {
                try {
                    callbackData.cache.ldap.src = ldapInfoSprintf.sprintf( ldapInfoUtil.options['photoURL'], callbackData.cache.ldap );
                } catch ( err ) {
                    callbackData.cache.ldap['_Status'] = ['LDAP ' + ldapInfoUtil.CHAR_NOPIC];
                    ldapInfoLog.info('photoURL format error: ' + err);
                }
            }
        }
        
        this.queue = this.queue.filter( function (args) { // call all callbacks if for the same address
            let cbd = args[0];
            if ( cbd.address != callbackData.address ) return true;
            try {
                cbd.image.classList.remove('ldapInfoLoading');
                cbd.callback(cbd);
            } catch (err) {
                ldapInfoLog.logException(err);
            }
            removed = true;
            return false;
        });
        //ldapInfoLog.logObject(this.queue.map( function(one) {
        //    return one[5];
        //} ), 'after queue', 0);
        if ( this.queue.length >= 1 ) {
            if ( removed || retry ) {
                if ( Object.keys(this.batchCacheLDAP).length > 1 ) { // batch mode, call directly
                    this._fetchLDAPInfo.apply(this, this.queue[0]);
                } else {
                    this.fetchTimer.initWithCallback( function() { // can be function, or nsITimerCallback
                        ldapInfoFetch._fetchLDAPInfo.apply(ldapInfoFetch, ldapInfoFetch.queue[0]);
                    }, 0, Ci.nsITimer.TYPE_ONE_SHOT );
                }
            }
        } else {
          this.batchCacheLDAP = {};
        }
    },
    
    queueFetchLDAPInfo: function(...theArgs) {
        if ( !this.fetchTimer ) this.fetchTimer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
        this.queue.push(theArgs);
        let callbackData = theArgs[0];
        ldapInfoLog.info('queueFetchLDAPInfo ' + callbackData.address);
        if (this.queue.length === 1) {
            ldapInfoLog.info('first');
            this.fetchTimer.initWithCallback( function() { // can be function, or nsITimerCallback
                ldapInfoFetch._fetchLDAPInfo.apply(ldapInfoFetch, theArgs);
            }, 0, Ci.nsITimer.TYPE_ONE_SHOT );
        } else {
            let className = 'ldapInfoLoadingQueue';
            if ( callbackData.address == this.currentAddress ) className = 'ldapInfoLoading';
            callbackData.image.classList.add(className);
            //ldapInfoLog.logObject(this.queue.map( function(one) {
            //    return one[5];
            //} ), 'new queue', 0);
        }
    },

    _fetchLDAPInfo: function (callbackData, prePath, basedn, binddn, filter, attribs, scope, original_spec, uuid) {
        try {
            let password = null;
            this.currentAddress = callbackData.address;
            this.queue.forEach( function(args) {
                if ( args[0].address == ldapInfoFetch.currentAddress ) {
                    args[0].image.classList.remove('ldapInfoLoadingQueue');
                    args[0].image.classList.add('ldapInfoLoading');
                }
            } );

            if ( this.batchCacheLDAP[this.currentAddress] )return this.callBackAndRunNext(callbackData);
            
            if ( typeof(binddn) == 'string' && binddn != '' ) {
                password = ldapInfoUtil.getPasswordForServer(prePath, binddn, false, original_spec);
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
                    let connectionListener = new this.photoLDAPMessageListener(callbackData, ldapconnection, password, basedn, scope, filter, attribs, uuid);
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
            let connectionListener = new this.photoLDAPMessageListener(callbackData, ldapconnection, password, basedn, scope, filter, attribs, uuid);
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