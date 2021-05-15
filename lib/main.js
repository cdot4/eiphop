"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setupMainHandler = void 0;

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

var getPrefix = function getPrefix(level) {
  return "[".concat(level, "]");
};

var getMsg = function getMsg(level, msg) {
  var dump = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  return "".concat(getPrefix(level), " ").concat(msg, " ").concat(dump && Object.keys(dump).length > 0 ? " - ".concat(JSON.stringify(dump)) : '');
};

var log = {
  error: function error(msg) {
    var dump = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    return console.error(getMsg('ERROR', msg, dump));
  },
  warn: function warn(msg) {
    var dump = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    return console.warn(getMsg('WARN', msg, dump));
  },
  info: function info(msg) {
    var dump = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    return console.log(getMsg('INFO', msg, dump));
  }
};

var isPromise = function isPromise(obj) {
  return !!obj && (_typeof(obj) === 'object' || typeof obj === 'function') && typeof obj.then === 'function';
};

var setupMainHandler = function setupMainHandler(electronModule, availableActions) {
  var enableLogs = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
  var onError = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : function () {};
  enableLogs && log.info('Logs enabled !');
  electronModule.ipcMain.on('asyncRequest', function (event, requestId, action, payload) {
    enableLogs && log.info("Got new request with id = ".concat(requestId, ", action = ").concat(action), payload);
    var res = {
      notify: function notify(message) {
        return event.sender.send('asyncResponseNotify', requestId, message);
      },
      send: function send(result) {
        return event.sender.send('asyncResponse', requestId, result);
      },
      error: function error(err) {
        return event.sender.send('errorResponse', requestId, err);
      }
    };
    var requestedAction = availableActions[action];

    if (!requestedAction) {
      var error = "Action \"".concat(action, "\" is not available. Did you forget to define it ?");
      log.error(error);
      res.error({
        msg: error
      });
      return;
    }

    try {
      var promise = requestedAction({
        payload: payload
      }, res);

      if (isPromise(promise)) {
        promise["catch"](function (e) {
          //error in async code
          log.error(e);
          onError(e);
          res.error({
            error: e.toString()
          });
        });
      }
    } catch (e) {
      //error inside sync code
      log.error(e);
      onError(e);
      res.error({
        error: e.toString()
      });
    }
  });
};

exports.setupMainHandler = setupMainHandler;