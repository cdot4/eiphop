"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setupFrontendListener = exports.emit = exports.pendingRequests = void 0;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * Some apps can require('electron'). React apps cannot.
 * hiphop doesn't assume how you'd be building your app,
 * and accepts electron as a dependancy.
 */
// singleton ipcRenderer
var ipcRenderer = null; // singleton requests map

var pendingRequests = {};
exports.pendingRequests = pendingRequests;

var removePendingRequestId = function removePendingRequestId(requestId) {
  exports.pendingRequests = pendingRequests = Object.keys(pendingRequests).filter(function (k) {
    return k !== requestId;
  }).map(function (k) {
    return _defineProperty({}, k, pendingRequests[k]);
  }).reduce(function (accumulator, current) {
    return _objectSpread(_objectSpread({}, accumulator), current);
  }, {});
};

var randomId = function randomId() {
  return "".concat(Date.now().toString(36)).concat(Math.random().toString(36).substr(2, 5));
}; // util method to resolve a promise from outside function scope
// https://stackoverflow.com/questions/26150232/resolve-javascript-promise-outside-function-scope


var Deferred = function Deferred() {
  var _this = this;

  _classCallCheck(this, Deferred);

  this.promise = new Promise(function (resolve, reject) {
    _this.reject = reject;
    _this.resolve = resolve;
  });
};

var emit = function emit(action, payload, notifier) {
  // create a request identifier
  var requestId = randomId(); // send ipc call on asyncRequest channel

  ipcRenderer.send('asyncRequest', requestId, action, payload); // create a new deferred object and save it to pendingRequests
  // this allows us to resolve the promise from outside (giving a cleaner api to domain objects)

  var dfd = new Deferred();

  notifier = notifier || function () {
    console.warn("You forgot to define a notifier function for the ".concat(action, " action."));
  };

  pendingRequests[requestId] = {
    dfd: dfd,
    action: action,
    payload: payload,
    notifier: notifier
  }; // return a promise which will resolve with res

  return dfd.promise;
};

exports.emit = emit;

var setupFrontendListener = function setupFrontendListener(electronModule) {
  // setup global ipcRenderer
  ipcRenderer = electronModule.ipcRenderer; // expect all responses on asyncResponse channel

  ipcRenderer.on('asyncResponseNotify', function (event, requestId, res) {
    var notifier = pendingRequests[requestId].notifier;
    notifier(res);
  });
  ipcRenderer.on('asyncResponse', function (event, requestId, res) {
    var dfd = pendingRequests[requestId].dfd;
    removePendingRequestId(requestId);
    dfd.resolve(res);
  });
  ipcRenderer.on('errorResponse', function (event, requestId, err) {
    var dfd = pendingRequests[requestId].dfd;
    removePendingRequestId(requestId);
    dfd.reject(err);
  });
};

exports.setupFrontendListener = setupFrontendListener;