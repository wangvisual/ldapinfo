/* Office JavaScript API library */
/* Version: 15.0.4420.1017 Build Time: 02/27/2014 */
/*
	Copyright (c) Microsoft Corporation.  All rights reserved.
*/
/*
	Your use of this file is governed by the Microsoft Services Agreement http://go.microsoft.com/fwlink/?LinkId=266419.
*/
(function(h) {
    var i = "function",
        j = "object",
        g = "number",
        n = "message",
        s = "use strict",
        k = "Browser",
        o = "data",
        r = "asyncContext",
        p = "Office",
        u = "Microsoft",
        m = "callback",
        e = "",
        l = "name",
        f = "undefined",
        b = true,
        d = null,
        c = false,
        a = a || {};
    a.OUtil = function() {
        var i = "on",
            k = "configurable",
            j = "writable",
            g = "enumerable",
            p = -1,
            s = "&_xdm_Info=",
            r = "_xdm_",
            n = "#",
            o = {},
            u = 3e4,
            q = c;

        function t() {
            return Math.floor(100000001 * Math.random()).toString()
        }
        return {
            extend: function(b, a) {
                var c = function() {};
                c.prototype = a.prototype;
                b.prototype = new c;
                b.prototype.constructor = b;
                b.uber = a.prototype;
                if (a.prototype.constructor === Object.prototype.constructor) a.prototype.constructor = a
            },
            setNamespace: function(b, a) {
                if (a && b && !a[b]) a[b] = {}
            },
            unsetNamespace: function(b, a) {
                if (a && b && a[b]) delete a[b]
            },
            loadScript: function(f, g, i) {
                if (f && g) {
                    var l = h.document,
                        a = o[f];
                    if (!a) {
                        var e = l.createElement("script");
                        e.type = "text/javascript";
                        a = {
                            loaded: c,
                            pendingCallbacks: [g],
                            timer: d
                        };
                        o[f] = a;
                        var j = function() {
                                if (a.timer != d) {
                                    clearTimeout(a.timer);
                                    delete a.timer
                                }
                                a.loaded = b;
                                for (var e = a.pendingCallbacks.length, c = 0; c < e; c++) {
                                    var f = a.pendingCallbacks.shift();
                                    f()
                                }
                            },
                            k = function() {
                                delete o[f];
                                if (a.timer != d) {
                                    clearTimeout(a.timer);
                                    delete a.timer
                                }
                                for (var c = a.pendingCallbacks.length, b = 0; b < c; b++) {
                                    var e = a.pendingCallbacks.shift();
                                    e()
                                }
                            };
                        if (e.readyState) e.onreadystatechange = function() {
                            if (e.readyState == "loaded" || e.readyState == "complete") {
                                e.onreadystatechange = d;
                                j()
                            }
                        };
                        else e.onload = j;
                        e.onerror = k;
                        i = i || u;
                        a.timer = setTimeout(k, i);
                        e.src = f;
                        l.getElementsByTagName("head")[0].appendChild(e)
                    } else if (a.loaded) g();
                    else a.pendingCallbacks.push(g)
                }
            },
            loadCSS: function(c) {
                if (c) {
                    var b = h.document,
                        a = b.createElement("link");
                    a.type = "text/css";
                    a.rel = "stylesheet";
                    a.href = c;
                    b.getElementsByTagName("head")[0].appendChild(a)
                }
            },
            parseEnum: function(b, c) {
                var a = c[b.trim()];
                if (typeof a == f) {
                    Sys.Debug.trace("invalid enumeration string:" + b);
                    throw Error.argument("str")
                }
                return a
            },
            delayExecutionAndCache: function() {
                var a = {
                    calc: arguments[0]
                };
                return function() {
                    if (a.calc) {
                        a.val = a.calc.apply(this, arguments);
                        delete a.calc
                    }
                    return a.val
                }
            },
            getUniqueId: function() {
                p = p + 1;
                return p.toString()
            },
            formatString: function() {
                var a = arguments,
                    b = a[0];
                return b.replace(/{(\d+)}/gm, function(d, b) {
                    var c = parseInt(b, 10) + 1;
                    return a[c] === undefined ? "{" + b + "}" : a[c]
                })
            },
            generateConversationId: function() {
                return [t(), t(), (new Date).getTime().toString()].join("_")
            },
            getFrameNameAndConversationId: function(b, c) {
                var a = r + b + this.generateConversationId();
                c.setAttribute(l, a);
                return this.generateConversationId()
            },
            addXdmInfoAsHash: function(a, d) {
                a = a.trim() || e;
                var b = a.split(n),
                    c = b.shift(),
                    f = b.join(n);
                return [c, n, f, s, d].join(e)
            },
            parseXdmInfo: function() {
                var g = h.location.hash,
                    c = g.split(s),
                    a = c.length > 1 ? c[c.length - 1] : d;
                if (h.sessionStorage) {
                    var b = h.name.indexOf(r);
                    if (b > -1) {
                        var e = h.name.indexOf(";", b);
                        if (e == -1) e = h.name.length;
                        var f = h.name.substring(b, e);
                        if (a) h.sessionStorage.setItem(f, a);
                        else a = h.sessionStorage.getItem(f)
                    }
                }
                return a
            },
            getConversationId: function() {
                var b = h.location.search,
                    a = d;
                if (b) {
                    var c = b.indexOf("&");
                    a = c > 0 ? b.substring(1, c) : b.substr(1);
                    if (a && a.charAt(a.length - 1) === "=") {
                        a = a.substring(0, a.length - 1);
                        if (a) a = decodeURIComponent(a)
                    }
                }
                return a
            },
            validateParamObject: function(f, e) {
                var a = Function._validateParams(arguments, [{
                    name: "params",
                    type: Object,
                    mayBeNull: c
                }, {
                    name: "expectedProperties",
                    type: Object,
                    mayBeNull: c
                }, {
                    name: m,
                    type: Function,
                    mayBeNull: b
                }]);
                if (a) throw a;
                for (var d in e) {
                    a = Function._validateParameter(f[d], e[d], d);
                    if (a) throw a
                }
            },
            writeProfilerMark: function(a) {
                if (h.msWriteProfilerMark) {
                    h.msWriteProfilerMark(a);
                    typeof Sys !== f && Sys && Sys.Debug && Sys.Debug.trace(a)
                }
            },
            defineNondefaultProperty: function(e, f, a, c) {
                a = a || {};
                for (var g in c) {
                    var d = c[g];
                    if (a[d] == undefined) a[d] = b
                }
                Object.defineProperty(e, f, a);
                return e
            },
            defineNondefaultProperties: function(d, b, e) {
                b = b || {};
                for (var c in b) a.OUtil.defineNondefaultProperty(d, c, b[c], e);
                return d
            },
            defineEnumerableProperty: function(d, c, b) {
                return a.OUtil.defineNondefaultProperty(d, c, b, [g])
            },
            defineEnumerableProperties: function(c, b) {
                return a.OUtil.defineNondefaultProperties(c, b, [g])
            },
            defineMutableProperty: function(d, c, b) {
                return a.OUtil.defineNondefaultProperty(d, c, b, [j, g, k])
            },
            defineMutableProperties: function(c, b) {
                return a.OUtil.defineNondefaultProperties(c, b, [j, g, k])
            },
            finalizeProperties: function(e, d) {
                d = d || {};
                for (var g = Object.getOwnPropertyNames(e), i = g.length, f = 0; f < i; f++) {
                    var h = g[f],
                        a = Object.getOwnPropertyDescriptor(e, h);
                    if (!a.get && !a.set) a.writable = d.writable || c;
                    a.configurable = d.configurable || c;
                    a.enumerable = d.enumerable || b;
                    Object.defineProperty(e, h, a)
                }
                return e
            },
            mapList: function(a, c) {
                var b = [];
                if (a)
                    for (var d in a) b.push(c(a[d]));
                return b
            },
            listContainsKey: function(d, e) {
                for (var a in d)
                    if (e == a) return b;
                return c
            },
            listContainsValue: function(a, d) {
                for (var e in a)
                    if (d == a[e]) return b;
                return c
            },
            augmentList: function(a, b) {
                var d = a.push ? function(c, b) {
                    a.push(b)
                } : function(c, b) {
                    a[c] = b
                };
                for (var c in b) d(c, b[c])
            },
            redefineList: function(a, c) {
                for (var b in a) delete a[b];
                for (var b in c) a[b] = c[b]
            },
            isArray: function(a) {
                return Object.prototype.toString.apply(a) === "[object Array]"
            },
            isFunction: function(a) {
                return Object.prototype.toString.apply(a) === "[object Function]"
            },
            isDate: function(a) {
                return Object.prototype.toString.apply(a) === "[object Date]"
            },
            addEventListener: function(a, b, d) {
                if (a.attachEvent) a.attachEvent(i + b, d);
                else if (a.addEventListener) a.addEventListener(b, d, c);
                else a[i + b] = d
            },
            removeEventListener: function(a, b, e) {
                if (a.detachEvent) a.detachEvent(i + b, e);
                else if (a.removeEventListener) a.removeEventListener(b, e, c);
                else a[i + b] = d
            },
            encodeBase64: function(c) {
                if (!c) return c;
                var o = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
                    m = [],
                    b = [],
                    i = 0,
                    k, h, j, d, f, g, a, n = c.length;
                do {
                    k = c.charCodeAt(i++);
                    h = c.charCodeAt(i++);
                    j = c.charCodeAt(i++);
                    a = 0;
                    d = k & 255;
                    f = k >> 8;
                    g = h & 255;
                    b[a++] = d >> 2;
                    b[a++] = (d & 3) << 4 | f >> 4;
                    b[a++] = (f & 15) << 2 | g >> 6;
                    b[a++] = g & 63;
                    if (!isNaN(h)) {
                        d = h >> 8;
                        f = j & 255;
                        g = j >> 8;
                        b[a++] = d >> 2;
                        b[a++] = (d & 3) << 4 | f >> 4;
                        b[a++] = (f & 15) << 2 | g >> 6;
                        b[a++] = g & 63
                    }
                    if (isNaN(h)) b[a - 1] = 64;
                    else if (isNaN(j)) {
                        b[a - 2] = 64;
                        b[a - 1] = 64
                    }
                    for (var l = 0; l < a; l++) m.push(o.charAt(b[l]))
                } while (i < n);
                return m.join(e)
            },
            getLocalStorage: function() {
                var a = d;
                if (!q) try {
                    if (h.localStorage) a = h.localStorage
                } catch (c) {
                    q = b
                }
                return a
            }
        }
    }();
    h.OSF = a;
    a.OUtil.setNamespace("OSF", h);
    a.InternalPerfMarker = {
        DataCoercionBegin: "Agave.HostCall.CoerceDataStart",
        DataCoercionEnd: "Agave.HostCall.CoerceDataEnd"
    };
    a.HostCallPerfMarker = {
        IssueCall: "Agave.HostCall.IssueCall",
        ReceiveResponse: "Agave.HostCall.ReceiveResponse",
        RuntimeExceptionRaised: "Agave.HostCall.RuntimeExecptionRaised"
    };
    a.AgaveHostAction = {
        Select: 0,
        UnSelect: 1
    };
    a.SharedConstants = {
        NotificationConversationIdSuffix: "_ntf"
    };
    a.OfficeAppContext = function(m, i, e, d, g, j, f, h, l, b, k, c) {
        var a = this;
        a._id = m;
        a._appName = i;
        a._appVersion = e;
        a._appUILocale = d;
        a._dataLocale = g;
        a._docUrl = j;
        a._clientMode = f;
        a._settings = h;
        a._reason = l;
        a._osfControlType = b;
        a._eToken = k;
        a._correlationId = c;
        a.get_id = function() {
            return this._id
        };
        a.get_appName = function() {
            return this._appName
        };
        a.get_appVersion = function() {
            return this._appVersion
        };
        a.get_appUILocale = function() {
            return this._appUILocale
        };
        a.get_dataLocale = function() {
            return this._dataLocale
        };
        a.get_docUrl = function() {
            return this._docUrl
        };
        a.get_clientMode = function() {
            return this._clientMode
        };
        a.get_bindings = function() {
            return this._bindings
        };
        a.get_settings = function() {
            return this._settings
        };
        a.get_reason = function() {
            return this._reason
        };
        a.get_osfControlType = function() {
            return this._osfControlType
        };
        a.get_eToken = function() {
            return this._eToken
        };
        a.get_correlationId = function() {
            return this._correlationId
        }
    };
    a.AppName = {
        Unsupported: 0,
        Excel: 1,
        Word: 2,
        PowerPoint: 4,
        Outlook: 8,
        ExcelWebApp: 16,
        WordWebApp: 32,
        OutlookWebApp: 64,
        Project: 128,
        ExcelIOS: 1024,
        WordIOS: 4096,
        PowerPointIOS: 8192
    };
    a.OsfControlType = {
        DocumentLevel: 0,
        ContainerLevel: 1
    };
    a.ClientMode = {
        ReadOnly: 0,
        ReadWrite: 1
    };
    a.OUtil.setNamespace(u, h);
    a.OUtil.setNamespace(p, Microsoft);
    a.OUtil.setNamespace("Client", Microsoft.Office);
    a.OUtil.setNamespace("WebExtension", Microsoft.Office);
    a.NamespaceManager = function() {
        var e, d = c;
        return {
            enableShortcut: function() {
                if (!d) {
                    if (h.Office) e = h.Office;
                    else a.OUtil.setNamespace(p, h);
                    h.Office = Microsoft.Office.WebExtension;
                    d = b
                }
            },
            disableShortcut: function() {
                if (d) {
                    if (e) h.Office = e;
                    else a.OUtil.unsetNamespace(p, h);
                    d = c
                }
            }
        }
    }();
    a.NamespaceManager.enableShortcut();
    Microsoft.Office.WebExtension.InitializationReason = {
        Inserted: "inserted",
        DocumentOpened: "documentOpened"
    };
    Microsoft.Office.WebExtension.ApplicationMode = {
        WebEditor: "webEditor",
        WebViewer: "webViewer",
        Client: "client"
    };
    Microsoft.Office.WebExtension.DocumentMode = {
        ReadOnly: "readOnly",
        ReadWrite: "readWrite"
    };
    Microsoft.Office.WebExtension.CoercionType = {
        Text: "text",
        Matrix: "matrix",
        Table: "table"
    };
    Microsoft.Office.WebExtension.ValueFormat = {
        Unformatted: "unformatted",
        Formatted: "formatted"
    };
    Microsoft.Office.WebExtension.FilterType = {
        All: "all"
    };
    Microsoft.Office.WebExtension.BindingType = {
        Text: "text",
        Matrix: "matrix",
        Table: "table"
    };
    Microsoft.Office.WebExtension.EventType = {
        DocumentSelectionChanged: "documentSelectionChanged",
        BindingSelectionChanged: "bindingSelectionChanged",
        BindingDataChanged: "bindingDataChanged"
    };
    Microsoft.Office.WebExtension.AsyncResultStatus = {
        Succeeded: "succeeded",
        Failed: "failed"
    };
    Microsoft.Office.WebExtension.Parameters = {
        BindingType: "bindingType",
        CoercionType: "coercionType",
        ValueFormat: "valueFormat",
        FilterType: "filterType",
        Id: "id",
        PromptText: "promptText",
        ItemName: "itemName",
        FailOnCollision: "failOnCollision",
        StartRow: "startRow",
        StartColumn: "startColumn",
        RowCount: "rowCount",
        ColumnCount: "columnCount",
        Callback: m,
        AsyncContext: r,
        Data: o,
        Rows: "rows",
        OverwriteIfStale: "overwriteIfStale",
        FileType: "fileType",
        EventType: "eventType",
        Handler: "handler",
        SliceSize: "sliceSize",
        SliceIndex: "sliceIndex",
        Xml: "xml",
        Namespace: "namespace",
        Prefix: "prefix",
        XPath: "xPath",
        TaskId: "taskId",
        FieldId: "fieldId",
        FieldValue: "fieldValue",
        ServerUrl: "serverUrl",
        ListName: "listName",
        ResourceId: "resourceId",
        ViewType: "viewType",
        ViewName: "viewName",
        GetRawValue: "getRawValue"
    };
    Microsoft.Office.WebExtension.DefaultParameterValues = {};
    a.OUtil.setNamespace("DDA", a);
    a.DDA.DocumentMode = {
        ReadOnly: 1,
        ReadWrite: 0
    };
    a.OUtil.setNamespace("DispIdHost", a.DDA);
    a.DDA.DispIdHost.Methods = {
        InvokeMethod: "invokeMethod",
        AddEventHandler: "addEventHandler",
        RemoveEventHandler: "removeEventHandler"
    };
    a.DDA.DispIdHost.Delegates = {
        ExecuteAsync: "executeAsync",
        RegisterEventAsync: "registerEventAsync",
        UnregisterEventAsync: "unregisterEventAsync",
        ParameterMap: "parameterMap"
    };
    a.OUtil.setNamespace("AsyncResultEnum", a.DDA);
    a.DDA.AsyncResultEnum.Properties = {
        Context: "Context",
        Value: "Value",
        Status: "Status",
        Error: "Error"
    };
    a.DDA.AsyncResultEnum.ErrorProperties = {
        Name: "Name",
        Message: "Message",
        Code: "Code"
    };
    a.DDA.PropertyDescriptors = {
        AsyncResultStatus: "AsyncResultStatus",
        FileProperties: "FileProperties",
        FileSliceProperties: "FileSliceProperties",
        Subset: "subset",
        BindingProperties: "BindingProperties",
        TableDataProperties: "TableDataProperties",
        DataPartProperties: "DataPartProperties",
        DataNodeProperties: "DataNodeProperties"
    };
    a.DDA.EventDescriptors = {
        BindingSelectionChangedEvent: "BindingSelectionChangedEvent",
        DataNodeInsertedEvent: "DataNodeInsertedEvent",
        DataNodeReplacedEvent: "DataNodeReplacedEvent",
        DataNodeDeletedEvent: "DataNodeDeletedEvent"
    };
    a.DDA.ListDescriptors = {
        BindingList: "BindingList",
        DataPartList: "DataPartList",
        DataNodeList: "DataNodeList"
    };
    a.DDA.FileProperties = {
        Handle: "FileHandle",
        FileSize: "FileSize",
        SliceSize: Microsoft.Office.WebExtension.Parameters.SliceSize
    };
    a.DDA.BindingProperties = {
        Id: "BindingId",
        Type: Microsoft.Office.WebExtension.Parameters.BindingType,
        RowCount: "BindingRowCount",
        ColumnCount: "BindingColumnCount",
        HasHeaders: "HasHeaders"
    };
    a.DDA.TableDataProperties = {
        TableRows: "TableRows",
        TableHeaders: "TableHeaders"
    };
    a.DDA.DataPartProperties = {
        Id: Microsoft.Office.WebExtension.Parameters.Id,
        BuiltIn: "DataPartBuiltIn"
    };
    a.DDA.DataNodeProperties = {
        Handle: "DataNodeHandle",
        BaseName: "DataNodeBaseName",
        NamespaceUri: "DataNodeNamespaceUri",
        NodeType: "DataNodeType"
    };
    a.DDA.DataNodeEventProperties = {
        OldNode: "OldNode",
        NewNode: "NewNode",
        NextSiblingNode: "NextSiblingNode",
        InUndoRedo: "InUndoRedo"
    };
    a.DDA.AsyncResultEnum.ErrorCode = {
        Success: 0,
        Failed: 1
    };
    a.DDA.getXdmEventName = function(b, a) {
        if (a == Microsoft.Office.WebExtension.EventType.BindingSelectionChanged || a == Microsoft.Office.WebExtension.EventType.BindingDataChanged) return b + "_" + a;
        else return a
    };
    a.DDA.ErrorCodeManager = function() {
        var a = {};
        return {
            getErrorArgs: function(b) {
                return a[b] || a[this.errorCodes.ooeInternalError]
            },
            addErrorMessage: function(c, b) {
                a[c] = b
            },
            errorCodes: {
                ooeSuccess: 0,
                ooeCoercionTypeNotSupported: 1e3,
                ooeGetSelectionNotMatchDataType: 1001,
                ooeCoercionTypeNotMatchBinding: 1002,
                ooeInvalidGetRowColumnCounts: 1003,
                ooeSelectionNotSupportCoercionType: 1004,
                ooeInvalidGetStartRowColumn: 1005,
                ooeNonUniformPartialGetNotSupported: 1006,
                ooeGetDataIsTooLarge: 1008,
                ooeFileTypeNotSupported: 1009,
                ooeUnsupportedDataObject: 2e3,
                ooeCannotWriteToSelection: 2001,
                ooeDataNotMatchSelection: 2002,
                ooeOverwriteWorksheetData: 2003,
                ooeDataNotMatchBindingSize: 2004,
                ooeInvalidSetStartRowColumn: 2005,
                ooeInvalidDataFormat: 2006,
                ooeDataNotMatchCoercionType: 2007,
                ooeDataNotMatchBindingType: 2008,
                ooeSetDataIsTooLarge: 2009,
                ooeNonUniformPartialSetNotSupported: 2010,
                ooeSelectionCannotBound: 3e3,
                ooeBindingNotExist: 3002,
                ooeBindingToMultipleSelection: 3003,
                ooeInvalidSelectionForBindingType: 3004,
                ooeOperationNotSupportedOnThisBindingType: 3005,
                ooeNamedItemNotFound: 3006,
                ooeMultipleNamedItemFound: 3007,
                ooeInvalidNamedItemForBindingType: 3008,
                ooeUnknownBindingType: 3009,
                ooeSettingNameNotExist: 4e3,
                ooeSettingsCannotSave: 4001,
                ooeSettingsAreStale: 4002,
                ooeOperationNotSupported: 5e3,
                ooeInternalError: 5001,
                ooeDocumentReadOnly: 5002,
                ooeEventHandlerNotExist: 5003,
                ooeInvalidApiCallInContext: 5004,
                ooeShuttingDown: 5005,
                ooeUnsupportedEnumeration: 5007,
                ooeIndexOutOfRange: 5008,
                ooeCustomXmlNodeNotFound: 6e3,
                ooeCustomXmlError: 6100,
                ooeNoCapability: 7e3
            }
        }
    }();
    a.DDA.MethodDispId = {
        dispidMethodMin: 64,
        dispidGetSelectedDataMethod: 64,
        dispidSetSelectedDataMethod: 65,
        dispidAddBindingFromSelectionMethod: 66,
        dispidAddBindingFromPromptMethod: 67,
        dispidGetBindingMethod: 68,
        dispidReleaseBindingMethod: 69,
        dispidGetBindingDataMethod: 70,
        dispidSetBindingDataMethod: 71,
        dispidAddRowsMethod: 72,
        dispidClearAllRowsMethod: 73,
        dispidGetAllBindingsMethod: 74,
        dispidLoadSettingsMethod: 75,
        dispidSaveSettingsMethod: 76,
        dispidGetDocumentCopyMethod: 77,
        dispidAddBindingFromNamedItemMethod: 78,
        dispidAddColumnsMethod: 79,
        dispidGetDocumentCopyChunkMethod: 80,
        dispidReleaseDocumentCopyMethod: 81,
        dispidAddDataPartMethod: 128,
        dispidGetDataPartByIdMethod: 129,
        dispidGetDataPartsByNamespaceMethod: 130,
        dispidGetDataPartXmlMethod: 131,
        dispidGetDataPartNodesMethod: 132,
        dispidDeleteDataPartMethod: 133,
        dispidGetDataNodeValueMethod: 134,
        dispidGetDataNodeXmlMethod: 135,
        dispidGetDataNodesMethod: 136,
        dispidSetDataNodeValueMethod: 137,
        dispidSetDataNodeXmlMethod: 138,
        dispidAddDataNamespaceMethod: 139,
        dispidGetDataUriByPrefixMethod: 140,
        dispidGetDataPrefixByUriMethod: 141,
        dispidMethodMax: 141,
        dispidGetSelectedTaskMethod: 110,
        dispidGetSelectedResourceMethod: 111,
        dispidGetTaskMethod: 112,
        dispidGetResourceFieldMethod: 113,
        dispidGetWSSUrlMethod: 114,
        dispidGetTaskFieldMethod: 115,
        dispidGetProjectFieldMethod: 116,
        dispidGetSelectedViewMethod: 117
    };
    a.DDA.EventDispId = {
        dispidEventMin: 0,
        dispidInitializeEvent: 0,
        dispidSettingsChangedEvent: 1,
        dispidDocumentSelectionChangedEvent: 2,
        dispidBindingSelectionChangedEvent: 3,
        dispidBindingDataChangedEvent: 4,
        dispidDataNodeAddedEvent: 60,
        dispidDataNodeReplacedEvent: 61,
        dispidDataNodeDeletedEvent: 62,
        dispidEventMax: 63,
        dispidTaskSelectionChangedEvent: 56,
        dispidResourceSelectionChangedEvent: 57,
        dispidViewSelectionChangedEvent: 58
    };
    var t = this.__extends || function(b, c) {
            function a() {
                this.constructor = b
            }
            a.prototype = c.prototype;
            b.prototype = new a
        },
        q;
    (function(g) {
        var a = "SessionId",
            c = "AssetId",
            e = function() {
                function a(a) {
                    this._table = a;
                    this._fields = {}
                }
                Object.defineProperty(a.prototype, "Fields", {
                    "get": function() {
                        return this._fields
                    },
                    enumerable: b,
                    configurable: b
                });
                Object.defineProperty(a.prototype, "Table", {
                    "get": function() {
                        return this._table
                    },
                    enumerable: b,
                    configurable: b
                });
                a.prototype.SerializeFields = function() {};
                a.prototype.SetSerializedField = function(b, a) {
                    if (typeof a !== f && a !== d) this._serializedFields[b] = a.toString()
                };
                a.prototype.SerializeRow = function() {
                    var a = this;
                    a._serializedFields = {};
                    a.SetSerializedField("Table", a._table);
                    a.SerializeFields();
                    return JSON.stringify(a._serializedFields)
                };
                return a
            }();
        g.BaseUsageData = e;
        var i = function(m) {
            var k = "ErrorResult",
                j = "Stage7Time",
                i = "Stage6Time",
                h = "Stage5Time",
                g = "Stage4Time",
                f = "Stage3Time",
                e = "Stage2Time",
                d = "Stage1Time",
                a = "AppInfo";
            t(l, m);

            function l() {
                m.call(this, "AppLoadTime")
            }
            Object.defineProperty(l.prototype, a, {
                "get": function() {
                    return this.Fields[a]
                },
                "set": function(b) {
                    this.Fields[a] = b
                },
                enumerable: b,
                configurable: b
            });
            Object.defineProperty(l.prototype, c, {
                "get": function() {
                    return this.Fields[c]
                },
                "set": function(a) {
                    this.Fields[c] = a
                },
                enumerable: b,
                configurable: b
            });
            Object.defineProperty(l.prototype, d, {
                "get": function() {
                    return this.Fields[d]
                },
                "set": function(a) {
                    this.Fields[d] = a
                },
                enumerable: b,
                configurable: b
            });
            Object.defineProperty(l.prototype, e, {
                "get": function() {
                    return this.Fields[e]
                },
                "set": function(a) {
                    this.Fields[e] = a
                },
                enumerable: b,
                configurable: b
            });
            Object.defineProperty(l.prototype, f, {
                "get": function() {
                    return this.Fields[f]
                },
                "set": function(a) {
                    this.Fields[f] = a
                },
                enumerable: b,
                configurable: b
            });
            Object.defineProperty(l.prototype, g, {
                "get": function() {
                    return this.Fields[g]
                },
                "set": function(a) {
                    this.Fields[g] = a
                },
                enumerable: b,
                configurable: b
            });
            Object.defineProperty(l.prototype, h, {
                "get": function() {
                    return this.Fields[h]
                },
                "set": function(a) {
                    this.Fields[h] = a
                },
                enumerable: b,
                configurable: b
            });
            Object.defineProperty(l.prototype, i, {
                "get": function() {
                    return this.Fields[i]
                },
                "set": function(a) {
                    this.Fields[i] = a
                },
                enumerable: b,
                configurable: b
            });
            Object.defineProperty(l.prototype, j, {
                "get": function() {
                    return this.Fields[j]
                },
                "set": function(a) {
                    this.Fields[j] = a
                },
                enumerable: b,
                configurable: b
            });
            Object.defineProperty(l.prototype, k, {
                "get": function() {
                    return this.Fields[k]
                },
                "set": function(a) {
                    this.Fields[k] = a
                },
                enumerable: b,
                configurable: b
            });
            l.prototype.SerializeFields = function() {
                var b = this;
                b.SetSerializedField(a, b.AppInfo);
                b.SetSerializedField(c, b.AssetId);
                b.SetSerializedField(d, b.Stage1Time);
                b.SetSerializedField(e, b.Stage2Time);
                b.SetSerializedField(f, b.Stage3Time);
                b.SetSerializedField(g, b.Stage4Time);
                b.SetSerializedField(h, b.Stage5Time);
                b.SetSerializedField(i, b.Stage6Time);
                b.SetSerializedField(j, b.Stage7Time);
                b.SetSerializedField(k, b.ErrorResult)
            };
            return l
        }(e);
        g.AppLoadTimeUsageData = i;
        var h = function(o) {
            var n = "AppSizeHeight",
                m = "AppSizeWidth",
                l = "ClientId",
                j = "HostVersion",
                i = "Host",
                h = "UserId",
                g = "AppURL",
                f = "AppId",
                e = "CorrelationId";
            t(d, o);

            function d() {
                o.call(this, "AppActivated")
            }
            Object.defineProperty(d.prototype, e, {
                "get": function() {
                    return this.Fields[e]
                },
                "set": function(a) {
                    this.Fields[e] = a
                },
                enumerable: b,
                configurable: b
            });
            Object.defineProperty(d.prototype, a, {
                "get": function() {
                    return this.Fields[a]
                },
                "set": function(b) {
                    this.Fields[a] = b
                },
                enumerable: b,
                configurable: b
            });
            Object.defineProperty(d.prototype, f, {
                "get": function() {
                    return this.Fields[f]
                },
                "set": function(a) {
                    this.Fields[f] = a
                },
                enumerable: b,
                configurable: b
            });
            Object.defineProperty(d.prototype, g, {
                "get": function() {
                    return this.Fields[g]
                },
                "set": function(a) {
                    this.Fields[g] = a
                },
                enumerable: b,
                configurable: b
            });
            Object.defineProperty(d.prototype, c, {
                "get": function() {
                    return this.Fields[c]
                },
                "set": function(a) {
                    this.Fields[c] = a
                },
                enumerable: b,
                configurable: b
            });
            Object.defineProperty(d.prototype, k, {
                "get": function() {
                    return this.Fields[k]
                },
                "set": function(a) {
                    this.Fields[k] = a
                },
                enumerable: b,
                configurable: b
            });
            Object.defineProperty(d.prototype, h, {
                "get": function() {
                    return this.Fields[h]
                },
                "set": function(a) {
                    this.Fields[h] = a
                },
                enumerable: b,
                configurable: b
            });
            Object.defineProperty(d.prototype, i, {
                "get": function() {
                    return this.Fields[i]
                },
                "set": function(a) {
                    this.Fields[i] = a
                },
                enumerable: b,
                configurable: b
            });
            Object.defineProperty(d.prototype, j, {
                "get": function() {
                    return this.Fields[j]
                },
                "set": function(a) {
                    this.Fields[j] = a
                },
                enumerable: b,
                configurable: b
            });
            Object.defineProperty(d.prototype, l, {
                "get": function() {
                    return this.Fields[l]
                },
                "set": function(a) {
                    this.Fields[l] = a
                },
                enumerable: b,
                configurable: b
            });
            Object.defineProperty(d.prototype, m, {
                "get": function() {
                    return this.Fields[m]
                },
                "set": function(a) {
                    this.Fields[m] = a
                },
                enumerable: b,
                configurable: b
            });
            Object.defineProperty(d.prototype, n, {
                "get": function() {
                    return this.Fields[n]
                },
                "set": function(a) {
                    this.Fields[n] = a
                },
                enumerable: b,
                configurable: b
            });
            d.prototype.SerializeFields = function() {
                var b = this;
                b.SetSerializedField(e, b.CorrelationId);
                b.SetSerializedField(a, b.SessionId);
                b.SetSerializedField(f, b.AppId);
                b.SetSerializedField(g, b.AppURL);
                b.SetSerializedField(c, b.AssetId);
                b.SetSerializedField(k, b.Browser);
                b.SetSerializedField(h, b.UserId);
                b.SetSerializedField(i, b.Host);
                b.SetSerializedField(j, b.HostVersion);
                b.SetSerializedField(l, b.ClientId);
                b.SetSerializedField(m, b.AppSizeWidth);
                b.SetSerializedField(n, b.AppSizeHeight)
            };
            return d
        }(e);
        g.AppActivatedUsageData = h;
        var j = function(i) {
            var g = "CloseMethod",
                f = "OpenTime",
                e = "AppSizeFinalHeight",
                d = "AppSizeFinalWidth",
                c = "FocusTime";
            t(h, i);

            function h() {
                i.call(this, "AppClosed")
            }
            Object.defineProperty(h.prototype, a, {
                "get": function() {
                    return this.Fields[a]
                },
                "set": function(b) {
                    this.Fields[a] = b
                },
                enumerable: b,
                configurable: b
            });
            Object.defineProperty(h.prototype, c, {
                "get": function() {
                    return this.Fields[c]
                },
                "set": function(a) {
                    this.Fields[c] = a
                },
                enumerable: b,
                configurable: b
            });
            Object.defineProperty(h.prototype, d, {
                "get": function() {
                    return this.Fields[d]
                },
                "set": function(a) {
                    this.Fields[d] = a
                },
                enumerable: b,
                configurable: b
            });
            Object.defineProperty(h.prototype, e, {
                "get": function() {
                    return this.Fields[e]
                },
                "set": function(a) {
                    this.Fields[e] = a
                },
                enumerable: b,
                configurable: b
            });
            Object.defineProperty(h.prototype, f, {
                "get": function() {
                    return this.Fields[f]
                },
                "set": function(a) {
                    this.Fields[f] = a
                },
                enumerable: b,
                configurable: b
            });
            Object.defineProperty(h.prototype, g, {
                "get": function() {
                    return this.Fields[g]
                },
                "set": function(a) {
                    this.Fields[g] = a
                },
                enumerable: b,
                configurable: b
            });
            h.prototype.SerializeFields = function() {
                var b = this;
                b.SetSerializedField(a, b.SessionId);
                b.SetSerializedField(c, b.FocusTime);
                b.SetSerializedField(d, b.AppSizeFinalWidth);
                b.SetSerializedField(e, b.AppSizeFinalHeight);
                b.SetSerializedField(f, b.OpenTime);
                b.SetSerializedField(g, b.CloseMethod)
            };
            return h
        }(e);
        g.AppClosedUsageData = j;
        var l = function(i) {
            var g = "ErrorType",
                f = "ResponseTime",
                e = "Parameters",
                d = "APIID",
                c = "APIType";
            t(h, i);

            function h() {
                i.call(this, "APIUsage")
            }
            Object.defineProperty(h.prototype, a, {
                "get": function() {
                    return this.Fields[a]
                },
                "set": function(b) {
                    this.Fields[a] = b
                },
                enumerable: b,
                configurable: b
            });
            Object.defineProperty(h.prototype, c, {
                "get": function() {
                    return this.Fields[c]
                },
                "set": function(a) {
                    this.Fields[c] = a
                },
                enumerable: b,
                configurable: b
            });
            Object.defineProperty(h.prototype, d, {
                "get": function() {
                    return this.Fields[d]
                },
                "set": function(a) {
                    this.Fields[d] = a
                },
                enumerable: b,
                configurable: b
            });
            Object.defineProperty(h.prototype, e, {
                "get": function() {
                    return this.Fields[e]
                },
                "set": function(a) {
                    this.Fields[e] = a
                },
                enumerable: b,
                configurable: b
            });
            Object.defineProperty(h.prototype, f, {
                "get": function() {
                    return this.Fields[f]
                },
                "set": function(a) {
                    this.Fields[f] = a
                },
                enumerable: b,
                configurable: b
            });
            Object.defineProperty(h.prototype, g, {
                "get": function() {
                    return this.Fields[g]
                },
                "set": function(a) {
                    this.Fields[g] = a
                },
                enumerable: b,
                configurable: b
            });
            h.prototype.SerializeFields = function() {
                var b = this;
                b.SetSerializedField(a, b.SessionId);
                b.SetSerializedField(c, b.APIType);
                b.SetSerializedField(d, b.APIID);
                b.SetSerializedField(e, b.Parameters);
                b.SetSerializedField(f, b.ResponseTime);
                b.SetSerializedField(g, b.ErrorType)
            };
            return h
        }(e);
        g.APIUsageUsageData = l
    })(q || (q = {}));
    var y;
    (function(f) {
        s;
        (function(a) {
            a._map = [];
            a._map[0] = "info";
            a.info = 0;
            a._map[1] = "warning";
            a.warning = 1;
            a._map[2] = "error";
            a.error = 2
        })(f.TraceLevel || (f.TraceLevel = {}));
        var k = f.TraceLevel;
        (function(a) {
            a._map = [];
            a._map[0] = "none";
            a.none = 0;
            a._map[1] = "flush";
            a.flush = 1
        })(f.SendFlag || (f.SendFlag = {}));
        var l = f.SendFlag;

        function j(c, e, f) {
            if (a.Logger && a.Logger.ulsEndpoint) {
                var d = {
                        traceLevel: c,
                        message: e,
                        flag: f,
                        internalLog: b
                    },
                    g = JSON.stringify(d);
                a.Logger.ulsEndpoint.writeLog(g)
            }
        }
        f.sendLog = j;

        function g() {
            try {
                return new i
            } catch (a) {
                return d
            }
        }
        var i = function() {
            function d() {
                var b = this,
                    d = b;
                b.telemetryEndPoint = "https://telemetryservice.firstpartyapps.oaspapps.com/telemetryservice/telemetryproxy.html";
                b.buffer = [];
                b.proxyFrameReady = c;
                a.OUtil.addEventListener(h, n, function(a) {
                    return d.tellProxyFrameReady(a)
                });
                b.loadProxyFrame()
            }
            d.prototype.writeLog = function(c) {
                var a = this;
                if (a.proxyFrameReady === b) a.proxyFrame.contentWindow.postMessage(c, "*");
                else a.buffer.length < 128 && a.buffer.push(c)
            };
            d.prototype.tellProxyFrameReady = function(e) {
                var c = this,
                    j = c;
                if (e.data === "ProxyFrameReadyToLog") {
                    c.proxyFrameReady = b;
                    for (var d = 0; d < c.buffer.length; d++) c.writeLog(c.buffer[d]);
                    c.buffer.length = 0;
                    a.OUtil.removeEventListener(h, n, function(a) {
                        return j.tellProxyFrameReady(a)
                    })
                } else if (e.data === "ProxyFrameReadyToInit") {
                    var g = {
                            appName: "Office APPs",
                            sessionId: f.Guid.generateNew()
                        },
                        i = JSON.stringify(g);
                    c.proxyFrame.contentWindow.postMessage(i, "*")
                }
            };
            d.prototype.loadProxyFrame = function() {
                var a = this;
                a.proxyFrame = document.createElement("iframe");
                a.proxyFrame.setAttribute("style", "display:none");
                a.proxyFrame.setAttribute("src", a.telemetryEndPoint);
                document.head.appendChild(a.proxyFrame)
            };
            return d
        }();
        (function(c) {
            var a = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];

            function b() {
                for (var c = e, d = (new Date).getTime(), b = 0; b < 32 && d > 0; b++) {
                    if (b == 8 || b == 12 || b == 16 || b == 20) c += "-";
                    c += a[d % 16];
                    d = Math.floor(d / 16)
                }
                for (; b < 32; b++) {
                    if (b == 8 || b == 12 || b == 16 || b == 20) c += "-";
                    c += a[Math.floor(Math.random() * 16)]
                }
                return c
            }
            c.generateNew = b
        })(f.Guid || (f.Guid = {}));
        var m = f.Guid;
        if (!a.Logger) a.Logger = f;
        f.ulsEndpoint = g()
    })(y || (y = {}));
    var x;
    (function(i) {
        s;
        var f, w = function() {
                function a() {}
                return a
            }(),
            k = function() {
                function a(b, a) {
                    this.name = b;
                    this.handler = a
                }
                return a
            }(),
            l = function() {
                function b() {
                    this.clientIDKey = "Office API client";
                    this.logIdSetKey = "Office App Log Id Set"
                }
                b.prototype.getClientId = function() {
                    var c = this,
                        b = c.getValue(c.clientIDKey);
                    if (!b || b.length <= 0 || b.length > 40) {
                        b = a.Logger.Guid.generateNew();
                        c.setValue(c.clientIDKey, b)
                    }
                    return b
                };
                b.prototype.saveLog = function(c, d) {
                    var b = this,
                        a = b.getValue(b.logIdSetKey);
                    a = (a && a.length > 0 ? a + ";" : e) + c;
                    b.setValue(b.logIdSetKey, a);
                    b.setValue(c, d)
                };
                b.prototype.enumerateLog = function(c, e) {
                    var a = this,
                        d = a.getValue(a.logIdSetKey);
                    if (d) {
                        var f = d.split(";");
                        for (var h in f) {
                            var b = f[h],
                                g = a.getValue(b);
                            if (g) {
                                c && c(b, g);
                                e && a.remove(b)
                            }
                        }
                        e && a.remove(a.logIdSetKey)
                    }
                };
                b.prototype.getValue = function(d) {
                    var b = a.OUtil.getLocalStorage(),
                        c = e;
                    if (b) c = b.getItem(d);
                    return c
                };
                b.prototype.setValue = function(d, c) {
                    var b = a.OUtil.getLocalStorage();
                    b && b.setItem(d, c)
                };
                b.prototype.remove = function(c) {
                    var b = a.OUtil.getLocalStorage();
                    if (b) try {
                        b.removeItem(c)
                    } catch (d) {}
                };
                return b
            }(),
            m = function() {
                function b() {}
                b.prototype.LogData = function(b) {
                    if (!a.Logger) return;
                    a.Logger.sendLog(a.Logger.TraceLevel.info, b.SerializeRow(), a.Logger.SendFlag.none)
                };
                b.prototype.LogRawData = function(b) {
                    if (!a.Logger) return;
                    a.Logger.sendLog(a.Logger.TraceLevel.info, b, a.Logger.SendFlag.none)
                };
                return b
            }();

        function u(g) {
            if (!a.Logger) return;
            if (f) return;
            f = new w;
            f.sessionId = a.Logger.Guid.generateNew();
            f.hostVersion = g.get_appVersion();
            f.appId = g.get_id();
            f.host = g.get_appName();
            f.browser = h.navigator.userAgent;
            f.correlationId = g.get_correlationId();
            f.clientId = (new l).getClientId();
            var j = location.href.indexOf("?");
            f.appURL = j == -1 ? location.href : location.href.substring(0, j);
            (function(g, a) {
                var c, f, b;
                a.assetId = e;
                a.userId = e;
                try {
                    c = decodeURIComponent(g);
                    f = new DOMParser;
                    b = f.parseFromString(c, "text/xml");
                    a.userId = b.getElementsByTagName("t")[0].attributes.getNamedItem("cid").nodeValue;
                    a.assetId = b.getElementsByTagName("t")[0].attributes.getNamedItem("aid").nodeValue
                } catch (h) {} finally {
                    c = d;
                    b = d;
                    f = d
                }
            })(g.get_eToken(), f);
            (function() {
                var n = new Date,
                    f = new Date,
                    l = 0,
                    m = c,
                    e = [];
                e.push(new k("focus", function() {
                    f = new Date
                }));
                e.push(new k("blur", function() {
                    if (f) {
                        l += Math.abs((new Date).getTime() - f.getTime());
                        f = d
                    }
                }));
                var j = function() {
                    for (var c = 0; c < e.length; c++) a.OUtil.removeEventListener(h, e[c].name, e[c].handler);
                    e.length = 0;
                    if (!m) {
                        i.onAppClosed(Math.abs((new Date).getTime() - n.getTime()), l);
                        m = b
                    }
                };
                e.push(new k("beforeunload", j));
                e.push(new k("unload", j));
                for (var g = 0; g < e.length; g++) a.OUtil.addEventListener(h, e[g].name, e[g].handler)
            })();
            i.onAppActivated()
        }
        i.initialize = u;

        function n() {
            if (!f) return;
            (new l).enumerateLog(function(b, a) {
                return (new m).LogRawData(a)
            }, b);
            var a = new q.AppActivatedUsageData;
            a.SessionId = f.sessionId;
            a.AppId = f.appId;
            a.AssetId = f.assetId;
            a.AppURL = f.appURL;
            a.UserId = f.userId;
            a.ClientId = f.clientId;
            a.Browser = f.browser;
            a.Host = f.host;
            a.HostVersion = f.hostVersion;
            a.CorrelationId = f.correlationId;
            a.AppSizeWidth = h.innerWidth;
            a.AppSizeHeight = h.innerHeight;
            (new m).LogData(a)
        }
        i.onAppActivated = n;

        function v(e, g, c, b, d) {
            if (!f) return;
            var a = new q.APIUsageUsageData;
            a.SessionId = f.sessionId;
            a.APIType = e;
            a.APIID = g;
            a.Parameters = c;
            a.ResponseTime = b;
            a.ErrorType = d;
            (new m).LogData(a)
        }
        i.onCallDone = v;

        function p(k, c, h, i) {
            var b = d;
            if (c)
                if (typeof c == g) b = String(c);
                else if (typeof c === j)
                for (var f in c) {
                    if (b !== d) b += ",";
                    else b = e;
                    if (typeof c[f] == g) b += String(c[f])
                } else b = e;
            a.AppTelemetry.onCallDone("method", k, b, h, i)
        }
        i.onMethodDone = p;

        function t(c, b) {
            a.AppTelemetry.onCallDone("event", c, d, 0, b)
        }
        i.onEventDone = t;

        function o(e, f, b, c) {
            a.AppTelemetry.onCallDone(e ? "registerevent" : "unregisterevent", f, d, b, c)
        }
        i.onRegisterDone = o;

        function r(c, b) {
            if (!f) return;
            var a = new q.AppClosedUsageData;
            a.SessionId = f.sessionId;
            a.FocusTime = b;
            a.OpenTime = c;
            a.AppSizeFinalWidth = h.innerWidth;
            a.AppSizeFinalHeight = h.innerHeight;
            (new l).saveLog(f.sessionId, a.SerializeRow())
        }
        i.onAppClosed = r;
        a.AppTelemetry = i
    })(x || (x = {}));
    var z = function() {
            var o = "bindings",
                n = "document",
                s = "getXmlAsync",
                q = "getNodesAsync",
                p = "getByIdAsync",
                m = "boolean",
                k = "string";
            a.EventDispatch = function(a) {
                this._eventHandlers = {};
                for (var c in a) {
                    var b = a[c];
                    this._eventHandlers[b] = []
                }
            };
            a.EventDispatch.prototype = {
                getSupportedEvents: function() {
                    var a = [];
                    for (var b in this._eventHandlers) a.push(b);
                    return a
                },
                supportsEvent: function(e) {
                    var a = c;
                    for (var d in this._eventHandlers)
                        if (e == d) {
                            a = b;
                            break
                        }
                    return a
                },
                hasEventHandler: function(d, e) {
                    var a = this._eventHandlers[d];
                    if (a && a.length > 0)
                        for (var f in a)
                            if (a[f] === e) return b;
                    return c
                },
                addEventHandler: function(d, a) {
                    if (typeof a != i) return c;
                    var e = this._eventHandlers[d];
                    if (e && !this.hasEventHandler(d, a)) {
                        e.push(a);
                        return b
                    } else return c
                },
                removeEventHandler: function(e, f) {
                    var a = this._eventHandlers[e];
                    if (a && a.length > 0)
                        for (var d = 0; d < a.length; d++)
                            if (a[d] === f) {
                                a.splice(d, 1);
                                return b
                            }
                    return c
                },
                clearEventHandlers: function(a) {
                    this._eventHandlers[a] = []
                },
                getEventHandlerCount: function(a) {
                    return this._eventHandlers[a] != undefined ? this._eventHandlers[a].length : -1
                },
                fireEvent: function(a) {
                    if (a.type == undefined) return c;
                    var d = a.type;
                    if (d && this._eventHandlers[d]) {
                        var e = this._eventHandlers[d];
                        for (var f in e) e[f](a);
                        return b
                    } else return c
                }
            };
            a.DDA.DataCoercion = function() {
                return {
                    findArrayDimensionality: function(d) {
                        if (a.OUtil.isArray(d)) {
                            for (var c = 0, b = 0; b < d.length; b++) c = Math.max(c, a.DDA.DataCoercion.findArrayDimensionality(d[b]));
                            return c + 1
                        } else return 0
                    },
                    getCoercionDefaultForBinding: function(a) {
                        switch (a) {
                            case Microsoft.Office.WebExtension.BindingType.Matrix:
                                return Microsoft.Office.WebExtension.CoercionType.Matrix;
                            case Microsoft.Office.WebExtension.BindingType.Table:
                                return Microsoft.Office.WebExtension.CoercionType.Table;
                            case Microsoft.Office.WebExtension.BindingType.Text:
                            default:
                                return Microsoft.Office.WebExtension.CoercionType.Text
                        }
                    },
                    getBindingDefaultForCoercion: function(a) {
                        switch (a) {
                            case Microsoft.Office.WebExtension.CoercionType.Matrix:
                                return Microsoft.Office.WebExtension.BindingType.Matrix;
                            case Microsoft.Office.WebExtension.CoercionType.Table:
                                return Microsoft.Office.WebExtension.BindingType.Table;
                            case Microsoft.Office.WebExtension.CoercionType.Text:
                            case Microsoft.Office.WebExtension.CoercionType.Html:
                            case Microsoft.Office.WebExtension.CoercionType.Ooxml:
                            default:
                                return Microsoft.Office.WebExtension.BindingType.Text
                        }
                    },
                    determineCoercionType: function(b) {
                        if (b == d || b == undefined) return d;
                        var c = d,
                            e = typeof b;
                        if (b.rows !== undefined) c = Microsoft.Office.WebExtension.CoercionType.Table;
                        else if (a.OUtil.isArray(b)) c = Microsoft.Office.WebExtension.CoercionType.Matrix;
                        else if (e == k || e == g || e == m || a.OUtil.isDate(b)) c = Microsoft.Office.WebExtension.CoercionType.Text;
                        else throw a.DDA.ErrorCodeManager.errorCodes.ooeUnsupportedDataObject;
                        return c
                    },
                    coerceData: function(c, d, b) {
                        b = b || a.DDA.DataCoercion.determineCoercionType(c);
                        if (b && b != d) {
                            a.OUtil.writeProfilerMark(a.InternalPerfMarker.DataCoercionBegin);
                            c = a.DDA.DataCoercion._coerceDataFromTable(d, a.DDA.DataCoercion._coerceDataToTable(c, b));
                            a.OUtil.writeProfilerMark(a.InternalPerfMarker.DataCoercionEnd)
                        }
                        return c
                    },
                    _matrixToText: function(a) {
                        if (a.length == 1 && a[0].length == 1) return e + a[0][0];
                        for (var b = e, c = 0; c < a.length; c++) b += a[c].join("\t") + "\n";
                        return b.substring(0, b.length - 1)
                    },
                    _textToMatrix: function(c) {
                        for (var a = c.split("\n"), b = 0; b < a.length; b++) a[b] = a[b].split("\t");
                        return a
                    },
                    _tableToText: function(c) {
                        var b = e;
                        if (c.headers != d) b = a.DDA.DataCoercion._matrixToText([c.headers]) + "\n";
                        var f = a.DDA.DataCoercion._matrixToText(c.rows);
                        if (f == e) b = b.substring(0, b.length - 1);
                        return b + f
                    },
                    _tableToMatrix: function(a) {
                        var b = a.rows;
                        a.headers != d && b.unshift(a.headers);
                        return b
                    },
                    _coerceDataFromTable: function(d, c) {
                        var b;
                        switch (d) {
                            case Microsoft.Office.WebExtension.CoercionType.Table:
                                b = c;
                                break;
                            case Microsoft.Office.WebExtension.CoercionType.Matrix:
                                b = a.DDA.DataCoercion._tableToMatrix(c);
                                break;
                            case Microsoft.Office.WebExtension.CoercionType.Text:
                            case Microsoft.Office.WebExtension.CoercionType.Html:
                            case Microsoft.Office.WebExtension.CoercionType.Ooxml:
                            default:
                                b = a.DDA.DataCoercion._tableToText(c)
                        }
                        return b
                    },
                    _coerceDataToTable: function(c, d) {
                        if (d == undefined) d = a.DDA.DataCoercion.determineCoercionType(c);
                        var b;
                        switch (d) {
                            case Microsoft.Office.WebExtension.CoercionType.Table:
                                b = c;
                                break;
                            case Microsoft.Office.WebExtension.CoercionType.Matrix:
                                b = new Microsoft.Office.WebExtension.TableData(c);
                                break;
                            case Microsoft.Office.WebExtension.CoercionType.Text:
                            case Microsoft.Office.WebExtension.CoercionType.Html:
                            case Microsoft.Office.WebExtension.CoercionType.Ooxml:
                            default:
                                b = new Microsoft.Office.WebExtension.TableData(a.DDA.DataCoercion._textToMatrix(c))
                        }
                        return b
                    }
                }
            }();
            a.DDA.issueAsyncResult = function(e, g, b) {
                var f = e[Microsoft.Office.WebExtension.Parameters.Callback];
                if (f) {
                    var d = {};
                    d[a.DDA.AsyncResultEnum.Properties.Context] = e[Microsoft.Office.WebExtension.Parameters.AsyncContext];
                    var c;
                    if (g == a.DDA.ErrorCodeManager.errorCodes.ooeSuccess) d[a.DDA.AsyncResultEnum.Properties.Value] = b;
                    else {
                        c = {};
                        b = b || a.DDA.ErrorCodeManager.getErrorArgs(a.DDA.ErrorCodeManager.errorCodes.ooeInternalError);
                        c[a.DDA.AsyncResultEnum.ErrorProperties.Code] = g || a.DDA.ErrorCodeManager.errorCodes.ooeInternalError;
                        c[a.DDA.AsyncResultEnum.ErrorProperties.Name] = b.name || b;
                        c[a.DDA.AsyncResultEnum.ErrorProperties.Message] = b.message || b
                    }
                    f(new a.DDA.AsyncResult(d, c))
                }
            };
            a.DDA.generateBindingId = function() {
                return "UnnamedBinding_" + a.OUtil.getUniqueId() + "_" + (new Date).getTime()
            };
            a.DDA.SettingsManager = {
                SerializedSettings: "serializedSettings",
                DateJSONPrefix: "Date(",
                DataJSONSuffix: ")",
                serializeSettings: function(c) {
                    var e = {};
                    for (var d in c) {
                        var b = c[d];
                        try {
                            if (JSON) b = JSON.stringify(b, function(b, c) {
                                return a.OUtil.isDate(this[b]) ? a.DDA.SettingsManager.DateJSONPrefix + this[b].getTime() + a.DDA.SettingsManager.DataJSONSuffix : c
                            });
                            else b = Sys.Serialization.JavaScriptSerializer.serialize(b);
                            e[d] = b
                        } catch (f) {}
                    }
                    return e
                },
                deserializeSettings: function(d) {
                    var f = {};
                    d = d || {};
                    for (var e in d) {
                        var c = d[e];
                        try {
                            if (JSON) c = JSON.parse(c, function(d, b) {
                                var c;
                                if (typeof b === k && b && b.length > 6 && b.slice(0, 5) === a.DDA.SettingsManager.DateJSONPrefix && b.slice(-1) === a.DDA.SettingsManager.DataJSONSuffix) {
                                    c = new Date(parseInt(b.slice(5, -1)));
                                    if (c) return c
                                }
                                return b
                            });
                            else c = Sys.Serialization.JavaScriptSerializer.deserialize(c, b);
                            f[e] = c
                        } catch (g) {}
                    }
                    return f
                }
            };
            a.DDA.OMFactory = {
                manufactureBinding: function(b, d) {
                    var e = b[a.DDA.BindingProperties.Id],
                        g = b[a.DDA.BindingProperties.RowCount],
                        f = b[a.DDA.BindingProperties.ColumnCount],
                        h = b[a.DDA.BindingProperties.HasHeaders],
                        c;
                    switch (b[a.DDA.BindingProperties.Type]) {
                        case Microsoft.Office.WebExtension.BindingType.Text:
                            c = new a.DDA.TextBinding(e, d);
                            break;
                        case Microsoft.Office.WebExtension.BindingType.Matrix:
                            c = new a.DDA.MatrixBinding(e, d, g, f);
                            break;
                        case Microsoft.Office.WebExtension.BindingType.Table:
                            c = new a.DDA.TableBinding(e, d, g, f, h);
                            break;
                        default:
                            c = new a.DDA.UnknownBinding(e, d)
                    }
                    return c
                },
                manufactureTableData: function(b) {
                    return new Microsoft.Office.WebExtension.TableData(b[a.DDA.TableDataProperties.TableRows], b[a.DDA.TableDataProperties.TableHeaders])
                },
                manufactureDataNode: function(b) {
                    if (b) return new a.DDA.CustomXmlNode(b[a.DDA.DataNodeProperties.Handle], b[a.DDA.DataNodeProperties.NodeType], b[a.DDA.DataNodeProperties.NamespaceUri], b[a.DDA.DataNodeProperties.BaseName])
                },
                manufactureDataPart: function(b, c) {
                    return new a.DDA.CustomXmlPart(c, b[a.DDA.DataPartProperties.Id], b[a.DDA.DataPartProperties.BuiltIn])
                },
                manufactureEventArgs: function(f, d, b) {
                    var e = this,
                        c;
                    switch (f) {
                        case Microsoft.Office.WebExtension.EventType.DocumentSelectionChanged:
                            c = new a.DDA.DocumentSelectionChangedEventArgs(d);
                            break;
                        case Microsoft.Office.WebExtension.EventType.BindingSelectionChanged:
                            c = new a.DDA.BindingSelectionChangedEventArgs(e.manufactureBinding(b, d.document), b[a.DDA.PropertyDescriptors.Subset]);
                            break;
                        case Microsoft.Office.WebExtension.EventType.BindingDataChanged:
                            c = new a.DDA.BindingDataChangedEventArgs(e.manufactureBinding(b, d.document));
                            break;
                        case Microsoft.Office.WebExtension.EventType.SettingsChanged:
                            c = new a.DDA.SettingsChangedEventArgs(d);
                            break;
                        case Microsoft.Office.WebExtension.EventType.DataNodeInserted:
                            c = new a.DDA.NodeInsertedEventArgs(e.manufactureDataNode(b[a.DDA.DataNodeEventProperties.NewNode]), b[a.DDA.DataNodeEventProperties.InUndoRedo]);
                            break;
                        case Microsoft.Office.WebExtension.EventType.DataNodeReplaced:
                            c = new a.DDA.NodeReplacedEventArgs(e.manufactureDataNode(b[a.DDA.DataNodeEventProperties.OldNode]), e.manufactureDataNode(b[a.DDA.DataNodeEventProperties.NewNode]), b[a.DDA.DataNodeEventProperties.InUndoRedo]);
                            break;
                        case Microsoft.Office.WebExtension.EventType.DataNodeDeleted:
                            c = new a.DDA.NodeDeletedEventArgs(e.manufactureDataNode(b[a.DDA.DataNodeEventProperties.OldNode]), e.manufactureDataNode(b[a.DDA.DataNodeEventProperties.NextSiblingNode]), b[a.DDA.DataNodeEventProperties.InUndoRedo]);
                            break;
                        case Microsoft.Office.WebExtension.EventType.TaskSelectionChanged:
                            c = new a.DDA.TaskSelectionChangedEventArgs(d);
                            break;
                        case Microsoft.Office.WebExtension.EventType.ResourceSelectionChanged:
                            c = new a.DDA.ResourceSelectionChangedEventArgs(d);
                            break;
                        case Microsoft.Office.WebExtension.EventType.ViewSelectionChanged:
                            c = new a.DDA.ViewSelectionChangedEventArgs(d);
                            break;
                        default:
                            throw Error.argument(Microsoft.Office.WebExtension.Parameters.EventType, a.OUtil.formatString(Strings.OfficeOM.L_NotSupportedEventType, f))
                    }
                    return c
                }
            };
            a.DDA.ListType = function() {
                var b = {};
                b[a.DDA.ListDescriptors.BindingList] = a.DDA.PropertyDescriptors.BindingProperties;
                b[a.DDA.ListDescriptors.DataPartList] = a.DDA.PropertyDescriptors.DataPartProperties;
                b[a.DDA.ListDescriptors.DataNodeList] = a.DDA.PropertyDescriptors.DataNodeProperties;
                return {
                    isListType: function(c) {
                        return a.OUtil.listContainsKey(b, c)
                    },
                    getDescriptor: function(a) {
                        return b[a]
                    }
                }
            }();
            a.DDA.AsyncMethodCall = function(d, e, h, m, n, l, q) {
                var b = d.length,
                    c = a.OUtil.delayExecutionAndCache(function() {
                        return a.OUtil.formatString(Strings.OfficeOM.L_InvalidParameters, q)
                    });

                function g(e, h) {
                    for (var g in e) {
                        var b = e[g],
                            d = h[g];
                        if (b["enum"]) switch (typeof d) {
                            case k:
                                if (a.OUtil.listContainsValue(b["enum"], d)) break;
                            case f:
                                throw a.DDA.ErrorCodeManager.errorCodes.ooeUnsupportedEnumeration;
                                break;
                            default:
                                throw c()
                        }
                        if (b["types"])
                            if (!a.OUtil.listContainsValue(b["types"], typeof d)) throw c()
                    }
                }

                function o(h, m, k) {
                    if (h.length < b) throw Error.parameterCount(Strings.OfficeOM.L_MissingRequiredArguments);
                    for (var e = [], a = 0; a < b; a++) e.push(h[a]);
                    g(d, e);
                    var j = {};
                    for (a = 0; a < b; a++) {
                        var f = d[a],
                            i = e[a];
                        if (f.verify) {
                            var l = f.verify(i, m, k);
                            if (!l) throw c()
                        }
                        j[f.name] = i
                    }
                    return j
                }

                function p(m, o, q, p) {
                    if (m.length > b + 2) throw Error.parameterCount(Strings.OfficeOM.L_TooManyArguments);
                    for (var c, d, n = m.length - 1; n >= b; n--) {
                        var l = m[n];
                        switch (typeof l) {
                            case j:
                                if (c) throw Error.parameterCount(Strings.OfficeOM.L_TooManyOptionalObjects);
                                else c = l;
                                break;
                            case i:
                                if (d) throw Error.parameterCount(Strings.OfficeOM.L_TooManyOptionalFunction);
                                else d = l;
                                break;
                            default:
                                throw Error.argument(Strings.OfficeOM.L_InValidOptionalArgument)
                        }
                    }
                    c = c || {};
                    for (var k in e)
                        if (!a.OUtil.listContainsKey(c, k)) {
                            var h = undefined,
                                f = e[k];
                            if (f.calculate && o) h = f.calculate(o, q, p);
                            if (!h && f.defaultValue != undefined) h = f.defaultValue;
                            c[k] = h
                        }
                    if (d)
                        if (c[Microsoft.Office.WebExtension.Parameters.Callback]) throw Strings.OfficeOM.L_RedundantCallbackSpecification;
                        else c[Microsoft.Office.WebExtension.Parameters.Callback] = d;
                    g(e, c);
                    return c
                }
                this.verifyAndExtractCall = function(e, c, b) {
                    var d = o(e, c, b),
                        f = p(e, d, c, b),
                        a = {};
                    for (var i in d) a[i] = d[i];
                    for (var g in f) a[g] = f[g];
                    for (var j in h) a[j] = h[j](c, b);
                    if (l) a = l(a, c, b);
                    return a
                };
                this.processResponse = function(d, c, f, e) {
                    var b;
                    if (d == a.DDA.ErrorCodeManager.errorCodes.ooeSuccess)
                        if (m) b = m(c, f, e);
                        else b = c;
                    else if (n) b = n(d, c);
                    else b = a.DDA.ErrorCodeManager.getErrorArgs(d);
                    return b
                };
                this.getCallArgs = function(f) {
                    for (var a, c, e = f.length - 1; e >= b; e--) {
                        var d = f[e];
                        switch (typeof d) {
                            case j:
                                a = d;
                                break;
                            case i:
                                c = d
                        }
                    }
                    a = a || {};
                    if (c) a[Microsoft.Office.WebExtension.Parameters.Callback] = c;
                    return a
                }
            };
            a.DDA.AsyncMethodNames = function(c) {
                var d = {};
                for (var b in c) {
                    var e = {};
                    a.OUtil.defineEnumerableProperties(e, {
                        id: {
                            value: b
                        },
                        displayName: {
                            value: c[b]
                        }
                    });
                    d[b] = e
                }
                return d
            }({
                GetSelectedDataAsync: "getSelectedDataAsync",
                SetSelectedDataAsync: "setSelectedDataAsync",
                GetDocumentCopyAsync: "getFileAsync",
                GetDocumentCopyChunkAsync: "getSliceAsync",
                ReleaseDocumentCopyAsync: "closeAsync",
                AddFromSelectionAsync: "addFromSelectionAsync",
                AddFromPromptAsync: "addFromPromptAsync",
                AddFromNamedItemAsync: "addFromNamedItemAsync",
                GetAllAsync: "getAllAsync",
                GetByIdAsync: p,
                ReleaseByIdAsync: "releaseByIdAsync",
                GetDataAsync: "getDataAsync",
                SetDataAsync: "setDataAsync",
                AddRowsAsync: "addRowsAsync",
                AddColumnsAsync: "addColumnsAsync",
                DeleteAllDataValuesAsync: "deleteAllDataValuesAsync",
                RefreshAsync: "refreshAsync",
                SaveAsync: "saveAsync",
                AddHandlerAsync: "addHandlerAsync",
                RemoveHandlerAsync: "removeHandlerAsync",
                AddDataPartAsync: "addAsync",
                GetDataPartByIdAsync: p,
                GetDataPartsByNameSpaceAsync: "getByNamespaceAsync",
                DeleteDataPartAsync: "deleteAsync",
                GetPartNodesAsync: q,
                GetPartXmlAsync: s,
                AddDataPartNamespaceAsync: "addNamespaceAsync",
                GetDataPartNamespaceAsync: "getNamespaceAsync",
                GetDataPartPrefixAsync: "getPrefixAsync",
                GetRelativeNodesAsync: q,
                GetNodeValueAsync: "getNodeValueAsync",
                GetNodeXmlAsync: s,
                SetNodeValueAsync: "setNodeValueAsync",
                SetNodeXmlAsync: "setXmlAsync",
                GetSelectedTask: "getSelectedTaskAsync",
                GetTask: "getTaskAsync",
                GetWSSUrl: "getWSSUrlAsync",
                GetTaskField: "getTaskFieldAsync",
                GetSelectedResource: "getSelectedResourceAsync",
                GetResourceField: "getResourceFieldAsync",
                GetProjectField: "getProjectFieldAsync",
                GetSelectedView: "getSelectedViewAsync"
            });
            a.DDA.AsyncMethodCallFactory = function() {
                function b(a) {
                    var c = d;
                    if (a) {
                        c = {};
                        for (var e = a.length, b = 0; b < e; b++) c[a[b].name] = a[b].value
                    }
                    return c
                }
                return {
                    manufacture: function(c) {
                        var e = c.supportedOptions ? b(c.supportedOptions) : [],
                            d = c.privateStateCallbacks ? b(c.privateStateCallbacks) : [];
                        return new a.DDA.AsyncMethodCall(c.requiredArguments || [], e, d, c.onSucceeded, c.onFailed, c.checkCallArgs, c.method.displayName)
                    }
                }
            }();
            a.DDA.AsyncMethodCalls = function() {
                var q = {};

                function e(b) {
                    q[b.method.id] = a.DDA.AsyncMethodCallFactory.manufacture(b)
                }

                function h(c, f, e) {
                    var b = c[Microsoft.Office.WebExtension.Parameters.Data];
                    if (b && (b[a.DDA.TableDataProperties.TableRows] != undefined || b[a.DDA.TableDataProperties.TableHeaders] != undefined)) b = a.DDA.OMFactory.manufactureTableData(b);
                    b = a.DDA.DataCoercion.coerceData(b, e[Microsoft.Office.WebExtension.Parameters.CoercionType]);
                    return b == undefined ? d : b
                }

                function l(b) {
                    return a.DDA.OMFactory.manufactureBinding(b, Microsoft.Office.WebExtension.context.document)
                }

                function o(b) {
                    return a.DDA.OMFactory.manufactureDataPart(b, Microsoft.Office.WebExtension.context.document.customXmlParts)
                }

                function r(b) {
                    return a.DDA.OMFactory.manufactureDataNode(b)
                }

                function f(a) {
                    return a.id
                }

                function p(b, a) {
                    return a
                }

                function n(b, a) {
                    return a
                }
                e({
                    method: a.DDA.AsyncMethodNames.GetSelectedDataAsync,
                    requiredArguments: [{
                        name: Microsoft.Office.WebExtension.Parameters.CoercionType,
                        "enum": Microsoft.Office.WebExtension.CoercionType
                    }],
                    supportedOptions: [{
                        name: Microsoft.Office.WebExtension.Parameters.ValueFormat,
                        value: {
                            "enum": Microsoft.Office.WebExtension.ValueFormat,
                            defaultValue: Microsoft.Office.WebExtension.ValueFormat.Unformatted
                        }
                    }, {
                        name: Microsoft.Office.WebExtension.Parameters.FilterType,
                        value: {
                            "enum": Microsoft.Office.WebExtension.FilterType,
                            defaultValue: Microsoft.Office.WebExtension.FilterType.All
                        }
                    }],
                    privateStateCallbacks: [],
                    onSucceeded: h
                });
                e({
                    method: a.DDA.AsyncMethodNames.SetSelectedDataAsync,
                    requiredArguments: [{
                        name: Microsoft.Office.WebExtension.Parameters.Data,
                        types: [k, j, g, m]
                    }],
                    supportedOptions: [{
                        name: Microsoft.Office.WebExtension.Parameters.CoercionType,
                        value: {
                            "enum": Microsoft.Office.WebExtension.CoercionType,
                            calculate: function(b) {
                                return a.DDA.DataCoercion.determineCoercionType(b[Microsoft.Office.WebExtension.Parameters.Data])
                            }
                        }
                    }],
                    privateStateCallbacks: []
                });
                e({
                    method: a.DDA.AsyncMethodNames.GetDocumentCopyAsync,
                    requiredArguments: [{
                        name: Microsoft.Office.WebExtension.Parameters.FileType,
                        "enum": Microsoft.Office.WebExtension.FileType
                    }],
                    supportedOptions: [{
                        name: Microsoft.Office.WebExtension.Parameters.SliceSize,
                        value: {
                            types: [g],
                            defaultValue: 4 * 1024 * 1024
                        }
                    }],
                    onSucceeded: function(b, d, c) {
                        return new a.DDA.File(b[a.DDA.FileProperties.Handle], b[a.DDA.FileProperties.FileSize], c[Microsoft.Office.WebExtension.Parameters.SliceSize])
                    }
                });
                e({
                    method: a.DDA.AsyncMethodNames.GetDocumentCopyChunkAsync,
                    requiredArguments: [{
                        name: Microsoft.Office.WebExtension.Parameters.SliceIndex,
                        types: [g]
                    }],
                    privateStateCallbacks: [{
                        name: a.DDA.FileProperties.Handle,
                        value: function(c, b) {
                            return b[a.DDA.FileProperties.Handle]
                        }
                    }, {
                        name: a.DDA.FileProperties.SliceSize,
                        value: function(c, b) {
                            return b[a.DDA.FileProperties.SliceSize]
                        }
                    }],
                    checkCallArgs: function(b, e, d) {
                        var c = b[Microsoft.Office.WebExtension.Parameters.SliceIndex];
                        if (c < 0 || c >= e.sliceCount) throw a.DDA.ErrorCodeManager.errorCodes.ooeIndexOutOfRange;
                        b[a.DDA.FileSliceOffset] = parseInt(c * d[a.DDA.FileProperties.SliceSize]);
                        return b
                    },
                    onSucceeded: function(b, e, d) {
                        var c = {};
                        a.OUtil.defineEnumerableProperties(c, {
                            data: {
                                value: b[Microsoft.Office.WebExtension.Parameters.Data]
                            },
                            index: {
                                value: d[Microsoft.Office.WebExtension.Parameters.SliceIndex]
                            },
                            size: {
                                value: b[a.DDA.FileProperties.SliceSize]
                            }
                        });
                        return c
                    }
                });
                e({
                    method: a.DDA.AsyncMethodNames.ReleaseDocumentCopyAsync,
                    privateStateCallbacks: [{
                        name: a.DDA.FileProperties.Handle,
                        value: function(c, b) {
                            return b[a.DDA.FileProperties.Handle]
                        }
                    }]
                });
                e({
                    method: a.DDA.AsyncMethodNames.AddFromSelectionAsync,
                    requiredArguments: [{
                        name: Microsoft.Office.WebExtension.Parameters.BindingType,
                        "enum": Microsoft.Office.WebExtension.BindingType
                    }],
                    supportedOptions: [{
                        name: Microsoft.Office.WebExtension.Parameters.Id,
                        value: {
                            types: [k],
                            calculate: a.DDA.generateBindingId
                        }
                    }],
                    privateStateCallbacks: [],
                    onSucceeded: l
                });
                e({
                    method: a.DDA.AsyncMethodNames.AddFromPromptAsync,
                    requiredArguments: [{
                        name: Microsoft.Office.WebExtension.Parameters.BindingType,
                        "enum": Microsoft.Office.WebExtension.BindingType
                    }],
                    supportedOptions: [{
                        name: Microsoft.Office.WebExtension.Parameters.Id,
                        value: {
                            types: [k],
                            calculate: a.DDA.generateBindingId
                        }
                    }, {
                        name: Microsoft.Office.WebExtension.Parameters.PromptText,
                        value: {
                            types: [k],
                            calculate: function() {
                                return Strings.OfficeOM.L_AddBindingFromPromptDefaultText
                            }
                        }
                    }],
                    privateStateCallbacks: [],
                    onSucceeded: l
                });
                e({
                    method: a.DDA.AsyncMethodNames.AddFromNamedItemAsync,
                    requiredArguments: [{
                        name: Microsoft.Office.WebExtension.Parameters.ItemName,
                        types: [k]
                    }, {
                        name: Microsoft.Office.WebExtension.Parameters.BindingType,
                        "enum": Microsoft.Office.WebExtension.BindingType
                    }],
                    supportedOptions: [{
                        name: Microsoft.Office.WebExtension.Parameters.Id,
                        value: {
                            types: [k],
                            calculate: a.DDA.generateBindingId
                        }
                    }],
                    privateStateCallbacks: [{
                        name: Microsoft.Office.WebExtension.Parameters.FailOnCollision,
                        value: function() {
                            return b
                        }
                    }],
                    onSucceeded: l
                });
                e({
                    method: a.DDA.AsyncMethodNames.GetAllAsync,
                    requiredArguments: [],
                    supportedOptions: [],
                    privateStateCallbacks: [],
                    onSucceeded: function(b) {
                        return a.OUtil.mapList(b[a.DDA.ListDescriptors.BindingList], l)
                    }
                });
                e({
                    method: a.DDA.AsyncMethodNames.GetByIdAsync,
                    requiredArguments: [{
                        name: Microsoft.Office.WebExtension.Parameters.Id,
                        types: [k]
                    }],
                    supportedOptions: [],
                    privateStateCallbacks: [],
                    onSucceeded: l
                });
                e({
                    method: a.DDA.AsyncMethodNames.ReleaseByIdAsync,
                    requiredArguments: [{
                        name: Microsoft.Office.WebExtension.Parameters.Id,
                        types: [k]
                    }],
                    supportedOptions: [],
                    privateStateCallbacks: [],
                    onSucceeded: function(d, b, a) {
                        var c = a[Microsoft.Office.WebExtension.Parameters.Id];
                        delete b._eventDispatches[c]
                    }
                });
                e({
                    method: a.DDA.AsyncMethodNames.GetDataAsync,
                    requiredArguments: [],
                    supportedOptions: [{
                        name: Microsoft.Office.WebExtension.Parameters.CoercionType,
                        value: {
                            "enum": Microsoft.Office.WebExtension.CoercionType,
                            calculate: function(c, b) {
                                return a.DDA.DataCoercion.getCoercionDefaultForBinding(b.type)
                            }
                        }
                    }, {
                        name: Microsoft.Office.WebExtension.Parameters.ValueFormat,
                        value: {
                            "enum": Microsoft.Office.WebExtension.ValueFormat,
                            defaultValue: Microsoft.Office.WebExtension.ValueFormat.Unformatted
                        }
                    }, {
                        name: Microsoft.Office.WebExtension.Parameters.FilterType,
                        value: {
                            "enum": Microsoft.Office.WebExtension.FilterType,
                            defaultValue: Microsoft.Office.WebExtension.FilterType.All
                        }
                    }, {
                        name: Microsoft.Office.WebExtension.Parameters.StartRow,
                        value: {
                            types: [g],
                            defaultValue: 0
                        }
                    }, {
                        name: Microsoft.Office.WebExtension.Parameters.StartColumn,
                        value: {
                            types: [g],
                            defaultValue: 0
                        }
                    }, {
                        name: Microsoft.Office.WebExtension.Parameters.RowCount,
                        value: {
                            types: [g],
                            defaultValue: 0
                        }
                    }, {
                        name: Microsoft.Office.WebExtension.Parameters.ColumnCount,
                        value: {
                            types: [g],
                            defaultValue: 0
                        }
                    }],
                    checkCallArgs: function(b, c) {
                        if (b[Microsoft.Office.WebExtension.Parameters.StartRow] == 0 && b[Microsoft.Office.WebExtension.Parameters.StartColumn] == 0 && b[Microsoft.Office.WebExtension.Parameters.RowCount] == 0 && b[Microsoft.Office.WebExtension.Parameters.ColumnCount] == 0) {
                            delete b[Microsoft.Office.WebExtension.Parameters.StartRow];
                            delete b[Microsoft.Office.WebExtension.Parameters.StartColumn];
                            delete b[Microsoft.Office.WebExtension.Parameters.RowCount];
                            delete b[Microsoft.Office.WebExtension.Parameters.ColumnCount]
                        }
                        if (b[Microsoft.Office.WebExtension.Parameters.CoercionType] != a.DDA.DataCoercion.getCoercionDefaultForBinding(c.type) && (b[Microsoft.Office.WebExtension.Parameters.StartRow] || b[Microsoft.Office.WebExtension.Parameters.StartColumn] || b[Microsoft.Office.WebExtension.Parameters.RowCount] || b[Microsoft.Office.WebExtension.Parameters.ColumnCount])) throw a.DDA.ErrorCodeManager.errorCodes.ooeCoercionTypeNotMatchBinding;
                        return b
                    },
                    privateStateCallbacks: [{
                        name: Microsoft.Office.WebExtension.Parameters.Id,
                        value: f
                    }],
                    onSucceeded: h
                });
                e({
                    method: a.DDA.AsyncMethodNames.SetDataAsync,
                    requiredArguments: [{
                        name: Microsoft.Office.WebExtension.Parameters.Data,
                        types: [k, j, g, m]
                    }],
                    supportedOptions: [{
                        name: Microsoft.Office.WebExtension.Parameters.CoercionType,
                        value: {
                            "enum": Microsoft.Office.WebExtension.CoercionType,
                            calculate: function(b) {
                                return a.DDA.DataCoercion.determineCoercionType(b[Microsoft.Office.WebExtension.Parameters.Data])
                            }
                        }
                    }, {
                        name: Microsoft.Office.WebExtension.Parameters.StartRow,
                        value: {
                            types: [g],
                            defaultValue: 0
                        }
                    }, {
                        name: Microsoft.Office.WebExtension.Parameters.StartColumn,
                        value: {
                            types: [g],
                            defaultValue: 0
                        }
                    }],
                    checkCallArgs: function(b, c) {
                        if (b[Microsoft.Office.WebExtension.Parameters.StartRow] == 0 && b[Microsoft.Office.WebExtension.Parameters.StartColumn] == 0) {
                            delete b[Microsoft.Office.WebExtension.Parameters.StartRow];
                            delete b[Microsoft.Office.WebExtension.Parameters.StartColumn]
                        }
                        if (b[Microsoft.Office.WebExtension.Parameters.CoercionType] != a.DDA.DataCoercion.getCoercionDefaultForBinding(c.type) && (b[Microsoft.Office.WebExtension.Parameters.StartRow] || b[Microsoft.Office.WebExtension.Parameters.StartColumn])) throw a.DDA.ErrorCodeManager.errorCodes.ooeCoercionTypeNotMatchBinding;
                        return b
                    },
                    privateStateCallbacks: [{
                        name: Microsoft.Office.WebExtension.Parameters.Id,
                        value: f
                    }]
                });
                e({
                    method: a.DDA.AsyncMethodNames.AddRowsAsync,
                    requiredArguments: [{
                        name: Microsoft.Office.WebExtension.Parameters.Data,
                        types: [j]
                    }],
                    supportedOptions: [],
                    privateStateCallbacks: [{
                        name: Microsoft.Office.WebExtension.Parameters.Id,
                        value: f
                    }]
                });
                e({
                    method: a.DDA.AsyncMethodNames.AddColumnsAsync,
                    requiredArguments: [{
                        name: Microsoft.Office.WebExtension.Parameters.Data,
                        types: [j]
                    }],
                    supportedOptions: [],
                    privateStateCallbacks: [{
                        name: Microsoft.Office.WebExtension.Parameters.Id,
                        value: f
                    }]
                });
                e({
                    method: a.DDA.AsyncMethodNames.DeleteAllDataValuesAsync,
                    requiredArguments: [],
                    supportedOptions: [],
                    privateStateCallbacks: [{
                        name: Microsoft.Office.WebExtension.Parameters.Id,
                        value: f
                    }]
                });
                e({
                    method: a.DDA.AsyncMethodNames.RefreshAsync,
                    requiredArguments: [],
                    supportedOptions: [],
                    privateStateCallbacks: [],
                    onSucceeded: function(b) {
                        var c = b[a.DDA.SettingsManager.SerializedSettings],
                            d = a.DDA.SettingsManager.deserializeSettings(c);
                        return d
                    }
                });
                e({
                    method: a.DDA.AsyncMethodNames.SaveAsync,
                    requiredArguments: [],
                    supportedOptions: [{
                        name: Microsoft.Office.WebExtension.Parameters.OverwriteIfStale,
                        value: {
                            types: [m],
                            defaultValue: b
                        }
                    }],
                    privateStateCallbacks: [{
                        name: a.DDA.SettingsManager.SerializedSettings,
                        value: function(c, b) {
                            return a.DDA.SettingsManager.serializeSettings(b)
                        }
                    }]
                });
                e({
                    method: a.DDA.AsyncMethodNames.AddHandlerAsync,
                    requiredArguments: [{
                        name: Microsoft.Office.WebExtension.Parameters.EventType,
                        "enum": Microsoft.Office.WebExtension.EventType,
                        verify: function(b, c, a) {
                            return a.supportsEvent(b)
                        }
                    }, {
                        name: Microsoft.Office.WebExtension.Parameters.Handler,
                        types: [i]
                    }],
                    supportedOptions: [],
                    privateStateCallbacks: []
                });
                e({
                    method: a.DDA.AsyncMethodNames.RemoveHandlerAsync,
                    requiredArguments: [{
                        name: Microsoft.Office.WebExtension.Parameters.EventType,
                        "enum": Microsoft.Office.WebExtension.EventType,
                        verify: function(b, c, a) {
                            return a.supportsEvent(b)
                        }
                    }],
                    supportedOptions: [{
                        name: Microsoft.Office.WebExtension.Parameters.Handler,
                        value: {
                            types: [i],
                            defaultValue: d
                        }
                    }],
                    privateStateCallbacks: []
                });
                e({
                    method: a.DDA.AsyncMethodNames.AddDataPartAsync,
                    requiredArguments: [{
                        name: Microsoft.Office.WebExtension.Parameters.Xml,
                        types: [k]
                    }],
                    supportedOptions: [],
                    privateStateCallbacks: [],
                    onSucceeded: o
                });
                e({
                    method: a.DDA.AsyncMethodNames.GetDataPartByIdAsync,
                    requiredArguments: [{
                        name: Microsoft.Office.WebExtension.Parameters.Id,
                        types: [k]
                    }],
                    supportedOptions: [],
                    privateStateCallbacks: [],
                    onSucceeded: o
                });
                e({
                    method: a.DDA.AsyncMethodNames.GetDataPartsByNameSpaceAsync,
                    requiredArguments: [{
                        name: Microsoft.Office.WebExtension.Parameters.Namespace,
                        types: [k]
                    }],
                    supportedOptions: [],
                    privateStateCallbacks: [],
                    onSucceeded: function(b) {
                        return a.OUtil.mapList(b[a.DDA.ListDescriptors.DataPartList], o)
                    }
                });
                e({
                    method: a.DDA.AsyncMethodNames.DeleteDataPartAsync,
                    requiredArguments: [],
                    supportedOptions: [],
                    privateStateCallbacks: [{
                        name: a.DDA.DataPartProperties.Id,
                        value: f
                    }]
                });
                e({
                    method: a.DDA.AsyncMethodNames.GetPartNodesAsync,
                    requiredArguments: [{
                        name: Microsoft.Office.WebExtension.Parameters.XPath,
                        types: [k]
                    }],
                    supportedOptions: [],
                    privateStateCallbacks: [{
                        name: a.DDA.DataPartProperties.Id,
                        value: f
                    }],
                    onSucceeded: function(b) {
                        return a.OUtil.mapList(b[a.DDA.ListDescriptors.DataNodeList], r)
                    }
                });
                e({
                    method: a.DDA.AsyncMethodNames.GetPartXmlAsync,
                    requiredArguments: [],
                    supportedOptions: [],
                    privateStateCallbacks: [{
                        name: a.DDA.DataPartProperties.Id,
                        value: f
                    }],
                    onSucceeded: h
                });
                e({
                    method: a.DDA.AsyncMethodNames.AddDataPartNamespaceAsync,
                    requiredArguments: [{
                        name: Microsoft.Office.WebExtension.Parameters.Prefix,
                        types: [k]
                    }, {
                        name: Microsoft.Office.WebExtension.Parameters.Namespace,
                        types: [k]
                    }],
                    supportedOptions: [],
                    privateStateCallbacks: [{
                        name: a.DDA.DataPartProperties.Id,
                        value: p
                    }]
                });
                e({
                    method: a.DDA.AsyncMethodNames.GetDataPartNamespaceAsync,
                    requiredArguments: [{
                        name: Microsoft.Office.WebExtension.Parameters.Prefix,
                        types: [k]
                    }],
                    supportedOptions: [],
                    privateStateCallbacks: [{
                        name: a.DDA.DataPartProperties.Id,
                        value: p
                    }],
                    onSucceeded: h
                });
                e({
                    method: a.DDA.AsyncMethodNames.GetDataPartPrefixAsync,
                    requiredArguments: [{
                        name: Microsoft.Office.WebExtension.Parameters.Namespace,
                        types: [k]
                    }],
                    supportedOptions: [],
                    privateStateCallbacks: [{
                        name: a.DDA.DataPartProperties.Id,
                        value: p
                    }],
                    onSucceeded: h
                });
                e({
                    method: a.DDA.AsyncMethodNames.GetRelativeNodesAsync,
                    requiredArguments: [{
                        name: Microsoft.Office.WebExtension.Parameters.XPath,
                        types: [k]
                    }],
                    supportedOptions: [],
                    privateStateCallbacks: [{
                        name: a.DDA.DataNodeProperties.Handle,
                        value: n
                    }],
                    onSucceeded: function(b) {
                        return a.OUtil.mapList(b[a.DDA.ListDescriptors.DataNodeList], r)
                    }
                });
                e({
                    method: a.DDA.AsyncMethodNames.GetNodeValueAsync,
                    requiredArguments: [],
                    supportedOptions: [],
                    privateStateCallbacks: [{
                        name: a.DDA.DataNodeProperties.Handle,
                        value: n
                    }],
                    onSucceeded: h
                });
                e({
                    method: a.DDA.AsyncMethodNames.GetNodeXmlAsync,
                    requiredArguments: [],
                    supportedOptions: [],
                    privateStateCallbacks: [{
                        name: a.DDA.DataNodeProperties.Handle,
                        value: n
                    }],
                    onSucceeded: h
                });
                e({
                    method: a.DDA.AsyncMethodNames.SetNodeValueAsync,
                    requiredArguments: [{
                        name: Microsoft.Office.WebExtension.Parameters.Data,
                        types: [k]
                    }],
                    supportedOptions: [],
                    privateStateCallbacks: [{
                        name: a.DDA.DataNodeProperties.Handle,
                        value: n
                    }]
                });
                e({
                    method: a.DDA.AsyncMethodNames.SetNodeXmlAsync,
                    requiredArguments: [{
                        name: Microsoft.Office.WebExtension.Parameters.Xml,
                        types: [k]
                    }],
                    supportedOptions: [],
                    privateStateCallbacks: [{
                        name: a.DDA.DataNodeProperties.Handle,
                        value: n
                    }]
                });
                e({
                    method: a.DDA.AsyncMethodNames.GetSelectedTask,
                    onSucceeded: function(a) {
                        return a[Microsoft.Office.WebExtension.Parameters.TaskId]
                    }
                });
                e({
                    method: a.DDA.AsyncMethodNames.GetTask,
                    requiredArguments: [{
                        name: Microsoft.Office.WebExtension.Parameters.TaskId,
                        types: [k]
                    }]
                });
                e({
                    method: a.DDA.AsyncMethodNames.GetTaskField,
                    requiredArguments: [{
                        name: Microsoft.Office.WebExtension.Parameters.TaskId,
                        types: [k]
                    }, {
                        name: Microsoft.Office.WebExtension.Parameters.FieldId,
                        types: [g]
                    }],
                    supportedOptions: [{
                        name: Microsoft.Office.WebExtension.Parameters.GetRawValue,
                        value: {
                            types: [m],
                            defaultValue: c
                        }
                    }]
                });
                e({
                    method: a.DDA.AsyncMethodNames.GetResourceField,
                    requiredArguments: [{
                        name: Microsoft.Office.WebExtension.Parameters.ResourceId,
                        types: [k]
                    }, {
                        name: Microsoft.Office.WebExtension.Parameters.FieldId,
                        types: [g]
                    }],
                    supportedOptions: [{
                        name: Microsoft.Office.WebExtension.Parameters.GetRawValue,
                        value: {
                            types: [m],
                            defaultValue: c
                        }
                    }]
                });
                e({
                    method: a.DDA.AsyncMethodNames.GetProjectField,
                    requiredArguments: [{
                        name: Microsoft.Office.WebExtension.Parameters.FieldId,
                        types: [g]
                    }],
                    supportedOptions: [{
                        name: Microsoft.Office.WebExtension.Parameters.GetRawValue,
                        value: {
                            types: [m],
                            defaultValue: c
                        }
                    }]
                });
                e({
                    method: a.DDA.AsyncMethodNames.GetSelectedResource,
                    onSucceeded: function(a) {
                        return a[Microsoft.Office.WebExtension.Parameters.ResourceId]
                    }
                });
                e({
                    method: a.DDA.AsyncMethodNames.GetWSSUrl
                });
                e({
                    method: a.DDA.AsyncMethodNames.GetSelectedView
                });
                return q
            }();
            a.DDA.HostParameterMap = function(e, c) {
                var b = "fromHost",
                    j = this,
                    l = "toHost",
                    h = b,
                    f = "self",
                    k = {};
                k[Microsoft.Office.WebExtension.Parameters.Data] = {
                    toHost: function(b) {
                        if (b.rows !== undefined) {
                            var c = {};
                            c[a.DDA.TableDataProperties.TableRows] = b.rows;
                            c[a.DDA.TableDataProperties.TableHeaders] = b.headers;
                            b = c
                        }
                        return b
                    },
                    fromHost: function(a) {
                        return a
                    }
                };

                function i(j, g) {
                    var n = j ? {} : undefined;
                    for (var f in j) {
                        var d = j[f],
                            b;
                        if (a.DDA.ListType.isListType(f)) {
                            b = [];
                            for (var o in d) b.push(i(d[o], g))
                        } else if (a.OUtil.listContainsKey(k, f)) b = k[f][g](d);
                        else if (g == h && e.preserveNesting(f)) b = i(d, g);
                        else {
                            var l = c[f];
                            if (l) {
                                var m = l[g];
                                if (m) {
                                    b = m[d];
                                    if (b === undefined) b = d
                                }
                            } else b = d
                        }
                        n[f] = b
                    }
                    return n
                }

                function m(i, h) {
                    var d;
                    for (var a in h) {
                        var b;
                        if (e.isComplexType(a)) b = m(i, c[a][l]);
                        else b = i[a];
                        if (b != undefined) {
                            if (!d) d = {};
                            var g = h[a];
                            if (g == f) g = a;
                            d[g] = e.pack(a, b)
                        }
                    }
                    return d
                }

                function g(m, l, j) {
                    if (!j) j = {};
                    for (var i in l) {
                        var n = l[i],
                            b;
                        if (n == f) b = m;
                        else b = m[n];
                        if (b === d || b === undefined) j[i] = undefined;
                        else {
                            b = e.unpack(i, b);
                            var k;
                            if (e.isComplexType(i)) {
                                k = c[i][h];
                                if (e.preserveNesting(i)) j[i] = g(b, k);
                                else g(b, k, j)
                            } else {
                                if (a.DDA.ListType.isListType(i)) {
                                    k = {};
                                    var p = a.DDA.ListType.getDescriptor(i);
                                    k[p] = f;
                                    for (var o in b) b[o] = g(b[o], k)
                                }
                                j[i] = b
                            }
                        }
                    }
                    return j
                }

                function n(k, f, a) {
                    var e = c[k][a],
                        d;
                    if (a == "toHost") {
                        var j = i(f, a);
                        d = m(j, e)
                    } else if (a == b) {
                        var h = g(f, e);
                        d = i(h, a)
                    }
                    return d
                }
                if (!c) c = {};
                j.setMapping = function(j, b) {
                    var a, d;
                    if (b.map) {
                        a = b.map;
                        d = {};
                        for (var e in a) {
                            var g = a[e];
                            if (g == f) g = e;
                            d[g] = e
                        }
                    } else {
                        a = b.toHost;
                        d = b.fromHost
                    }
                    var i = c[j] = {};
                    i[l] = a;
                    i[h] = d
                };
                j.toHost = function(b, a) {
                    return n(b, a, l)
                };
                j.fromHost = function(a, b) {
                    return n(a, b, h)
                };
                j.self = f
            };
            a.DDA.SpecialProcessor = function(d, c) {
                var b = this;
                b.isComplexType = function(b) {
                    return a.OUtil.listContainsValue(d, b)
                };
                b.isDynamicType = function(b) {
                    return a.OUtil.listContainsKey(c, b)
                };
                b.preserveNesting = function(c) {
                    var b = [a.DDA.PropertyDescriptors.Subset, a.DDA.DataNodeEventProperties.OldNode, a.DDA.DataNodeEventProperties.NewNode, a.DDA.DataNodeEventProperties.NextSiblingNode];
                    return a.OUtil.listContainsValue(b, c)
                };
                b.pack = function(b, d) {
                    var a;
                    if (this.isDynamicType(b)) a = c[b].toHost(d);
                    else a = d;
                    return a
                };
                b.unpack = function(b, d) {
                    var a;
                    if (this.isDynamicType(b)) a = c[b].fromHost(d);
                    else a = d;
                    return a
                }
            };
            a.DDA.DispIdHost.Facade = function(k, j) {
                var f = {},
                    h = a.DDA.AsyncMethodNames,
                    i = a.DDA.MethodDispId;
                f[h.GetSelectedDataAsync.id] = i.dispidGetSelectedDataMethod;
                f[h.SetSelectedDataAsync.id] = i.dispidSetSelectedDataMethod;
                f[h.GetDocumentCopyChunkAsync.id] = i.dispidGetDocumentCopyChunkMethod;
                f[h.ReleaseDocumentCopyAsync.id] = i.dispidReleaseDocumentCopyMethod;
                f[h.GetDocumentCopyAsync.id] = i.dispidGetDocumentCopyMethod;
                f[h.AddFromSelectionAsync.id] = i.dispidAddBindingFromSelectionMethod;
                f[h.AddFromPromptAsync.id] = i.dispidAddBindingFromPromptMethod;
                f[h.AddFromNamedItemAsync.id] = i.dispidAddBindingFromNamedItemMethod;
                f[h.GetAllAsync.id] = i.dispidGetAllBindingsMethod;
                f[h.GetByIdAsync.id] = i.dispidGetBindingMethod;
                f[h.ReleaseByIdAsync.id] = i.dispidReleaseBindingMethod;
                f[h.GetDataAsync.id] = i.dispidGetBindingDataMethod;
                f[h.SetDataAsync.id] = i.dispidSetBindingDataMethod;
                f[h.AddRowsAsync.id] = i.dispidAddRowsMethod;
                f[h.AddColumnsAsync.id] = i.dispidAddColumnsMethod;
                f[h.DeleteAllDataValuesAsync.id] = i.dispidClearAllRowsMethod;
                f[h.RefreshAsync.id] = i.dispidLoadSettingsMethod;
                f[h.SaveAsync.id] = i.dispidSaveSettingsMethod;
                f[h.AddDataPartAsync.id] = i.dispidAddDataPartMethod;
                f[h.GetDataPartByIdAsync.id] = i.dispidGetDataPartByIdMethod;
                f[h.GetDataPartsByNameSpaceAsync.id] = i.dispidGetDataPartsByNamespaceMethod;
                f[h.GetPartXmlAsync.id] = i.dispidGetDataPartXmlMethod;
                f[h.GetPartNodesAsync.id] = i.dispidGetDataPartNodesMethod;
                f[h.DeleteDataPartAsync.id] = i.dispidDeleteDataPartMethod;
                f[h.GetNodeValueAsync.id] = i.dispidGetDataNodeValueMethod;
                f[h.GetNodeXmlAsync.id] = i.dispidGetDataNodeXmlMethod;
                f[h.GetRelativeNodesAsync.id] = i.dispidGetDataNodesMethod;
                f[h.SetNodeValueAsync.id] = i.dispidSetDataNodeValueMethod;
                f[h.SetNodeXmlAsync.id] = i.dispidSetDataNodeXmlMethod;
                f[h.AddDataPartNamespaceAsync.id] = i.dispidAddDataNamespaceMethod;
                f[h.GetDataPartNamespaceAsync.id] = i.dispidGetDataUriByPrefixMethod;
                f[h.GetDataPartPrefixAsync.id] = i.dispidGetDataPrefixByUriMethod;
                f[h.GetSelectedTask.id] = i.dispidGetSelectedTaskMethod;
                f[h.GetTask.id] = i.dispidGetTaskMethod;
                f[h.GetWSSUrl.id] = i.dispidGetWSSUrlMethod;
                f[h.GetTaskField.id] = i.dispidGetTaskFieldMethod;
                f[h.GetSelectedResource.id] = i.dispidGetSelectedResourceMethod;
                f[h.GetResourceField.id] = i.dispidGetResourceFieldMethod;
                f[h.GetProjectField.id] = i.dispidGetProjectFieldMethod;
                f[h.GetSelectedView.id] = i.dispidGetSelectedViewMethod;
                h = Microsoft.Office.WebExtension.EventType;
                i = a.DDA.EventDispId;
                f[h.SettingsChanged] = i.dispidSettingsChangedEvent;
                f[h.DocumentSelectionChanged] = i.dispidDocumentSelectionChangedEvent;
                f[h.BindingSelectionChanged] = i.dispidBindingSelectionChangedEvent;
                f[h.BindingDataChanged] = i.dispidBindingDataChangedEvent;
                f[h.TaskSelectionChanged] = i.dispidTaskSelectionChangedEvent;
                f[h.ResourceSelectionChanged] = i.dispidResourceSelectionChangedEvent;
                f[h.ViewSelectionChanged] = i.dispidViewSelectionChangedEvent;
                f[h.DataNodeInserted] = i.dispidDataNodeAddedEvent;
                f[h.DataNodeReplaced] = i.dispidDataNodeReplacedEvent;
                f[h.DataNodeDeleted] = i.dispidDataNodeDeletedEvent;

                function l(b, d, e, c) {
                    if (typeof b == g) {
                        if (!c) c = d.getCallArgs(e);
                        a.DDA.issueAsyncResult(c, b, a.DDA.ErrorCodeManager.getErrorArgs(b))
                    } else throw b
                }
                this[a.DDA.DispIdHost.Methods.InvokeMethod] = function(p, h, i, n) {
                    var b;
                    try {
                        var e = p.id,
                            c = a.DDA.AsyncMethodCalls[e];
                        b = c.verifyAndExtractCall(h, i, n);
                        var g = f[e],
                            o = k(e),
                            d;
                        if (j.toHost) d = j.toHost(g, b);
                        else d = b;
                        o[a.DDA.DispIdHost.Delegates.ExecuteAsync]({
                            dispId: g,
                            hostCallArgs: d,
                            onCalling: function() {
                                a.OUtil.writeProfilerMark(a.HostCallPerfMarker.IssueCall)
                            },
                            onReceiving: function() {
                                a.OUtil.writeProfilerMark(a.HostCallPerfMarker.ReceiveResponse)
                            },
                            onComplete: function(f, e) {
                                var d;
                                if (f == a.DDA.ErrorCodeManager.errorCodes.ooeSuccess)
                                    if (j.fromHost) d = j.fromHost(g, e);
                                    else d = e;
                                else d = e;
                                var h = c.processResponse(f, d, i, b);
                                a.DDA.issueAsyncResult(b, f, h)
                            }
                        })
                    } catch (m) {
                        l(m, c, h, b)
                    }
                };
                this[a.DDA.DispIdHost.Methods.AddEventHandler] = function(i, d, g) {
                    var c, b, n;

                    function h(e) {
                        if (e == a.DDA.ErrorCodeManager.errorCodes.ooeSuccess) {
                            var g = d.addEventHandler(b, n);
                            if (!g) e = a.DDA.ErrorCodeManager.errorCodes.ooeEventHandlerAdditionFailed
                        }
                        var f;
                        if (e != a.DDA.ErrorCodeManager.errorCodes.ooeSuccess) f = a.DDA.ErrorCodeManager.getErrorArgs(e);
                        a.DDA.issueAsyncResult(c, e, f)
                    }
                    try {
                        var m = a.DDA.AsyncMethodCalls[a.DDA.AsyncMethodNames.AddHandlerAsync.id];
                        c = m.verifyAndExtractCall(i, g, d);
                        b = c[Microsoft.Office.WebExtension.Parameters.EventType];
                        n = c[Microsoft.Office.WebExtension.Parameters.Handler];
                        if (d.getEventHandlerCount(b) == 0) {
                            var o = f[b],
                                q = k(b)[a.DDA.DispIdHost.Delegates.RegisterEventAsync];
                            q({
                                eventType: b,
                                dispId: o,
                                targetId: g.id || e,
                                onCalling: function() {
                                    a.OUtil.writeProfilerMark(a.HostCallPerfMarker.IssueCall)
                                },
                                onReceiving: function() {
                                    a.OUtil.writeProfilerMark(a.HostCallPerfMarker.ReceiveResponse)
                                },
                                onComplete: h,
                                onEvent: function(c) {
                                    var e = j.fromHost(o, c);
                                    d.fireEvent(a.DDA.OMFactory.manufactureEventArgs(b, g, e))
                                }
                            })
                        } else h(a.DDA.ErrorCodeManager.errorCodes.ooeSuccess)
                    } catch (p) {
                        l(p, m, i, c)
                    }
                };
                this[a.DDA.DispIdHost.Methods.RemoveEventHandler] = function(o, h, q) {
                    var i, g, j;

                    function n(b) {
                        var c;
                        if (b != a.DDA.ErrorCodeManager.errorCodes.ooeSuccess) c = a.DDA.ErrorCodeManager.getErrorArgs(a.DDA.ErrorCodeManager.errorCodes.ooeEventHandlerNotExist);
                        a.DDA.issueAsyncResult(i, b, c)
                    }
                    try {
                        var p = a.DDA.AsyncMethodCalls[a.DDA.AsyncMethodNames.RemoveHandlerAsync.id];
                        i = p.verifyAndExtractCall(o, q, h);
                        g = i[Microsoft.Office.WebExtension.Parameters.EventType];
                        j = i[Microsoft.Office.WebExtension.Parameters.Handler];
                        var m;
                        if (j == d) {
                            h.clearEventHandlers(g);
                            m = b
                        } else if (!h.hasEventHandler(g, j)) m = c;
                        else m = h.removeEventHandler(g, j);
                        if (h.getEventHandlerCount(g) == 0) {
                            var t = f[g],
                                s = k(g)[a.DDA.DispIdHost.Delegates.UnregisterEventAsync];
                            s({
                                eventType: g,
                                dispId: t,
                                targetId: q.id || e,
                                onCalling: function() {
                                    a.OUtil.writeProfilerMark(a.HostCallPerfMarker.IssueCall)
                                },
                                onReceiving: function() {
                                    a.OUtil.writeProfilerMark(a.HostCallPerfMarker.ReceiveResponse)
                                },
                                onComplete: n
                            })
                        } else n(m ? a.DDA.ErrorCodeManager.errorCodes.ooeSuccess : Strings.OfficeOM.L_EventRegistrationError)
                    } catch (r) {
                        l(r, p, o, i)
                    }
                }
            };
            a.DDA.DispIdHost.addAsyncMethods = function(b, c, f) {
                for (var g in c) {
                    var d = c[g],
                        e = d.displayName;
                    !b[e] && a.OUtil.defineEnumerableProperty(b, e, {
                        value: function(c) {
                            return function() {
                                var d = a._OfficeAppFactory.getHostFacade()[a.DDA.DispIdHost.Methods.InvokeMethod];
                                d(c, arguments, b, f)
                            }
                        }(d)
                    })
                }
            };
            a.DDA.DispIdHost.addEventSupport = function(b, c) {
                var e = a.DDA.AsyncMethodNames.AddHandlerAsync.displayName,
                    d = a.DDA.AsyncMethodNames.RemoveHandlerAsync.displayName;
                !b[e] && a.OUtil.defineEnumerableProperty(b, e, {
                    value: function() {
                        var d = a._OfficeAppFactory.getHostFacade()[a.DDA.DispIdHost.Methods.AddEventHandler];
                        d(arguments, c, b)
                    }
                });
                !b[d] && a.OUtil.defineEnumerableProperty(b, d, {
                    value: function() {
                        var d = a._OfficeAppFactory.getHostFacade()[a.DDA.DispIdHost.Methods.RemoveEventHandler];
                        d(arguments, c, b)
                    }
                })
            };
            a.DDA.Context = function(d, e, f, c) {
                var b = this;
                a.OUtil.defineEnumerableProperties(b, {
                    contentLanguage: {
                        value: d.get_dataLocale()
                    },
                    displayLanguage: {
                        value: d.get_appUILocale()
                    }
                });
                e && a.OUtil.defineEnumerableProperty(b, n, {
                    value: e
                });
                f && a.OUtil.defineEnumerableProperty(b, "license", {
                    value: f
                });
                if (c) {
                    var g = c.displayName || "appOM";
                    delete c.displayName;
                    a.OUtil.defineEnumerableProperty(b, g, {
                        value: c
                    })
                }
            };
            a.DDA.OutlookContext = function(c, b, e, f) {
                a.DDA.OutlookContext.uber.constructor.call(this, c, d, e, f);
                b && a.OUtil.defineEnumerableProperty(this, "roamingSettings", {
                    value: b
                })
            };
            a.OUtil.extend(a.DDA.OutlookContext, a.DDA.Context);
            a.OUtil.defineEnumerableProperty(Microsoft.Office.WebExtension, "context", {
                "get": function() {
                    var b;
                    if (a && a._OfficeAppFactory) b = a._OfficeAppFactory.getContext();
                    return b
                }
            });
            Microsoft.Office.WebExtension.useShortNamespace = function(b) {
                if (b) a.NamespaceManager.enableShortcut();
                else a.NamespaceManager.disableShortcut()
            };
            Microsoft.Office.WebExtension.select = function(b, c) {
                var d;
                if (b && typeof b == k) {
                    var e = b.indexOf("#");
                    if (e != -1) {
                        var j = b.substring(0, e),
                            h = b.substring(e + 1);
                        switch (j) {
                            case "binding":
                            case o:
                                if (h) d = new a.DDA.BindingPromise(h)
                        }
                    }
                }
                if (!d) {
                    if (c) {
                        var f = typeof c;
                        if (f == i) {
                            var g = {};
                            g[Microsoft.Office.WebExtension.Parameters.Callback] = c;
                            a.DDA.issueAsyncResult(g, a.DDA.ErrorCodeManager.errorCodes.ooeInvalidApiCallInContext, a.DDA.ErrorCodeManager.getErrorArgs(a.DDA.ErrorCodeManager.errorCodes.ooeInvalidApiCallInContext))
                        } else throw a.OUtil.formatString(Strings.OfficeOM.L_CallbackNotAFunction, f)
                    }
                } else {
                    d.onFail = c;
                    return d
                }
            };
            a.DDA.BindingPromise = function(c, b) {
                this._id = c;
                a.OUtil.defineEnumerableProperty(this, "onFail", {
                    "get": function() {
                        return b
                    },
                    "set": function(d) {
                        var c = typeof d;
                        if (c != f && c != i) throw a.OUtil.formatString(Strings.OfficeOM.L_CallbackNotAFunction, c);
                        b = d
                    }
                })
            };
            a.DDA.BindingPromise.prototype = {
                _fetch: function(c) {
                    var b = this;
                    if (b.binding) c && c(b.binding);
                    else if (!b._binding) {
                        var d = b;
                        Microsoft.Office.WebExtension.context.document.bindings.getByIdAsync(b._id, function(b) {
                            if (b.status == Microsoft.Office.WebExtension.AsyncResultStatus.Succeeded) {
                                a.OUtil.defineEnumerableProperty(d, "binding", {
                                    value: b.value
                                });
                                c && c(d.binding)
                            } else d.onFail && d.onFail(b)
                        })
                    }
                    return b
                },
                getDataAsync: function() {
                    var a = arguments;
                    this._fetch(function(b) {
                        b.getDataAsync.apply(b, a)
                    });
                    return this
                },
                setDataAsync: function() {
                    var a = arguments;
                    this._fetch(function(b) {
                        b.setDataAsync.apply(b, a)
                    });
                    return this
                },
                addHandlerAsync: function() {
                    var a = arguments;
                    this._fetch(function(b) {
                        b.addHandlerAsync.apply(b, a)
                    });
                    return this
                },
                removeHandlerAsync: function() {
                    var a = arguments;
                    this._fetch(function(b) {
                        b.removeHandlerAsync.apply(b, a)
                    });
                    return this
                }
            };
            a.DDA.License = function(b) {
                a.OUtil.defineEnumerableProperty(this, "value", {
                    value: b
                })
            };
            a.DDA.Settings = function(e) {
                e = e || {};
                a.OUtil.defineEnumerableProperties(this, {
                    "get": {
                        value: function(g) {
                            var b = Function._validateParams(arguments, [{
                                name: l,
                                type: String,
                                mayBeNull: c
                            }]);
                            if (b) throw b;
                            var a = e[g];
                            return typeof a === f ? d : a
                        }
                    },
                    "set": {
                        value: function(f, d) {
                            var a = Function._validateParams(arguments, [{
                                name: l,
                                type: String,
                                mayBeNull: c
                            }, {
                                name: "value",
                                mayBeNull: b
                            }]);
                            if (a) throw a;
                            e[f] = d
                        }
                    },
                    remove: {
                        value: function(b) {
                            var a = Function._validateParams(arguments, [{
                                name: l,
                                type: String,
                                mayBeNull: c
                            }]);
                            if (a) throw a;
                            delete e[b]
                        }
                    }
                });
                a.DDA.DispIdHost.addAsyncMethods(this, [a.DDA.AsyncMethodNames.SaveAsync], e)
            };
            a.DDA.RefreshableSettings = function(b) {
                a.DDA.RefreshableSettings.uber.constructor.call(this, b);
                a.DDA.DispIdHost.addAsyncMethods(this, [a.DDA.AsyncMethodNames.RefreshAsync], b);
                a.DDA.DispIdHost.addEventSupport(this, new a.EventDispatch([Microsoft.Office.WebExtension.EventType.SettingsChanged]))
            };
            a.OUtil.extend(a.DDA.RefreshableSettings, a.DDA.Settings);
            a.DDA.OutlookAppOm = function() {};
            a.DDA.Document = function(c, d) {
                var b;
                switch (c.get_clientMode()) {
                    case a.ClientMode.ReadOnly:
                        b = Microsoft.Office.WebExtension.DocumentMode.ReadOnly;
                        break;
                    case a.ClientMode.ReadWrite:
                        b = Microsoft.Office.WebExtension.DocumentMode.ReadWrite
                }
                d && a.OUtil.defineEnumerableProperty(this, "settings", {
                    value: d
                });
                a.OUtil.defineMutableProperties(this, {
                    mode: {
                        value: b
                    },
                    url: {
                        value: c.get_docUrl()
                    }
                })
            };
            a.DDA.JsomDocument = function(d, e, f) {
                var b = this;
                a.DDA.JsomDocument.uber.constructor.call(b, d, f);
                a.OUtil.defineEnumerableProperty(b, o, {
                    "get": function() {
                        return e
                    }
                });
                var c = a.DDA.AsyncMethodNames;
                a.DDA.DispIdHost.addAsyncMethods(b, [c.GetSelectedDataAsync, c.SetSelectedDataAsync]);
                a.DDA.DispIdHost.addEventSupport(b, new a.EventDispatch([Microsoft.Office.WebExtension.EventType.DocumentSelectionChanged]))
            };
            a.OUtil.extend(a.DDA.JsomDocument, a.DDA.Document);
            a.DDA.ExcelDocument = function() {
                throw a.OUtil.formatString(Strings.OfficeOM.L_NotImplemented, "ExcelDocument")
            };
            a.DDA.WordDocument = function() {
                throw a.OUtil.formatString(Strings.OfficeOM.L_NotImplemented, "WordDocument")
            };
            a.DDA.PowerPointDocument = function() {
                throw a.OUtil.formatString(Strings.OfficeOM.L_NotImplemented, "PowerPointDocument")
            };
            a.DDA.BindingFacade = function(c) {
                this._eventDispatches = [];
                a.OUtil.defineEnumerableProperty(this, n, {
                    value: c
                });
                var b = a.DDA.AsyncMethodNames;
                a.DDA.DispIdHost.addAsyncMethods(this, [b.AddFromSelectionAsync, b.AddFromNamedItemAsync, b.GetAllAsync, b.GetByIdAsync, b.ReleaseByIdAsync])
            };
            a.DDA.UnknownBinding = function(c, b) {
                a.OUtil.defineEnumerableProperties(this, {
                    document: {
                        value: b
                    },
                    id: {
                        value: c
                    }
                })
            };
            a.DDA.Binding = function(b, d) {
                a.OUtil.defineEnumerableProperties(this, {
                    document: {
                        value: d
                    },
                    id: {
                        value: b
                    }
                });
                var e = a.DDA.AsyncMethodNames;
                a.DDA.DispIdHost.addAsyncMethods(this, [e.GetDataAsync, e.SetDataAsync]);
                var f = Microsoft.Office.WebExtension.EventType,
                    c = d.bindings._eventDispatches;
                if (!c[b]) c[b] = new a.EventDispatch([f.BindingSelectionChanged, f.BindingDataChanged]);
                var g = c[b];
                a.DDA.DispIdHost.addEventSupport(this, g)
            };
            a.DDA.TextBinding = function(c, b) {
                a.DDA.TextBinding.uber.constructor.call(this, c, b);
                a.OUtil.defineEnumerableProperty(this, "type", {
                    value: Microsoft.Office.WebExtension.BindingType.Text
                })
            };
            a.OUtil.extend(a.DDA.TextBinding, a.DDA.Binding);
            a.DDA.MatrixBinding = function(e, d, c, b) {
                a.DDA.MatrixBinding.uber.constructor.call(this, e, d);
                a.OUtil.defineEnumerableProperties(this, {
                    type: {
                        value: Microsoft.Office.WebExtension.BindingType.Matrix
                    },
                    rowCount: {
                        value: c ? c : 0
                    },
                    columnCount: {
                        value: b ? b : 0
                    }
                })
            };
            a.OUtil.extend(a.DDA.MatrixBinding, a.DDA.Binding);
            a.DDA.TableBinding = function(h, g, f, e, d) {
                a.DDA.TableBinding.uber.constructor.call(this, h, g);
                a.OUtil.defineEnumerableProperties(this, {
                    type: {
                        value: Microsoft.Office.WebExtension.BindingType.Table
                    },
                    rowCount: {
                        value: f ? f : 0
                    },
                    columnCount: {
                        value: e ? e : 0
                    },
                    hasHeaders: {
                        value: d ? d : c
                    }
                });
                var b = a.DDA.AsyncMethodNames;
                a.DDA.DispIdHost.addAsyncMethods(this, [b.AddRowsAsync, b.AddColumnsAsync, b.DeleteAllDataValuesAsync])
            };
            a.OUtil.extend(a.DDA.TableBinding, a.DDA.Binding);
            Microsoft.Office.WebExtension.TableData = function(c, b) {
                function e(b) {
                    if (b == d || b == undefined) return d;
                    try {
                        for (var c = a.DDA.DataCoercion.findArrayDimensionality(b, 2); c < 2; c++) b = [b];
                        return b
                    } catch (e) {}
                }
                a.OUtil.defineEnumerableProperties(this, {
                    headers: {
                        "get": function() {
                            return b
                        },
                        "set": function(a) {
                            b = e(a)
                        }
                    },
                    rows: {
                        "get": function() {
                            return c
                        },
                        "set": function(b) {
                            c = b == d || a.OUtil.isArray(b) && b.length == 0 ? [] : e(b)
                        }
                    }
                });
                this.headers = b;
                this.rows = c
            };
            a.DDA.Error = function(d, b, c) {
                a.OUtil.defineEnumerableProperties(this, {
                    name: {
                        value: d
                    },
                    message: {
                        value: b
                    },
                    code: {
                        value: c
                    }
                })
            };
            a.DDA.AsyncResult = function(c, b) {
                a.OUtil.defineEnumerableProperties(this, {
                    value: {
                        value: c[a.DDA.AsyncResultEnum.Properties.Value]
                    },
                    status: {
                        value: b ? Microsoft.Office.WebExtension.AsyncResultStatus.Failed : Microsoft.Office.WebExtension.AsyncResultStatus.Succeeded
                    }
                });
                c[a.DDA.AsyncResultEnum.Properties.Context] && a.OUtil.defineEnumerableProperty(this, r, {
                    value: c[a.DDA.AsyncResultEnum.Properties.Context]
                });
                b && a.OUtil.defineEnumerableProperty(this, "error", {
                    value: new a.DDA.Error(b[a.DDA.AsyncResultEnum.ErrorProperties.Name], b[a.DDA.AsyncResultEnum.ErrorProperties.Message], b[a.DDA.AsyncResultEnum.ErrorProperties.Code])
                })
            };
            a.DDA.DocumentSelectionChangedEventArgs = function(b) {
                a.OUtil.defineEnumerableProperties(this, {
                    type: {
                        value: Microsoft.Office.WebExtension.EventType.DocumentSelectionChanged
                    },
                    document: {
                        value: b
                    }
                })
            };
            a.DDA.BindingSelectionChangedEventArgs = function(d, b) {
                a.OUtil.defineEnumerableProperties(this, {
                    type: {
                        value: Microsoft.Office.WebExtension.EventType.BindingSelectionChanged
                    },
                    binding: {
                        value: d
                    }
                });
                for (var c in b) a.OUtil.defineEnumerableProperty(this, c, {
                    value: b[c]
                })
            };
            a.DDA.BindingDataChangedEventArgs = function(b) {
                a.OUtil.defineEnumerableProperties(this, {
                    type: {
                        value: Microsoft.Office.WebExtension.EventType.BindingDataChanged
                    },
                    binding: {
                        value: b
                    }
                })
            };
            a.DDA.SettingsChangedEventArgs = function(b) {
                a.OUtil.defineEnumerableProperties(this, {
                    type: {
                        value: Microsoft.Office.WebExtension.EventType.SettingsChanged
                    },
                    settings: {
                        value: b
                    }
                })
            };
            a.SupportedLocales = {
                "ar-sa": b,
                "bg-bg": b,
                "ca-es": b,
                "cs-cz": b,
                "da-dk": b,
                "de-de": b,
                "el-gr": b,
                "en-us": b,
                "es-es": b,
                "et-ee": b,
                "eu-es": b,
                "fi-fi": b,
                "fr-fr": b,
                "gl-es": b,
                "he-il": b,
                "hi-in": b,
                "hr-hr": b,
                "hu-hu": b,
                "id-id": b,
                "it-it": b,
                "ja-jp": b,
                "kk-kz": b,
                "ko-kr": b,
                "lt-lt": b,
                "lv-lv": b,
                "ms-my": b,
                "nb-no": b,
                "nl-nl": b,
                "pl-pl": b,
                "pt-br": b,
                "pt-pt": b,
                "ro-ro": b,
                "ru-ru": b,
                "sk-sk": b,
                "sl-si": b,
                "sr-cyrl-cs": b,
                "sr-cyrl-rs": b,
                "sr-latn-cs": b,
                "sr-latn-rs": b,
                "sv-se": b,
                "th-th": b,
                "tr-tr": b,
                "uk-ua": b,
                "vi-vn": b,
                "zh-cn": b,
                "zh-tw": b
            };
            a.AssociatedLocales = {
                ar: "ar-sa",
                bg: "bg-bg",
                ca: "ca-es",
                cs: "cs-cz",
                da: "da-dk",
                de: "de-de",
                el: "el-gr",
                en: "en-us",
                es: "es-es",
                et: "et-ee",
                eu: "eu-es",
                fi: "fi-fi",
                fr: "fr-fr",
                gl: "gl-es",
                he: "he-il",
                hi: "hi-in",
                hr: "hr-hr",
                hu: "hu-hu",
                id: "id-id",
                it: "it-it",
                ja: "ja-jp",
                kk: "kk-kz",
                ko: "ko-kr",
                lt: "lt-lt",
                lv: "lv-lv",
                ms: "ms-my",
                nb: "nb-no",
                nl: "nl-nl",
                pl: "pl-pl",
                pt: "pt-br",
                ro: "ro-ro",
                ru: "ru-ru",
                sk: "sk-sk",
                sl: "sl-si",
                sr: "sr-cyrl-cs",
                sv: "sv-se",
                th: "th-th",
                tr: "tr-tr",
                uk: "uk-ua",
                vi: "vi-vn",
                zh: "zh-cn"
            };
            a.ConstantNames = {
                IOS: "ios",
                OfficeJS: "office.js",
                OfficeDebugJS: "office.debug.js",
                DefaultLocale: "en-us",
                LocaleStringLoadingTimeout: 2e3,
                OfficeStringJS: "office_strings.js",
                SupportedLocales: a.SupportedLocales,
                AssociatedLocales: a.AssociatedLocales
            };
            a._OfficeAppFactory = function() {
                var q = {
                        "1-15": "excel-15.js",
                        "2-15": "word-15.js",
                        "4-15": "powerpoint-15.js",
                        "8-15": "outlook-15.js",
                        "16-15": "excelwebapp-15.js",
                        "64-15": "outlookwebapp-15.js",
                        "128-15": "project-15.js",
                        "1024-15": "excelios-15.js",
                        "4096-15": "wordios-15.js",
                        "8192-15": "powerpointios-15.js"
                    },
                    l, i, n, g = {
                        id: d,
                        webAppUrl: d,
                        conversationID: d,
                        clientEndPoint: d,
                        window: h.parent,
                        focused: c
                    },
                    j, k = b,
                    m = c,
                    p = function() {
                        var e = a.OUtil.parseXdmInfo();
                        if (e != d) {
                            var b = e.split("|");
                            if (b != undefined && b.length == 3) {
                                g.conversationID = b[0];
                                g.id = b[1];
                                g.webAppUrl = b[2];
                                k = c
                            }
                        }
                    },
                    s = function() {
                        var c, g = "_host_Info=",
                            d = h.location.search;
                        if (d) {
                            var b = d.split(g);
                            if (b.length > 1) {
                                var e = b[1],
                                    f = new RegExp("/[&#]/g"),
                                    a = e.split(f);
                                if (a.length > 0) c = a[0]
                            }
                        }
                        return c
                    },
                    r = function() {
                        var b = "hostInfoValue",
                            g = {
                                hostType: e,
                                hostPlatform: e,
                                hostSpecificFileVersion: e
                            },
                            c = s(),
                            l = function() {
                                var a = d;
                                try {
                                    if (h.sessionStorage) a = h.sessionStorage
                                } catch (b) {}
                                return a
                            },
                            i = l();
                        if (!c && i && i.getItem(b)) c = i.getItem(b);
                        if (c) {
                            var j = c.split("$");
                            if (typeof j[2] == f) j = c.split("|");
                            g.hostType = j[0];
                            g.hostPlatform = j[1];
                            g.hostSpecificFileVersion = j[2];
                            var k = parseFloat(g.hostSpecificFileVersion);
                            if (k > a.ConstantNames.HostSpecificFallbackVersion) g.hostSpecificFileVersion = a.ConstantNames.HostSpecificFallbackVersion.toString();
                            if (i) try {
                                i.setItem(b, c)
                            } catch (m) {}
                        }
                        return g
                    },
                    o = function(G, o) {
                        try {
                            var l = r();
                            if (l && l.hostPlatform.toLowerCase() == a.ConstantNames.IOS) {
                                m = b;
                                var v = function() {
                                        a._OfficeAppFactory.getWebkitAppContext(G, o)
                                    },
                                    z = j + l.hostType + l.hostPlatform + "-15.js";
                                a.OUtil.loadScript(z, v);
                                return
                            }
                        } catch (t) {}
                        if (k) {
                            var n, d = h.external.GetContext(),
                                p = d.GetAppType(),
                                q = c;
                            for (var A in a.AppName)
                                if (a.AppName[A] == p) {
                                    q = b;
                                    break
                                }
                            if (!q) throw "Unsupported client type " + p;
                            var H = d.GetSolutionRef(),
                                D = d.GetAppVersionMajor(),
                                C = d.GetAppUILocale(),
                                y = d.GetAppDataLocale(),
                                E = d.GetDocUrl(),
                                x = d.GetAppCapabilities(),
                                F = d.GetActivationMode(),
                                w = d.GetControlIntegrationLevel(),
                                B = [],
                                i;
                            try {
                                i = d.GetSolutionToken()
                            } catch (t) {}
                            var s;
                            if (typeof d.GetCorrelationId !== f) s = d.GetCorrelationId();
                            i = i ? i.toString() : e;
                            n = new a.OfficeAppContext(H, p, D, C, y, E, x, B, F, w, i, s);
                            o(n);
                            a.AppTelemetry && a.AppTelemetry.initialize(n)
                        } else {
                            var u = function(f, b) {
                                var c;
                                if (b._appName === a.AppName.ExcelWebApp) {
                                    var d = b._settings;
                                    c = {};
                                    for (var h in d) {
                                        var g = d[h];
                                        c[g[0]] = g[1]
                                    }
                                } else c = b._settings;
                                if (f === 0 && b._id != undefined && b._appName != undefined && b._appVersion != undefined && b._appUILocale != undefined && b._dataLocale != undefined && b._docUrl != undefined && b._clientMode != undefined && b._settings != undefined && b._reason != undefined) {
                                    var e = new a.OfficeAppContext(b._id, b._appName, b._appVersion, b._appUILocale, b._dataLocale, b._docUrl, b._clientMode, c, b._reason, b._osfControlType, b._eToken, b._correlationId);
                                    o(e);
                                    a.AppTelemetry && a.AppTelemetry.initialize(e)
                                } else throw "Function ContextActivationManager_getAppContextAsync call failed. ErrorCode is " + f
                            };
                            g.clientEndPoint.invoke("ContextActivationManager_getAppContextAsync", u, g.id)
                        }
                    },
                    t = function() {
                        var e = "ContextActivationManager_notifyHost";
                        p();
                        if (!k) {
                            g.clientEndPoint = Microsoft.Office.Common.XdmCommunicationManager.connect(g.conversationID, g.window, g.webAppUrl);
                            g.serviceEndPoint = Microsoft.Office.Common.XdmCommunicationManager.createServiceEndPoint(g.id);
                            var v = g.conversationID + a.SharedConstants.NotificationConversationIdSuffix;
                            g.serviceEndPoint.registerConversation(v);
                            var z = function(d) {
                                switch (d) {
                                    case a.AgaveHostAction.Select:
                                        g.focused = b;
                                        h.focus();
                                        break;
                                    case a.AgaveHostAction.UnSelect:
                                        g.focused = c;
                                        break;
                                    default:
                                        Sys.Debug.trace("actionId " + d + " notifyAgave is wrong.")
                                }
                            };
                            g.serviceEndPoint.registerMethod("Office_notifyAgave", z, Microsoft.Office.Common.InvokeType.async, c);
                            h.onfocus = function() {
                                if (!g.focused) {
                                    g.focused = b;
                                    g.clientEndPoint.invoke(e, d, [g.id, a.AgaveHostAction.Select])
                                }
                            };
                            h.onblur = function() {
                                if (g.focused) {
                                    g.focused = c;
                                    g.clientEndPoint.invoke(e, d, [g.id, a.AgaveHostAction.UnSelect])
                                }
                            }
                        }
                        for (var x = function(b, c) {
                                var d, a;
                                b = b.toLowerCase();
                                c = c.toLowerCase();
                                a = b.indexOf(c);
                                if (a >= 0 && a === b.length - c.length && (a === 0 || b.charAt(a - 1) === "/" || b.charAt(a - 1) === "\\")) d = b.substring(0, a);
                                return d
                            }, t = document.getElementsByTagName("script") || [], y = t.length, u = [a.ConstantNames.OfficeJS, a.ConstantNames.OfficeDebugJS], w = u.length, s, r = 0; !j && r < y; r++)
                            if (t[r].src)
                                for (s = 0; !j && s < w; s++) j = x(t[r].src, u[s]);
                        if (!j) throw a.OUtil.formatString("Office Web Extension script library file name should be {0} or {1}.", a.ConstantNames.OfficeJS, a.ConstantNames.OfficeDebugJS);
                        o(g.window, function(d) {
                            var e = "{0}{1}/{2}",
                                p, v, u = 100,
                                r;

                            function o() {
                                if (Microsoft.Office.WebExtension.initialize != undefined) {
                                    var f = new a.DDA.License(d.get_eToken());
                                    if (d.get_appName() == a.AppName.OutlookWebApp || d.get_appName() == a.AppName.Outlook) {
                                        l = new a.DDA.OutlookContext(d, i, f, v);
                                        Microsoft.Office.WebExtension.initialize()
                                    } else if (d.get_osfControlType() === a.OsfControlType.DocumentLevel || d.get_osfControlType() === a.OsfControlType.ContainerLevel) {
                                        l = new a.DDA.Context(d, p, f);
                                        var b, c, e = d.get_reason();
                                        if (k) {
                                            b = a.DDA.DispIdHost.getRichClientDelegateMethods;
                                            c = a.DDA.SafeArray.Delegate.ParameterMap;
                                            e = a.DDA.RichInitializationReason[e]
                                        } else {
                                            b = a.DDA.DispIdHost.getXLSDelegateMethods;
                                            c = a.DDA.XLS.Delegate.ParameterMap
                                        }
                                        n = new a.DDA.DispIdHost.Facade(b, c);
                                        Microsoft.Office.WebExtension.initialize(e)
                                    } else throw a.OUtil.formatString(Strings.OfficeOM.L_OsfControlTypeNotSupported);
                                    r != undefined && h.clearTimeout(r)
                                } else if (u == 0) {
                                    clearTimeout(r);
                                    throw a.OUtil.formatString(Strings.OfficeOM.L_InitializeNotReady)
                                } else {
                                    u--;
                                    r = h.setTimeout(o, 100)
                                }
                            }
                            var w = function() {
                                    var r = j + q[d.get_appName() + "-15"],
                                        e = Strings.OfficeOM,
                                        f = a.DDA.ErrorCodeManager,
                                        l = f.errorCodes;
                                    f.addErrorMessage(l.ooeCoercionTypeNotSupported, {
                                        name: e.L_InvalidCoercion,
                                        message: e.L_CoercionTypeNotSupported
                                    });
                                    f.addErrorMessage(l.ooeGetSelectionNotMatchDataType, {
                                        name: e.L_DataReadError,
                                        message: e.L_GetSelectionNotSupported
                                    });
                                    f.addErrorMessage(l.ooeCoercionTypeNotMatchBinding, {
                                        name: e.L_InvalidCoercion,
                                        message: e.L_CoercionTypeNotMatchBinding
                                    });
                                    f.addErrorMessage(l.ooeInvalidGetRowColumnCounts, {
                                        name: e.L_DataReadError,
                                        message: e.L_InvalidGetRowColumnCounts
                                    });
                                    f.addErrorMessage(l.ooeSelectionNotSupportCoercionType, {
                                        name: e.L_DataReadError,
                                        message: e.L_SelectionNotSupportCoercionType
                                    });
                                    f.addErrorMessage(l.ooeInvalidGetStartRowColumn, {
                                        name: e.L_DataReadError,
                                        message: e.L_InvalidGetStartRowColumn
                                    });
                                    f.addErrorMessage(l.ooeNonUniformPartialGetNotSupported, {
                                        name: e.L_DataReadError,
                                        message: e.L_NonUniformPartialGetNotSupported
                                    });
                                    f.addErrorMessage(l.ooeGetDataIsTooLarge, {
                                        name: e.L_DataReadError,
                                        message: e.L_GetDataIsTooLarge
                                    });
                                    f.addErrorMessage(l.ooeFileTypeNotSupported, {
                                        name: e.L_DataReadError,
                                        message: e.L_FileTypeNotSupported
                                    });
                                    f.addErrorMessage(l.ooeUnsupportedDataObject, {
                                        name: e.L_DataWriteError,
                                        message: e.L_UnsupportedDataObject
                                    });
                                    f.addErrorMessage(l.ooeCannotWriteToSelection, {
                                        name: e.L_DataWriteError,
                                        message: e.L_CannotWriteToSelection
                                    });
                                    f.addErrorMessage(l.ooeDataNotMatchSelection, {
                                        name: e.L_DataWriteError,
                                        message: e.L_DataNotMatchSelection
                                    });
                                    f.addErrorMessage(l.ooeOverwriteWorksheetData, {
                                        name: e.L_DataWriteError,
                                        message: e.L_OverwriteWorksheetData
                                    });
                                    f.addErrorMessage(l.ooeDataNotMatchBindingSize, {
                                        name: e.L_DataWriteError,
                                        message: e.L_DataNotMatchBindingSize
                                    });
                                    f.addErrorMessage(l.ooeInvalidSetStartRowColumn, {
                                        name: e.L_DataWriteError,
                                        message: e.L_InvalidSetStartRowColumn
                                    });
                                    f.addErrorMessage(l.ooeInvalidDataFormat, {
                                        name: e.L_InvalidFormat,
                                        message: e.L_InvalidDataFormat
                                    });
                                    f.addErrorMessage(l.ooeDataNotMatchCoercionType, {
                                        name: e.L_InvalidDataObject,
                                        message: e.L_DataNotMatchCoercionType
                                    });
                                    f.addErrorMessage(l.ooeDataNotMatchBindingType, {
                                        name: e.L_InvalidDataObject,
                                        message: e.L_DataNotMatchBindingType
                                    });
                                    f.addErrorMessage(l.ooeSetDataIsTooLarge, {
                                        name: e.L_DataWriteError,
                                        message: e.L_SetDataIsTooLarge
                                    });
                                    f.addErrorMessage(l.ooeNonUniformPartialSetNotSupported, {
                                        name: e.L_DataWriteError,
                                        message: e.L_NonUniformPartialSetNotSupported
                                    });
                                    f.addErrorMessage(l.ooeSelectionCannotBound, {
                                        name: e.L_BindingCreationError,
                                        message: e.L_SelectionCannotBound
                                    });
                                    f.addErrorMessage(l.ooeBindingNotExist, {
                                        name: e.L_InvalidBindingError,
                                        message: e.L_BindingNotExist
                                    });
                                    f.addErrorMessage(l.ooeBindingToMultipleSelection, {
                                        name: e.L_BindingCreationError,
                                        message: e.L_BindingToMultipleSelection
                                    });
                                    f.addErrorMessage(l.ooeInvalidSelectionForBindingType, {
                                        name: e.L_BindingCreationError,
                                        message: e.L_InvalidSelectionForBindingType
                                    });
                                    f.addErrorMessage(l.ooeOperationNotSupportedOnThisBindingType, {
                                        name: e.L_InvalidBindingOperation,
                                        message: e.L_OperationNotSupportedOnThisBindingType
                                    });
                                    f.addErrorMessage(l.ooeNamedItemNotFound, {
                                        name: e.L_BindingCreationError,
                                        message: e.L_NamedItemNotFound
                                    });
                                    f.addErrorMessage(l.ooeMultipleNamedItemFound, {
                                        name: e.L_BindingCreationError,
                                        message: e.L_MultipleNamedItemFound
                                    });
                                    f.addErrorMessage(l.ooeInvalidNamedItemForBindingType, {
                                        name: e.L_BindingCreationError,
                                        message: e.L_InvalidNamedItemForBindingType
                                    });
                                    f.addErrorMessage(l.ooeUnknownBindingType, {
                                        name: e.L_InvalidBinding,
                                        message: e.L_UnknownBindingType
                                    });
                                    f.addErrorMessage(l.ooeSettingNameNotExist, {
                                        name: e.L_ReadSettingsError,
                                        message: e.L_SettingNameNotExist
                                    });
                                    f.addErrorMessage(l.ooeSettingsCannotSave, {
                                        name: e.L_SaveSettingsError,
                                        message: e.L_SettingsCannotSave
                                    });
                                    f.addErrorMessage(l.ooeSettingsAreStale, {
                                        name: e.L_SettingsStaleError,
                                        message: e.L_SettingsAreStale
                                    });
                                    f.addErrorMessage(l.ooeOperationNotSupported, {
                                        name: e.L_HostError,
                                        message: e.L_OperationNotSupported
                                    });
                                    f.addErrorMessage(l.ooeInternalError, {
                                        name: e.L_InternalError,
                                        message: e.L_InternalErrorDescription
                                    });
                                    f.addErrorMessage(l.ooeDocumentReadOnly, {
                                        name: e.L_PermissionDenied,
                                        message: e.L_DocumentReadOnly
                                    });
                                    f.addErrorMessage(l.ooeEventHandlerNotExist, {
                                        name: e.L_EventRegistrationError,
                                        message: e.L_EventHandlerNotExist
                                    });
                                    f.addErrorMessage(l.ooeInvalidApiCallInContext, {
                                        name: e.L_InvalidAPICall,
                                        message: e.L_InvalidApiCallInContext
                                    });
                                    f.addErrorMessage(l.ooeShuttingDown, {
                                        name: e.L_ShuttingDown,
                                        message: e.L_ShuttingDown
                                    });
                                    f.addErrorMessage(l.ooeUnsupportedEnumeration, {
                                        name: e.L_UnsupportedEnumeration,
                                        message: e.L_UnsupportedEnumerationMessage
                                    });
                                    f.addErrorMessage(l.ooeIndexOutOfRange, {
                                        name: e.L_IndexOutOfRange,
                                        message: e.L_IndexOutOfRange
                                    });
                                    f.addErrorMessage(l.ooeCustomXmlNodeNotFound, {
                                        name: e.L_InvalidNode,
                                        message: e.L_CustomXmlNodeNotFound
                                    });
                                    f.addErrorMessage(l.ooeCustomXmlError, {
                                        name: e.L_CustomXmlError,
                                        message: e.L_CustomXmlError
                                    });
                                    f.addErrorMessage(l.ooeNoCapability, {
                                        name: e.L_PermissionDenied,
                                        message: e.L_NoCapability
                                    });

                                    function n(f) {
                                        var b;
                                        if (k && m == c) b = a.DDA.RichClientSettingsManager.read();
                                        else b = d.get_settings();
                                        var e = a.DDA.SettingsManager.deserializeSettings(b);
                                        if (f) i = new a.DDA.RefreshableSettings(e);
                                        else i = new a.DDA.Settings(e)
                                    }
                                    if (d.get_appName() == a.AppName.Excel) {
                                        var w = function() {
                                            n(c);
                                            p = new a.DDA.ExcelDocument(d, i);
                                            o()
                                        };
                                        a.OUtil.loadScript(r, w)
                                    } else if (d.get_appName() == a.AppName.ExcelIOS) {
                                        n(c);
                                        p = new a.DDA.ExcelDocument(d, i);
                                        o()
                                    } else if (d.get_appName() == a.AppName.ExcelWebApp) {
                                        var s = function() {
                                            n(b);
                                            p = new a.DDA.ExcelWebAppDocument(d, i);
                                            o()
                                        };
                                        a.OUtil.loadScript(r, s)
                                    } else if (d.get_appName() == a.AppName.Word) {
                                        var y = function() {
                                            n(c);
                                            p = new a.DDA.WordDocument(d, i);
                                            o()
                                        };
                                        a.OUtil.loadScript(r, y)
                                    } else if (d.get_appName() == a.AppName.WordIOS) {
                                        n(c);
                                        p = new a.DDA.WordDocument(d, i);
                                        o()
                                    } else if (d.get_appName() == a.AppName.PowerPoint) {
                                        var t = function() {
                                            n(c);
                                            p = new a.DDA.PowerPointDocument(d, i);
                                            o()
                                        };
                                        a.OUtil.loadScript(r, t)
                                    } else if (d.get_appName() == a.AppName.PowerPointIOS) {
                                        n(c);
                                        p = new a.DDA.PowerPointDocument(d, i);
                                        o()
                                    } else if (d.get_appName() == a.AppName.OutlookWebApp || d.get_appName() == a.AppName.Outlook) {
                                        var u = function() {
                                            n(c);
                                            v = new a.DDA.OutlookAppOm(d, g.window, o)
                                        };
                                        a.OUtil.loadScript(r, u)
                                    } else if (d.get_appName() == a.AppName.Project) {
                                        var x = function() {
                                            p = new a.DDA.ProjectDocument(d);
                                            o()
                                        };
                                        a.OUtil.loadScript(r, x)
                                    } else throw a.OUtil.formatString(e.L_AppNotExistInitializeNotCalled, d.get_appName());
                                    h.confirm = function() {
                                        throw a.OUtil.formatString(Strings.OfficeOM.L_NotSupported, "window.confirm")
                                    };
                                    h.alert = function() {
                                        throw a.OUtil.formatString(Strings.OfficeOM.L_NotSupported, "window.alert")
                                    };
                                    h.prompt = function() {
                                        throw a.OUtil.formatString(Strings.OfficeOM.L_NotSupported, "window.prompt")
                                    }
                                },
                                x = function(b) {
                                    if (!b) return a.ConstantNames.DefaultLocale;
                                    var c;
                                    b = b.toLowerCase();
                                    if (b in a.ConstantNames.SupportedLocales) c = b;
                                    else {
                                        var d = b.split("-", 1);
                                        if (d && d.length > 0) c = a.ConstantNames.AssociatedLocales[d[0]]
                                    }
                                    if (!c) c = a.ConstantNames.DefaultLocale;
                                    return c
                                },
                                s = c,
                                t = function() {
                                    if (typeof Strings == f || typeof Strings.OfficeOM == f)
                                        if (!s) {
                                            s = b;
                                            var g = a.OUtil.formatString(e, j, a.ConstantNames.DefaultLocale, a.ConstantNames.OfficeStringJS);
                                            a.OUtil.loadScript(g, t)
                                        } else throw a.OUtil.formatString("Neither the locale, {0} , provided by the host app nor the fallback locale {1} are supported.", d.get_appUILocale().toLowerCase(), a.ConstantNames.DefaultLocale);
                                    else {
                                        s = c;
                                        w()
                                    }
                                },
                                y = a.OUtil.formatString(e, j, x(d.get_appUILocale()), a.ConstantNames.OfficeStringJS);
                            a.OUtil.loadScript(y, t, a.ConstantNames.LocaleStringLoadingTimeout)
                        })
                    };
                t();
                return {
                    getId: function() {
                        return g.id
                    },
                    getClientEndPoint: function() {
                        return g.clientEndPoint
                    },
                    getWebAppState: function() {
                        return g
                    },
                    getContext: function() {
                        return l
                    },
                    getHostFacade: function() {
                        return n
                    }
                }
            }()
        },
        w = function() {
            var x = "correlationId",
                w = "actionName",
                v = "targetEventName",
                i = "conversationId",
                t = "unregisterMethod",
                s = "registerMethod",
                l = "eventName",
                r = "methodName",
                q = "serviceEndPointId";
            a.OUtil.setNamespace(u, h);
            a.OUtil.setNamespace(p, Microsoft);
            a.OUtil.setNamespace("Common", Microsoft.Office);
            Microsoft.Office.Common.InvokeType = {
                async: 0,
                sync: 1,
                asyncRegisterEvent: 2,
                asyncUnregisterEvent: 3,
                syncRegisterEvent: 4,
                syncUnregisterEvent: 5
            };
            Microsoft.Office.Common.InvokeResultCode = {
                noError: 0,
                errorInRequest: -1,
                errorHandlingRequest: -2,
                errorInResponse: -3,
                errorHandlingResponse: -4,
                errorHandlingRequestAccessDenied: -5,
                errorHandlingMethodCallTimedout: -6
            };
            Microsoft.Office.Common.MessageType = {
                request: 0,
                response: 1
            };
            Microsoft.Office.Common.ActionType = {
                invoke: 0,
                registerEvent: 1,
                unregisterEvent: 2
            };
            Microsoft.Office.Common.ResponseType = {
                forCalling: 0,
                forEventing: 1
            };
            Microsoft.Office.Common.MethodObject = function(c, b, a) {
                this._method = c;
                this._invokeType = b;
                this._blockingOthers = a
            };
            Microsoft.Office.Common.MethodObject.prototype = {
                getMethod: function() {
                    return this._method
                },
                getInvokeType: function() {
                    return this._invokeType
                },
                getBlockingFlag: function() {
                    return this._blockingOthers
                }
            };
            Microsoft.Office.Common.EventMethodObject = function(b, a) {
                this._registerMethodObject = b;
                this._unregisterMethodObject = a
            };
            Microsoft.Office.Common.EventMethodObject.prototype = {
                getRegisterMethodObject: function() {
                    return this._registerMethodObject
                },
                getUnregisterMethodObject: function() {
                    return this._unregisterMethodObject
                }
            };
            Microsoft.Office.Common.ServiceEndPoint = function(e) {
                var a = this,
                    b = Function._validateParams(arguments, [{
                        name: q,
                        type: String,
                        mayBeNull: c
                    }]);
                if (b) throw b;
                a._methodObjectList = {};
                a._eventHandlerProxyList = {};
                a._Id = e;
                a._conversations = {};
                a._policyManager = d
            };
            Microsoft.Office.Common.ServiceEndPoint.prototype = {
                registerMethod: function(g, h, b, e) {
                    var a = "invokeType",
                        d = Function._validateParams(arguments, [{
                            name: r,
                            type: String,
                            mayBeNull: c
                        }, {
                            name: "method",
                            type: Function,
                            mayBeNull: c
                        }, {
                            name: a,
                            type: Number,
                            mayBeNull: c
                        }, {
                            name: "blockingOthers",
                            type: Boolean,
                            mayBeNull: c
                        }]);
                    if (d) throw d;
                    if (b !== Microsoft.Office.Common.InvokeType.async && b !== Microsoft.Office.Common.InvokeType.sync) throw Error.argument(a);
                    var f = new Microsoft.Office.Common.MethodObject(h, b, e);
                    this._methodObjectList[g] = f
                },
                unregisterMethod: function(b) {
                    var a = Function._validateParams(arguments, [{
                        name: r,
                        type: String,
                        mayBeNull: c
                    }]);
                    if (a) throw a;
                    delete this._methodObjectList[b]
                },
                registerEvent: function(f, d, b) {
                    var a = Function._validateParams(arguments, [{
                        name: l,
                        type: String,
                        mayBeNull: c
                    }, {
                        name: s,
                        type: Function,
                        mayBeNull: c
                    }, {
                        name: t,
                        type: Function,
                        mayBeNull: c
                    }]);
                    if (a) throw a;
                    var e = new Microsoft.Office.Common.EventMethodObject(new Microsoft.Office.Common.MethodObject(d, Microsoft.Office.Common.InvokeType.syncRegisterEvent, c), new Microsoft.Office.Common.MethodObject(b, Microsoft.Office.Common.InvokeType.syncUnregisterEvent, c));
                    this._methodObjectList[f] = e
                },
                registerEventEx: function(h, f, d, e, b) {
                    var a = Function._validateParams(arguments, [{
                        name: l,
                        type: String,
                        mayBeNull: c
                    }, {
                        name: s,
                        type: Function,
                        mayBeNull: c
                    }, {
                        name: "registerMethodInvokeType",
                        type: Number,
                        mayBeNull: c
                    }, {
                        name: t,
                        type: Function,
                        mayBeNull: c
                    }, {
                        name: "unregisterMethodInvokeType",
                        type: Number,
                        mayBeNull: c
                    }]);
                    if (a) throw a;
                    var g = new Microsoft.Office.Common.EventMethodObject(new Microsoft.Office.Common.MethodObject(f, d, c), new Microsoft.Office.Common.MethodObject(e, b, c));
                    this._methodObjectList[h] = g
                },
                unregisterEvent: function(b) {
                    var a = Function._validateParams(arguments, [{
                        name: l,
                        type: String,
                        mayBeNull: c
                    }]);
                    if (a) throw a;
                    this.unregisterMethod(b)
                },
                registerConversation: function(d) {
                    var a = Function._validateParams(arguments, [{
                        name: i,
                        type: String,
                        mayBeNull: c
                    }]);
                    if (a) throw a;
                    this._conversations[d] = b
                },
                unregisterConversation: function(b) {
                    var a = Function._validateParams(arguments, [{
                        name: i,
                        type: String,
                        mayBeNull: c
                    }]);
                    if (a) throw a;
                    delete this._conversations[b]
                },
                setPolicyManager: function(b) {
                    var a = "policyManager",
                        d = Function._validateParams(arguments, [{
                            name: a,
                            type: Object,
                            mayBeNull: c
                        }]);
                    if (d) throw d;
                    if (!b.checkPermission) throw Error.argument(a);
                    this._policyManager = b
                },
                getPolicyManager: function() {
                    return this._policyManager
                }
            };
            Microsoft.Office.Common.ClientEndPoint = function(f, d, g) {
                var a = "targetWindow",
                    b = this,
                    e = Function._validateParams(arguments, [{
                        name: i,
                        type: String,
                        mayBeNull: c
                    }, {
                        name: a,
                        mayBeNull: c
                    }, {
                        name: "targetUrl",
                        type: String,
                        mayBeNull: c
                    }]);
                if (e) throw e;
                if (!d.postMessage) throw Error.argument(a);
                b._conversationId = f;
                b._targetWindow = d;
                b._targetUrl = g;
                b._callingIndex = 0;
                b._callbackList = {};
                b._eventHandlerList = {}
            };
            Microsoft.Office.Common.ClientEndPoint.prototype = {
                invoke: function(n, h, e) {
                    var a = this,
                        l = Function._validateParams(arguments, [{
                            name: "targetMethodName",
                            type: String,
                            mayBeNull: c
                        }, {
                            name: m,
                            type: Function,
                            mayBeNull: b
                        }, {
                            name: "param",
                            mayBeNull: b
                        }]);
                    if (l) throw l;
                    var f = a._callingIndex++,
                        q = new Date,
                        i = {
                            callback: h,
                            createdOn: q.getTime()
                        };
                    if (e && typeof e === j && typeof e.__timeout__ === g) {
                        i.timeout = e.__timeout__;
                        delete e.__timeout__
                    }
                    a._callbackList[f] = i;
                    try {
                        var o = new Microsoft.Office.Common.Request(n, Microsoft.Office.Common.ActionType.invoke, a._conversationId, f, e),
                            p = Microsoft.Office.Common.MessagePackager.envelope(o);
                        a._targetWindow.postMessage(p, a._targetUrl);
                        Microsoft.Office.Common.XdmCommunicationManager._startMethodTimeoutTimer()
                    } catch (k) {
                        try {
                            h !== d && h(Microsoft.Office.Common.InvokeResultCode.errorInRequest, k)
                        } finally {
                            delete a._callbackList[f]
                        }
                    }
                },
                registerForEvent: function(g, j, f, l) {
                    var a = this,
                        i = Function._validateParams(arguments, [{
                            name: v,
                            type: String,
                            mayBeNull: c
                        }, {
                            name: "eventHandler",
                            type: Function,
                            mayBeNull: c
                        }, {
                            name: m,
                            type: Function,
                            mayBeNull: b
                        }, {
                            name: o,
                            mayBeNull: b,
                            optional: b
                        }]);
                    if (i) throw i;
                    var e = a._callingIndex++,
                        p = new Date;
                    a._callbackList[e] = {
                        callback: f,
                        createdOn: p.getTime()
                    };
                    try {
                        var k = new Microsoft.Office.Common.Request(g, Microsoft.Office.Common.ActionType.registerEvent, a._conversationId, e, l),
                            n = Microsoft.Office.Common.MessagePackager.envelope(k);
                        a._targetWindow.postMessage(n, a._targetUrl);
                        Microsoft.Office.Common.XdmCommunicationManager._startMethodTimeoutTimer();
                        a._eventHandlerList[g] = j
                    } catch (h) {
                        try {
                            f !== d && f(Microsoft.Office.Common.InvokeResultCode.errorInRequest, h)
                        } finally {
                            delete a._callbackList[e]
                        }
                    }
                },
                unregisterForEvent: function(g, f, k) {
                    var a = this,
                        i = Function._validateParams(arguments, [{
                            name: v,
                            type: String,
                            mayBeNull: c
                        }, {
                            name: m,
                            type: Function,
                            mayBeNull: b
                        }, {
                            name: o,
                            mayBeNull: b,
                            optional: b
                        }]);
                    if (i) throw i;
                    var e = a._callingIndex++,
                        n = new Date;
                    a._callbackList[e] = {
                        callback: f,
                        createdOn: n.getTime()
                    };
                    try {
                        var j = new Microsoft.Office.Common.Request(g, Microsoft.Office.Common.ActionType.unregisterEvent, a._conversationId, e, k),
                            l = Microsoft.Office.Common.MessagePackager.envelope(j);
                        a._targetWindow.postMessage(l, a._targetUrl);
                        Microsoft.Office.Common.XdmCommunicationManager._startMethodTimeoutTimer()
                    } catch (h) {
                        try {
                            f !== d && f(Microsoft.Office.Common.InvokeResultCode.errorInRequest, h)
                        } finally {
                            delete a._callbackList[e]
                        }
                    } finally {
                        delete a._eventHandlerList[g]
                    }
                }
            };
            Microsoft.Office.Common.XdmCommunicationManager = function() {
                var g = "channel is not ready.",
                    a = "Unknown conversation Id.",
                    r = [],
                    l = d,
                    C = 10,
                    p = c,
                    m = d,
                    v = 2e3,
                    s = 6e4,
                    o = {},
                    j = {},
                    t = c;

                function w(c) {
                    for (var b in o)
                        if (o[b]._conversations[c]) return o[b];
                    Sys.Debug.trace(a);
                    throw Error.argument(i)
                }

                function x(c) {
                    var b = j[c];
                    if (!b) {
                        Sys.Debug.trace(a);
                        throw Error.argument(i)
                    }
                    return b
                }

                function A(e, b) {
                    var a = e._methodObjectList[b._actionName];
                    if (!a) {
                        Sys.Debug.trace("The specified method is not registered on service endpoint:" + b._actionName);
                        throw Error.argument("messageObject")
                    }
                    var c = d;
                    if (b._actionType === Microsoft.Office.Common.ActionType.invoke) c = a;
                    else if (b._actionType === Microsoft.Office.Common.ActionType.registerEvent) c = a.getRegisterMethodObject();
                    else c = a.getUnregisterMethodObject();
                    return c
                }

                function E(a) {
                    r.push(a)
                }

                function D() {
                    if (l !== d) {
                        if (!p)
                            if (r.length > 0) {
                                var a = r.shift();
                                p = a.getInvokeBlockingFlag();
                                a.invoke()
                            } else {
                                clearInterval(l);
                                l = d
                            }
                    } else Sys.Debug.trace(g)
                }

                function z() {
                    if (m) {
                        var b, c = 0,
                            i = new Date,
                            f;
                        for (var h in j) {
                            b = j[h];
                            for (var e in b._callbackList) {
                                var a = b._callbackList[e];
                                f = a.timeout ? a.timeout : s;
                                if (Math.abs(i.getTime() - a.createdOn) >= f) try {
                                    a.callback && a.callback(Microsoft.Office.Common.InvokeResultCode.errorHandlingMethodCallTimedout, d)
                                } finally {
                                    delete b._callbackList[e]
                                } else c++
                            }
                        }
                        if (c === 0) {
                            clearInterval(m);
                            m = d
                        }
                    } else Sys.Debug.trace(g)
                }

                function y() {
                    p = c
                }

                function B(a) {
                    if (Sys.Browser.agent === Sys.Browser.InternetExplorer && h.attachEvent) h.attachEvent("onmessage", a);
                    else if (h.addEventListener) h.addEventListener(n, a, c);
                    else {
                        Sys.Debug.trace("Browser doesn't support the required API.");
                        throw Error.argument(k)
                    }
                }

                function F(b) {
                    var c = "Access Denied";
                    if (b.data != e) {
                        var a;
                        try {
                            a = Microsoft.Office.Common.MessagePackager.unenvelope(b.data)
                        } catch (g) {
                            return
                        }
                        if (typeof a._messageType == f) return;
                        if (a._messageType === Microsoft.Office.Common.MessageType.request) {
                            var n = b.origin == d || b.origin == "null" ? a._origin : b.origin;
                            try {
                                var h = w(a._conversationId),
                                    m = h.getPolicyManager();
                                if (m && !m.checkPermission(a._conversationId, a._actionName, a._data)) throw c;
                                var s = A(h, a),
                                    p = new Microsoft.Office.Common.InvokeCompleteCallback(b.source, n, a._actionName, a._conversationId, a._correlationId, y),
                                    t = new Microsoft.Office.Common.Invoker(s, a._data, p, h._eventHandlerProxyList, a._conversationId, a._actionName);
                                if (l == d) l = setInterval(D, C);
                                E(t)
                            } catch (g) {
                                var o = Microsoft.Office.Common.InvokeResultCode.errorHandlingRequest;
                                if (g == c) o = Microsoft.Office.Common.InvokeResultCode.errorHandlingRequestAccessDenied;
                                var r = new Microsoft.Office.Common.Response(a._actionName, a._conversationId, a._correlationId, o, Microsoft.Office.Common.ResponseType.forCalling, g),
                                    q = Microsoft.Office.Common.MessagePackager.envelope(r);
                                b.source && b.source.postMessage && b.source.postMessage(q, n)
                            }
                        } else if (a._messageType === Microsoft.Office.Common.MessageType.response) {
                            var i = x(a._conversationId);
                            if (a._responseType === Microsoft.Office.Common.ResponseType.forCalling) {
                                var j = i._callbackList[a._correlationId];
                                if (j) try {
                                    j.callback && j.callback(a._errorCode, a._data)
                                } finally {
                                    delete i._callbackList[a._correlationId]
                                }
                            } else {
                                var k = i._eventHandlerList[a._actionName];
                                k !== undefined && k !== d && k(a._data)
                            }
                        } else return
                    }
                }

                function u() {
                    if (!t) {
                        B(F);
                        t = b
                    }
                }
                return {
                    connect: function(b, c, d) {
                        u();
                        var a = new Microsoft.Office.Common.ClientEndPoint(b, c, d);
                        j[b] = a;
                        return a
                    },
                    getClientEndPoint: function(b) {
                        var a = Function._validateParams(arguments, [{
                            name: i,
                            type: String,
                            mayBeNull: c
                        }]);
                        if (a) throw a;
                        return j[b]
                    },
                    createServiceEndPoint: function(a) {
                        u();
                        var b = new Microsoft.Office.Common.ServiceEndPoint(a);
                        o[a] = b;
                        return b
                    },
                    getServiceEndPoint: function(b) {
                        var a = Function._validateParams(arguments, [{
                            name: q,
                            type: String,
                            mayBeNull: c
                        }]);
                        if (a) throw a;
                        return o[b]
                    },
                    deleteClientEndPoint: function(b) {
                        var a = Function._validateParams(arguments, [{
                            name: i,
                            type: String,
                            mayBeNull: c
                        }]);
                        if (a) throw a;
                        delete j[b]
                    },
                    _setMethodTimeout: function(a) {
                        var b = Function._validateParams(arguments, [{
                            name: "methodTimeout",
                            type: Number,
                            mayBeNull: c
                        }]);
                        if (b) throw b;
                        s = a <= 0 ? 6e4 : a
                    },
                    _startMethodTimeoutTimer: function() {
                        if (!m) m = setInterval(z, v)
                    }
                }
            }();
            Microsoft.Office.Common.Message = function(l, m, j, k, e) {
                var a = this,
                    g = Function._validateParams(arguments, [{
                        name: "messageType",
                        type: Number,
                        mayBeNull: c
                    }, {
                        name: w,
                        type: String,
                        mayBeNull: c
                    }, {
                        name: i,
                        type: String,
                        mayBeNull: c
                    }, {
                        name: x,
                        mayBeNull: c
                    }, {
                        name: o,
                        mayBeNull: b,
                        optional: b
                    }]);
                if (g) throw g;
                a._messageType = l;
                a._actionName = m;
                a._conversationId = j;
                a._correlationId = k;
                a._origin = h.location.href;
                if (typeof e == f) a._data = d;
                else a._data = e
            };
            Microsoft.Office.Common.Message.prototype = {
                getActionName: function() {
                    return this._actionName
                },
                getConversationId: function() {
                    return this._conversationId
                },
                getCorrelationId: function() {
                    return this._correlationId
                },
                getOrigin: function() {
                    return this._origin
                },
                getData: function() {
                    return this._data
                },
                getMessageType: function() {
                    return this._messageType
                }
            };
            Microsoft.Office.Common.Request = function(c, d, a, b, e) {
                Microsoft.Office.Common.Request.uber.constructor.call(this, Microsoft.Office.Common.MessageType.request, c, a, b, e);
                this._actionType = d
            };
            a.OUtil.extend(Microsoft.Office.Common.Request, Microsoft.Office.Common.Message);
            Microsoft.Office.Common.Request.prototype.getActionType = function() {
                return this._actionType
            };
            Microsoft.Office.Common.Response = function(d, a, b, e, c, f) {
                Microsoft.Office.Common.Response.uber.constructor.call(this, Microsoft.Office.Common.MessageType.response, d, a, b, f);
                this._errorCode = e;
                this._responseType = c
            };
            a.OUtil.extend(Microsoft.Office.Common.Response, Microsoft.Office.Common.Message);
            Microsoft.Office.Common.Response.prototype.getErrorCode = function() {
                return this._errorCode
            };
            Microsoft.Office.Common.Response.prototype.getResponseType = function() {
                return this._responseType
            };
            Microsoft.Office.Common.MessagePackager = {
                envelope: function(a) {
                    return Sys.Serialization.JavaScriptSerializer.serialize(a)
                },
                unenvelope: function(a) {
                    return Sys.Serialization.JavaScriptSerializer.deserialize(a, b)
                }
            };
            Microsoft.Office.Common.ResponseSender = function(e, h, k, f, g, j) {
                var a = this,
                    d = Function._validateParams(arguments, [{
                        name: "requesterWindow",
                        mayBeNull: c
                    }, {
                        name: "requesterUrl",
                        type: String,
                        mayBeNull: c
                    }, {
                        name: w,
                        type: String,
                        mayBeNull: c
                    }, {
                        name: i,
                        type: String,
                        mayBeNull: c
                    }, {
                        name: x,
                        mayBeNull: c
                    }, {
                        name: "responsetype",
                        type: Number,
                        maybeNull: c
                    }]);
                if (d) throw d;
                a._requesterWindow = e;
                a._requesterUrl = h;
                a._actionName = k;
                a._conversationId = f;
                a._correlationId = g;
                a._invokeResultCode = Microsoft.Office.Common.InvokeResultCode.noError;
                a._responseType = j;
                var b = a;
                a._send = function(d) {
                    var c = new Microsoft.Office.Common.Response(b._actionName, b._conversationId, b._correlationId, b._invokeResultCode, b._responseType, d),
                        a = Microsoft.Office.Common.MessagePackager.envelope(c);
                    b._requesterWindow.postMessage(a, b._requesterUrl)
                }
            };
            Microsoft.Office.Common.ResponseSender.prototype = {
                getRequesterWindow: function() {
                    return this._requesterWindow
                },
                getRequesterUrl: function() {
                    return this._requesterUrl
                },
                getActionName: function() {
                    return this._actionName
                },
                getConversationId: function() {
                    return this._conversationId
                },
                getCorrelationId: function() {
                    return this._correlationId
                },
                getSend: function() {
                    return this._send
                },
                setResultCode: function(a) {
                    this._invokeResultCode = a
                }
            };
            Microsoft.Office.Common.InvokeCompleteCallback = function(d, g, h, e, f, c) {
                var b = this;
                Microsoft.Office.Common.InvokeCompleteCallback.uber.constructor.call(b, d, g, h, e, f, Microsoft.Office.Common.ResponseType.forCalling);
                b._postCallbackHandler = c;
                var a = b;
                b._send = function(d) {
                    var c = new Microsoft.Office.Common.Response(a._actionName, a._conversationId, a._correlationId, a._invokeResultCode, a._responseType, d),
                        b = Microsoft.Office.Common.MessagePackager.envelope(c);
                    a._requesterWindow.postMessage(b, a._requesterUrl);
                    a._postCallbackHandler()
                }
            };
            a.OUtil.extend(Microsoft.Office.Common.InvokeCompleteCallback, Microsoft.Office.Common.ResponseSender);
            Microsoft.Office.Common.Invoker = function(h, j, e, f, g, k) {
                var a = this,
                    d = Function._validateParams(arguments, [{
                        name: "methodObject",
                        mayBeNull: c
                    }, {
                        name: "paramValue",
                        mayBeNull: b
                    }, {
                        name: "invokeCompleteCallback",
                        mayBeNull: c
                    }, {
                        name: "eventHandlerProxyList",
                        mayBeNull: b
                    }, {
                        name: i,
                        type: String,
                        mayBeNull: c
                    }, {
                        name: l,
                        type: String,
                        mayBeNull: c
                    }]);
                if (d) throw d;
                a._methodObject = h;
                a._param = j;
                a._invokeCompleteCallback = e;
                a._eventHandlerProxyList = f;
                a._conversationId = g;
                a._eventName = k
            };
            Microsoft.Office.Common.Invoker.prototype = {
                invoke: function() {
                    var a = this;
                    try {
                        var b;
                        switch (a._methodObject.getInvokeType()) {
                            case Microsoft.Office.Common.InvokeType.async:
                                a._methodObject.getMethod()(a._param, a._invokeCompleteCallback.getSend());
                                break;
                            case Microsoft.Office.Common.InvokeType.sync:
                                b = a._methodObject.getMethod()(a._param);
                                a._invokeCompleteCallback.getSend()(b);
                                break;
                            case Microsoft.Office.Common.InvokeType.syncRegisterEvent:
                                var d = a._createEventHandlerProxyObject(a._invokeCompleteCallback);
                                b = a._methodObject.getMethod()(d.getSend(), a._param);
                                a._eventHandlerProxyList[a._conversationId + a._eventName] = d.getSend();
                                a._invokeCompleteCallback.getSend()(b);
                                break;
                            case Microsoft.Office.Common.InvokeType.syncUnregisterEvent:
                                var g = a._eventHandlerProxyList[a._conversationId + a._eventName];
                                b = a._methodObject.getMethod()(g, a._param);
                                delete a._eventHandlerProxyList[a._conversationId + a._eventName];
                                a._invokeCompleteCallback.getSend()(b);
                                break;
                            case Microsoft.Office.Common.InvokeType.asyncRegisterEvent:
                                var c = a._createEventHandlerProxyObject(a._invokeCompleteCallback);
                                a._methodObject.getMethod()(c.getSend(), a._invokeCompleteCallback.getSend(), a._param);
                                a._eventHandlerProxyList[a._callerId + a._eventName] = c.getSend();
                                break;
                            case Microsoft.Office.Common.InvokeType.asyncUnregisterEvent:
                                var f = a._eventHandlerProxyList[a._callerId + a._eventName];
                                a._methodObject.getMethod()(f, a._invokeCompleteCallback.getSend(), a._param);
                                delete a._eventHandlerProxyList[a._callerId + a._eventName]
                        }
                    } catch (e) {
                        a._invokeCompleteCallback.setResultCode(Microsoft.Office.Common.InvokeResultCode.errorInResponse);
                        a._invokeCompleteCallback.getSend()(e)
                    }
                },
                getInvokeBlockingFlag: function() {
                    return this._methodObject.getBlockingFlag()
                },
                _createEventHandlerProxyObject: function(a) {
                    return new Microsoft.Office.Common.ResponseSender(a.getRequesterWindow(), a.getRequesterUrl(), a.getActionName(), a.getConversationId(), a.getCorrelationId(), Microsoft.Office.Common.ResponseType.forEventing)
                }
            };
            var B = function(b) {
                    if (b) a.OUtil.loadScript(b, function() {
                        Sys.Debug.trace("loaded customized script:" + b)
                    });
                    else z()
                },
                D, F, y, A = d,
                E = a.OUtil.parseXdmInfo();
            if (E) {
                y = E.split("|");
                if (y && y.length == 3) {
                    D = y[0];
                    F = y[2];
                    A = Microsoft.Office.Common.XdmCommunicationManager.connect(D, h.parent, F)
                }
            }
            var C = d;
            if (!A) {
                try {
                    if (typeof h.external.getCustomizedScriptPath !== f) C = h.external.getCustomizedScriptPath()
                } catch (G) {
                    Sys.Debug.trace("no script override through window.external.")
                }
                B(C)
            } else try {
                A.invoke("getCustomizedScriptPathAsync", function(b, a) {
                    B(b === 0 ? a : d)
                }, {
                    __timeout__: 1e3
                })
            } catch (G) {
                Sys.Debug.trace("no script override through cross frame communication.")
            }
        },
        v = function() {
            if (typeof Sys !== f && typeof Type !== f && Sys.StringBuilder && typeof Sys.StringBuilder === i && Type.registerNamespace && typeof Type.registerNamespace === i && Type.registerClass && typeof Type.registerClass === i) return b;
            else return c
        };
    if (v()) w();
    else if (typeof Function !== f) {
        var A = (h.location.protocol.toLowerCase() === "https:" ? "https:" : "http:") + "//ajax.aspnetcdn.com/ajax/3.5/MicrosoftAjax.js";
        a.OUtil.loadScript(A, function() {
            if (v()) w();
            else if (typeof Function !== f) throw "Not able to load MicrosoftAjax.js."
        })
    }
})(window)