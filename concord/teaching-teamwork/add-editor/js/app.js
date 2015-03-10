(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
require('./views/page.jsx');

var WorkbenchAdaptor      = require('./data/workbenchAdaptor'),
    WorkbenchFBConnector  = require('./data/workbenchFBConnector'),
    logController         = require('./controllers/log'),
    userController        = require('./controllers/user'),
    config                = require('./config'),
    activityName;

function startActivity(activityName, ttWorkbench) {
  var workbenchAdaptor, workbenchFBConnector;

  logController.init(activityName);
  React.render(
    React.createElement(PageView, {activity: ttWorkbench }),
    document.getElementById('content')
  );

  userController.init(ttWorkbench.clients.length, function(clientNumber) {
    React.render(
      React.createElement(PageView, {activity: ttWorkbench, circuit:  (1 * clientNumber)+1}),
      document.getElementById('content')
    );

    logController.setClientNumber(clientNumber);
    workbenchAdaptor = new WorkbenchAdaptor(clientNumber)
    workbenchFBConnector = new WorkbenchFBConnector(userController, clientNumber, workbenchAdaptor);
    workbench = workbenchAdaptor.processTTWorkbench(ttWorkbench);
    sparks.createWorkbench(workbench, "breadboard-wrapper");

    logController.startListeningToCircuitEvents();
  });

}

function parseActivity(activityName, rawData) {
  try {
    startActivity(activityName, JSON.parse(rawData));
  }
  catch (e) {
    alert('Unable to parse JSON for ' + activityName);
  }
}

function loadActivity(activityName) {
  var localPrefix = 'local:',
      remotePrefix = 'remote:',
      rawData, data, activityUrl, request;
  
  if (activityName.substr(0, localPrefix.length) == localPrefix) {
    var rawData = localStorage.getItem(activityName);
    if (rawData) {
      parseActivity(activityName, rawData);
    }
    else {
      alert("Could not find LOCAL activity at " + activityName);
    }
  }
  else if (activityName.substr(0, remotePrefix.length) == remotePrefix) {
    var remoteName = activityName.substr(remotePrefix.length),
        slashPos = remoteName.indexOf('/'),
        username = slashPos ? remoteName.substr(0, slashPos) : null,
        filename = slashPos ? remoteName.substr(slashPos + 1) : null,
        url = username && filename ? ('https://teaching-teamwork.firebaseio.com/dev/activities/' + username + '/' + filename) : null;
        firebase = url ? new Firebase(url) : null;
    
    if (firebase) {
      firebase.once('value', function (snapshot) {
        var jsonData = snapshot.val();
        if (jsonData) {
          startActivity(activityName, jsonData);
        }
        else {
          alert("No data found for REMOTE activity at " + url);
        }
      }, function (error) {
        alert("Could not find REMOTE activity at " + url);
      });
    }
    else {
      alert("Invalidate remote name, must be in the form <username>/<filename>");
    }
  }
  else {
    activityUrl = config.modelsBase + activityName + ".json";

    request = new XMLHttpRequest();
    request.open('GET', activityUrl, true);

    request.onload = function() {
      if (request.status >= 200 && request.status < 400) {
        parseActivity(activityName, request.responseText);
      } else {
        alert("Could not find activity at "+activityUrl);
      }
    };

    request.send();
  }
}

// render initial page
React.render(
  React.createElement(PageView, null),
  document.getElementById('content')
);

// load blank workbench
sparks.createWorkbench({"circuit": []}, "breadboard-wrapper");

// load and start activity
activityName = window.location.hash;
activityName = activityName.substring(1,activityName.length);
if (!activityName){
  activityName = "two-resistors";
}

loadActivity(activityName);



},{"./config":2,"./controllers/log":3,"./controllers/user":4,"./data/workbenchAdaptor":5,"./data/workbenchFBConnector":6,"./views/page.jsx":10}],2:[function(require,module,exports){
module.exports = {
  modelsBase: "activities/"
}


},{}],3:[function(require,module,exports){
var logManagerUrl = 'http://teaching-teamwork-log-manager.herokuapp.com/api/logs',
    session,
    username,
    groupname,
    client,
    queue = [],

    generateGUID = function() {
      function S4() {
        return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
      }
      return S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4();
    },

    sendEvent = function(data) {
      var request = new XMLHttpRequest();
      request.open('POST', logManagerUrl, true);
      request.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
      request.send(JSON.stringify(data));
    },

    backfillQueue = function(key, value) {
      for (var i = 0, ii = queue.length; i < ii; i++) {
        queue[i][key] = value;
      }
    },

    processQueue = function() {
      while (queue.length) {
        var event = queue.shift();
        sendEvent(event);
      }
    },

    // value: simple value (string, boolean, number)
    // parameters: object
    logEvent = function(eventName, value, parameters) {
      var data = {
        application: "Teaching Teamwork",
        activity: activityName,
        username: username,
        groupname: groupname,
        board: client,
        session: session,
        time: (Date.now()/1000),
        event: eventName,
        event_value: value,
        parameters: parameters
      }

      if (typeof client == "undefined") {
        queue.push(data);
      } else {
        sendEvent(data);
      }
    },

    startSession = function() {
      session = generateGUID();
      logEvent("Started session");
    };

function LogController() {
}

LogController.prototype = {
  logEvent: logEvent,

  init: function(_activityName) {
    activityName = _activityName;
    startSession();
  },

  setUserName: function(name) {
    username = name;
    backfillQueue("username", username);
    logEvent("Selected Username", username);
  },

  setGroupName: function(name) {
    groupname = name;
    backfillQueue("groupname", groupname);
    logEvent("Joined Group", groupname);
  },

  setClientNumber: function(clientNumber) {
    client = clientNumber;
    backfillQueue("board", client);
    processQueue();
    logEvent("Selected board", client);
  },

  startListeningToCircuitEvents: function() {
    sparks.logController.addListener(function(evt) {
      logEvent(evt.name, null, evt.value);
    });
  }
};

module.exports = new LogController();


},{}],4:[function(require,module,exports){
require('../views/userRegistration.jsx');

var logController = require('./log'),
    numClients,
    userName,
    groupName,
    firebaseGroupRef,
    firebaseUsersRef,
    fbUrl,
    groupUsersListener,
    boardsSelectionListener,
    groupRefCreationListeners,
    client,
    callback;

// scratch
var fbUrlBase = 'https://teaching-teamwork.firebaseio.com/dev/';

var getDate = function() {
  var today = new Date(),
      dd = today.getDate(),
      mm = today.getMonth()+1,
      yyyy = today.getFullYear();

  if(dd<10) {
      dd='0'+dd
  }

  if(mm<10) {
      mm='0'+mm
  }

  return yyyy+'-'+mm+'-'+dd;
}

var notifyGroupRefCreation = function() {
  if (groupRefCreationListeners) {
    for (var i = 0, ii = groupRefCreationListeners.length; i < ii; i++) {
      groupRefCreationListeners.pop()();
    }
  }
}


module.exports = {

  init: function(_numClients, _callback) {
    numClients = _numClients;
    callback = _callback;
    UserRegistrationView.open(this, {form: "username"});
  },

  setName: function(name) {
    userName = name;
    logController.setUserName(userName);
    if (numClients > 1) {
      UserRegistrationView.open(this, {form: "groupname"});
    } else {
      UserRegistrationView.close();
      callback(0);
    }
  },

  checkGroupName: function(name) {
    var date = getDate(),
        self = this;

    groupName = name;

    fbUrl = fbUrlBase + date + "-" + name + "/";

    firebaseGroupRef = new Firebase(fbUrl);
    firebaseUsersRef = firebaseGroupRef.child('users');
    groupUsersListener = firebaseUsersRef.on("value", function(snapshot) {
      var users = snapshot.val();
      // pass only other users in the room
      if (users) {
        delete users[userName];
      }
      UserRegistrationView.open(self, {form: "groupconfirm", users: users});
    });

    firebaseUsersRef.child(userName).set({lastAction: Math.floor(Date.now()/1000)});

    logController.logEvent("Started to join group", groupName);
  },

  rejectGroupName: function() {
    // clean up
    firebaseUsersRef.once("value", function(snapshot) {
      var users = snapshot.val();
      delete users[userName];
      if (Object.keys(users).length) {
        // delete ourselves
        firebaseUsersRef.child(userName).remove();
      } else {
        // delete the room if we are the only member
        firebaseGroupRef.remove();
      }
    });
    UserRegistrationView.open(this, {form: "groupname"});

    logController.logEvent("Rejected Group", groupName);
  },

  setGroupName: function(name) {
    var self = this;
    groupName = name;
    firebaseUsersRef.off("value", groupUsersListener);

    logController.setGroupName(groupName);

    notifyGroupRefCreation();

    // annoyingly we have to get out of this before the off() call is finalized
    setTimeout(function(){
      boardsSelectionListener = firebaseUsersRef.on("value", function(snapshot) {
        var users = snapshot.val();
        UserRegistrationView.open(self, {form: "selectboard", numClients: numClients, users: users});
      });
    }, 1);
  },

  selectClient: function(_client) {
    client = _client;
    firebaseUsersRef.child(userName).set({client: client, lastAction: Math.floor(Date.now()/1000)});
  },

  selectedClient: function() {
    firebaseUsersRef.off("value");
    UserRegistrationView.close();
    callback(client);
  },

  getUsername: function() {
    return userName;
  },

  getFirebaseGroupRef: function() {
    return firebaseGroupRef;
  },

  getOtherClientNos: function() {
    var ret = [];
    for (var i = 0; i < numClients; i++) {
      if (i !== client) ret.push(i);
    }
    return ret;
  },

  onGroupRefCreation: function(callback) {
    if (firebaseGroupRef) {
      callback();
    } else {
      if (!groupRefCreationListeners) {
        groupRefCreationListeners = [];
      }
      groupRefCreationListeners.push(callback);
    }
  }
}


},{"../views/userRegistration.jsx":11,"./log":3}],5:[function(require,module,exports){
/**
 The workbench adaptor takes a TT-workbench definition such as

{
  externalComponents: [
    { comp1 ... connections: "0:a1,1:b2" }
  ],
  clients: [
    {
      circuit: [
        { comp2 ... connections: "a1,b2" },
      ],
      view_prop1: x,
      view_prop2: x
    },
    {
      circuit: [
        { comp3 ... connections: "a1,b2" },
      ],
      view_prop1: y,
      view_prop2: y
    }
 }

 and transforms it for consumption by breadboard.js to (in this case for client-0):

{
  circuit: [
    { comp1 ..., connections: "a1,1:b2", hidden: true },
    { comp2 ..., connections: "a1,b2" },
    { comp3 ..., connections: "1:a1,1:b2", hidden: true }
  ],
  view_prop1: x,
  view_prop2: x
}

when client-0 makes changes, it pushes just those component values to the backend.
**/

WorkbenchAdaptor = function(client) {
  this.client = client;
}

WorkbenchAdaptor.prototype = {
  processTTWorkbench: function(ttWorkbench) {
    var workbenchDef = {
         circuit: []
        },
        comps, comp, clients, ownCircuit, clientProps,
        i, ii, j, jj;

    // copy externalComponents as hidden components
    comps = ttWorkbench.externalComponents
    if (comps) {
      for (i = 0, ii = comps.length; i < ii; i++) {
        comp = comps[i];
        this.validate(comp);
        comp.hidden = true;
        // removes any x: from connection if x == client
        comp.connections = comp.connections.replace(new RegExp(this.client+":","g"),"")
        workbenchDef.circuit.push(comp);
      }
    }

    // copy client components, hiding those that aren't the client's
    clients = ttWorkbench.clients
    for (i = 0, ii = clients.length; i < ii; i++) {

      comps = clients[i].circuit;
      ownCircuit = i == this.client;

      if (comps) {
        for (j = 0, jj = comps.length; j < jj; j++) {
          comp = comps[j];
          this.validate(comp);
          comp.hidden = !ownCircuit;
          // transforms other clients connections, e.g. "a1,b2", to "0:L1,0:L2"
          if (!ownCircuit) {
            comp.connections = i+":"+comp.connections.split(",").join(","+i+":");
            comp.connections = comp.connections.replace(/[abcde](\d)/g,"L$1");
            comp.connections = comp.connections.replace(/[fghij](\d)/g,"L$1");
          }
          workbenchDef.circuit.push(comp);
        }
      }

    }

    // copy non-circuit properties from the appropriate client def
    clientProps = ttWorkbench.clients[this.client];
    for (prop in clientProps) {
      if (clientProps.hasOwnProperty(prop) && prop !== "circuit") {
        workbenchDef[prop] = clientProps[prop];
      }
    }

    return workbenchDef;
  },

  validate: function (comp) {
    if (!comp.type) {
      throw new Error("Component is missing a type");
    }
    if (!comp.connections && !(comp.UID == "source")) {
      throw new Error("Component is missing connections");
    }
  },

  getClientCircuit: function() {
    var circuit = JSON.parse(sparks.workbenchController.serialize()).circuit,
        ownCircuit = [];

    for (var i = 0, ii = circuit.length; i < ii; i++) {
      var comp = circuit[i];
      if (!~comp.connections.indexOf(":") && comp.type !== "powerLead") {
        // ugly
        var nodes = comp.connections.split(","),
            bbHoles = sparks.workbenchController.breadboardController.getHoles();
        if (bbHoles[nodes[0]] || bbHoles[nodes[1]]) {
          ownCircuit.push(comp);
        }
      }
    }

    return ownCircuit;
  },

  updateClient: function(client, circuit) {
    var clientCircuit = [];
    for (var i = 0, ii = circuit.length; i < ii; i++) {
      comp = circuit[i];
      // transforms other clients connections, e.g. "a1,b2", to "0:a1,0:b2"
      comp.connections = client+":"+comp.connections.split(",").join(","+client+":");
      comp.connections = comp.connections.replace(/[abcde](\d)/g,"L$1");
      comp.connections = comp.connections.replace(/[fghij](\d)/g,"L$1");
      clientCircuit.push(comp);
    }

    // update in place
    var circuit = JSON.parse(sparks.workbenchController.serialize()).circuit;
    for (var i = 0, ii = circuit.length; i < ii; i++) {
      var comp = circuit[i];
      if (comp.connections.indexOf(client+":") !== comp.connections.lastIndexOf(client+":")) {
        sparks.workbenchController.breadboardController.remove(comp.type, comp.connections);
      }
    }

    for (i = 0, ii = clientCircuit.length; i < ii; i++) {
      var comp = clientCircuit[i];
      comp.hidden = true;
      sparks.workbenchController.breadboardController.insertComponent(comp.type, comp);
    }
    sparks.workbenchController.workbench.meter.update();
  }
}

module.exports = WorkbenchAdaptor;


},{}],6:[function(require,module,exports){
var clientListFirebaseRef,
    myCircuitFirebaseRef,
    clientNumber,
    wa;

function init() {
  sparks.logController.addListener(function(evt) {
    if (evt.name = "Changed circuit") {
      myCircuitFirebaseRef.set(wa.getClientCircuit());
    }
  });

  // scratch
  var otherClients = userController.getOtherClientNos();
  for (var i = 0, ii = otherClients.length; i < ii; i++) {
    var otherClient = otherClients[i];
    addClientListener(otherClient);
  }
}

function addClientListener(client) {
  clientListFirebaseRef.child(client).on("value", function(snapshot) {
    wa.updateClient(client, snapshot.val());
  });
}


function WorkbenchFBConnector(_userController, _clientNumber, _wa) {
  if (!_userController.getFirebaseGroupRef()) {
    return;
  }
  userController = _userController;
  clientNumber = _clientNumber;
  clientListFirebaseRef = userController.getFirebaseGroupRef().child('clients');
  myCircuitFirebaseRef = clientListFirebaseRef.child(clientNumber);

  wa = _wa;
  init();
}

module.exports = WorkbenchFBConnector;


},{}],7:[function(require,module,exports){
// adapted from http://thecodeplayer.com/walkthrough/javascript-css3-calculator

var logController = require('../controllers/log');
    
module.exports = CalculatorView = React.createClass({displayName: "CalculatorView",
  
  getInitialState: function() {
    this.backspace = String.fromCharCode(8592);
    this.inverse = '1/x';
    this.squareRoot = String.fromCharCode(8730);
    this.equals = '=';
    this.plusMinus = String.fromCharCode(177);
    
    return {
      input: '',
      open: false,
      evaled: false,
      error: false,
      closeRight: 10,
      closeTop: 10,
      openRight: 10,
      openTop: 10
    };
  },
  
  open: function (e) {
    logController.logEvent("Opened calculator");
    this.setState({open: true});
    e.preventDefault();    
  },

  close: function (e) {
    logController.logEvent("Closed calculator");
    this.setState({open: false});
    e.preventDefault();    
  },
  
  clear: function (e) {
    logController.logEvent("Cleared calculator");
    this.setState({
      input: '',
      evaled: false,
      error: false
    });
    e.preventDefault();    
  },

  eval: function (e) {
    var input = this.state.input,
        equation = input.replace(/(\+|\-|\*|\/|\.)$/, ''),
        key = e.target.innerHTML,
        error = false,
        evaled;
        
    if (equation) {
      if (key === this.inverse) {
        equation = "1/(" + equation + ")";
      }
      else if (key === this.squareRoot) {
        equation = "Math.sqrt(" + equation + ")";
      }
      try {
        evaled = eval(equation);
        error = isNaN(evaled) || !isFinite(evaled);
        if (!error) {
          input = evaled.toString();
        }
        logController.logEvent("Calculation performed", null, {
          "key": key,
          "calculation": equation,
          "result": evaled.toString()
        });
      }
      catch (e) {
        logController.logEvent("Calculation error", null, {
          "key": key,
          "calculation": equation,
          "error": e.toString()
        });
        error = true;
      }
      this.setState({
        input: input,
        evaled: !error,
        error: error
      });
    }
    
    e.stopPropagation();
    e.preventDefault();    
  },
  
  keyPressed: function (e) {
    var input = this.state.input,
        preInput = input,
        empty = input.length === 0,
        endsWithOperator = input.match(/(\+|\-|\*|\/)$/),
        key = e.target.innerHTML,
        evaled = false;
    
    // ignore clicks off the buttons
    if (e.target.nodeName !== 'SPAN') {
      return;
    }
    
    if (key.match(/(\+|\-|\*|\/)/)) {
      if (!empty) {
        if (!endsWithOperator || key == '-') {
          input += key;
        }
        else if (input.length > 1) {
          input = input.replace(/.$/, key);
        }
      }
      else if (empty && key == '-') {
        input += key;
      }
    }
    else if (key == '.') {
      if (!input.match(/\./g) && !this.state.evaled) {
        input += key;
      }
    }
    else if (key === this.backspace) {
      if (!empty && !this.state.error) {
        input = input.substr(0, input.length - 1);
      }
    }
    else if (key === this.plusMinus) {
      if (input.match(/^-/)) {
        input = input.replace(/^-/, '');
      }
      else {
        input = '-' + input;
      }
      evaled = this.state.evaled;
    }
    else if (this.state.evaled) {
      input = key;
    }
    else {
      input += key;
    }
    
    logController.logEvent("Calculator button pressed", null, {
      "button": key,
      "preCalculation": preInput,
      "postCalculation": input,
      "changed": this.state.input != input
    });    

    if (this.state.input != input) {
      this.setState({
        input: input,
        evaled: evaled
      });
    }
    
    e.preventDefault();    
  },
  
  startDrag: function (e) {
    this.dragging = (this.state.open && (e.target.nodeName != 'SPAN'));
    this.dragged = false;
    if (!this.dragging) {
      return;
    }
    this.startCalculatorPos = {
      right: this.state.openRight,
      top: this.state.openTop,
    };
    this.startMousePos = {
      x: e.clientX,
      y: e.clientY
    };
  },
  
  drag: function (e) {
    var newPos;
    if (this.dragging) {
      // the calculations are reversed here only because we are setting the right pos and not the left
      newPos = { 
        openRight: this.startCalculatorPos.right + (this.startMousePos.x - e.clientX),
        openTop: this.startCalculatorPos.top + (e.clientY - this.startMousePos.y)
      };
      if ((newPos.openRight != this.state.openRight) || (newPos.openTop != this.state.openTop)) {
        this.setState(newPos);
        this.dragged = true;
      }
    }
  },
  
  endDrag:  function (e) {
    if (this.dragged) {
      logController.logEvent("Calculator dragged", null, {
        "startTop": this.startCalculatorPos.top,
        "startRight": this.startCalculatorPos.right,
        "endTop": this.state.openTop,
        "endRight": this.state.openRight,
      });
      this.dragged = false;
    }
    this.dragging = false;
  },

  render: function() {
    var style = {
      top: this.state.open ? this.state.openTop : this.state.closeTop, 
      right: this.state.open ? this.state.openRight : this.state.closeRight
    };
    
    if (this.state.open) {
      return (
        React.createElement("div", {id: "calculator", onMouseDown:  this.startDrag, onMouseMove:  this.drag, onMouseUp:  this.endDrag, style: style }, 
          React.createElement("div", {className: "top very-top"}, 
            React.createElement("span", {className: "title"}, "Calculator"), 
            React.createElement("span", {className: "close", onClick:  this.close}, "X")
          ), 
          
          React.createElement("div", {className: "top"}, 
            React.createElement("span", {className: "clear", onClick:  this.clear}, "C"), 
            React.createElement("div", {className:  this.state.error ? 'screen screen-error' : 'screen'},  this.state.input)
          ), 
          
          React.createElement("div", {className: "keys", onClick:  this.keyPressed}, 
            React.createElement("span", null, "7"), 
            React.createElement("span", null, "8"), 
            React.createElement("span", null, "9"), 
            React.createElement("span", {className: "operator"}, "+"), 
            React.createElement("span", {className: "operator operator-right"}, this.backspace), 
            
            React.createElement("span", null, "4"), 
            React.createElement("span", null, "5"), 
            React.createElement("span", null, "6"), 
            React.createElement("span", {className: "operator"}, "-"), 
            React.createElement("span", {className: "eval eval-right", onClick:  this.eval}, this.inverse), 
            
            React.createElement("span", null, "1"), 
            React.createElement("span", null, "2"), 
            React.createElement("span", null, "3"), 
            React.createElement("span", {className: "operator"}, "/"), 
            React.createElement("span", {className: "eval eval-right", onClick:  this.eval}, this.squareRoot), 
            
            React.createElement("span", null, "0"), 
            React.createElement("span", null, "."), 
            React.createElement("span", {className: "operator"}, this.plusMinus), 
            React.createElement("span", {className: "operator"}, "*"), 
            React.createElement("span", {className: "eval eval-right", onClick:  this.eval}, this.equals)
          )
        )
      );
    }
    else {
      return (
        React.createElement("div", {id: "open-calculator", onClick:  this.open, style: style }, 
          "Calculator"
        )
      );
    }
  }
});


},{"../controllers/log":3}],8:[function(require,module,exports){
require('./goalTable.jsx');

var ReactTransitionGroup = React.addons.TransitionGroup;

var userController  = require('../controllers/user'),
    logController   = require('../controllers/log');

module.exports = ChatView = React.createClass({displayName: "ChatView",
  getInitialState: function() {
    this.items = [];
    return {items: [], text: ""};
  },
  componentWillMount: function() {
    var self = this;
    userController.onGroupRefCreation(function() {
      self.firebaseRef = userController.getFirebaseGroupRef().child("chat");
      self.firebaseRef.on("child_added", function(dataSnapshot) {
        self.items.push(dataSnapshot.val());
        self.setState({
          items: self.items
        });
      }.bind(self));
    });
  },
  componentWillUnmount: function() {
    this.firebaseRef.off();
  },
  onChange: function(e) {
    this.setState({text: e.target.value});
  },
  handleSubmit: function(e) {
    e.preventDefault();
    this.firebaseRef.push({
      user: userController.getUsername(),
      message: this.state.text
    });
    logController.logEvent("Sent message", this.state.text);
    this.setState({text: ""});
  },
  handleSendVal: function(e) {
    e.preventDefault();
    var val   = sparks.workbenchController.workbench.meter.dmm.currentValue,
      units = sparks.workbenchController.workbench.meter.dmm.currentUnits || "V";

    this.firebaseRef.push({
      user: userController.getUsername(),
      message: val+" "+units,
      val: val,
      units: units
    });
    logController.logEvent("Sent value", val+" "+units);
  },
  render: function() {

    var table = null,
        sendMeas = null;

    if (this.props.simpleMeasurementGame) {
      table = React.createElement(GoalTable, React.__spread({},  this.props.simpleMeasurementGame))
      sendMeas = React.createElement("button", {id: "send-val", onClick:  this.handleSendVal}, "Send measurement")
    }

    var Message = React.createClass({displayName: "Message",
      componentDidEnter: function() {
        $('#messages').stop().animate({
          scrollTop: $("#messages")[0].scrollHeight
        }, 800);
      },
      render: function() {
        return React.createElement("div", {key:  this.props.i, className: "chat"}, React.createElement("b", null,  this.props.item.user, ":"), " ",  this.props.item.message)
      }
    });

    return (
      React.createElement("div", {id: "chat"}, 
        React.createElement("div", {id: "messages"}, 
          React.createElement(ReactTransitionGroup, null, 
            this.state.items.map(function(item, i) {
              return React.createElement(Message, {i: i, item: item })
            })
          )
        ), 
        table, 
        React.createElement("div", {id: "input"}, 
          React.createElement("form", {onSubmit:  this.handleSubmit}, 
            "Send chat:", 
              React.createElement("input", {onChange:  this.onChange, value:  this.state.text, type: "text", size: "70", id: "send-chat"}), 
              React.createElement("button", {id: "send", onClick:  this.handleSubmit}, "Send"), 
              sendMeas 
          )
        )
      )
    );
  }
});


},{"../controllers/log":3,"../controllers/user":4,"./goalTable.jsx":9}],9:[function(require,module,exports){
module.exports = GoalTable = React.createClass({displayName: "GoalTable",
  render: function() {
    var rows = this.props.goal.map(function(val, i) {
      return (React.createElement("tr", null, 
                React.createElement("td", null,  i+1), 
                React.createElement("td", null, val ), 
                React.createElement("td", {className: "actual"})
              )
              );
    });
    return (
      React.createElement("div", {id: "values"}, 
        React.createElement("table", null, 
          React.createElement("tr", null, 
            React.createElement("th", null), 
            React.createElement("th", null, "Goal (",  this.props.measurement, ")"), 
            React.createElement("th", null, "Actual")
          ), 
          rows 
        )
      )
    );
  }
});


},{}],10:[function(require,module,exports){
require('./chat.jsx');
require('./calculator.jsx');

var config = require('../config');

module.exports = PageView = React.createClass({displayName: "PageView",
  render: function() {
    var title,
        activity = this.props.activity ? this.props.activity : {},
        image = null,
        chat = null,
        src;
        
    if (activity.name) {
      title = React.createElement("h1", null, "Teaching Teamwork: ",  activity.name)
    } else {
      title = React.createElement("h1", null, "Teaching Teamwork")
    }

    if (activity.image) {
      src = /^https?:\/\//.test(activity.image) ? activity.image : config.modelsBase + activity.image;
      image = React.createElement("img", {src: src })
    }

    if (activity.clients && activity.clients.length > 1) {
      chat = React.createElement(ChatView, React.__spread({},  activity))
    }
    return (
      React.createElement("div", {className: "tt-page"}, 
        title, 
        React.createElement("h2", null, "Circuit ",  this.props.circuit), 
        React.createElement("div", {id: "breadboard-wrapper"}), 
        chat, 
        React.createElement("div", {id: "image-wrapper"}, image ), 
        React.createElement(CalculatorView, null)
      )
    );
  }
});


},{"../config":2,"./calculator.jsx":7,"./chat.jsx":8}],11:[function(require,module,exports){
var userController;

module.exports = UserRegistrationView = React.createClass({displayName: "UserRegistrationView",
  statics: {
    // open a dialog with props object as props
    open: function(_userController, data) {
      userController = _userController;
      var $anchor = $('#user-registration');
      if (!$anchor.length) {
        $anchor = $('<div id="user-registration" class="modalDialog"></div>').appendTo('body');
      }

      setTimeout(function(){
        $('#user-registration')[0].style.opacity = 1;},
      100);

      return React.render(
        React.createElement(UserRegistrationView, React.__spread({},  data)),
        $anchor.get(0)
      );
    },

    // close a dialog
    close: function() {
      React.unmountComponentAtNode($('#user-registration').get(0));
      $('#user-registration').remove();
    }
  },
  getInitialState: function() {
    return {userName: '', groupName: ''};
  },
  handleUserNameChange: function(event) {
    this.setState({userName: event.target.value});
  },
  handleGroupNameChange: function(event) {
    this.setState({groupName: event.target.value});
  },
  handleSubmit: function(e) {
    e.preventDefault();
    if (this.props.form == "username") {
      userController.setName(this.state.userName);
    } else {
      userController.checkGroupName(this.state.groupName);
    }
  },
  handleJoinGroup: function() {
    userController.setGroupName(this.state.groupName);
  },
  handleRejectGroup: function() {
    this.setState({groupName: ''});
    userController.rejectGroupName();
  },
  handleClientSelection: function() {
    userController.selectClient(event.target.value);
  },
  handleClientSelected: function(e) {
    e.preventDefault();
    userController.selectedClient();
  },
  render: function() {
    var form;
    if (this.props.form == 'username') {
      form = (
        React.createElement("div", null, 
          React.createElement("h3", null, " "), 
          React.createElement("label", null, 
            React.createElement("span", null, "User Name :"), 
            React.createElement("input", {type: "text", value: this.state.userName, onChange: this.handleUserNameChange})
          )
        )
      );
    } else if (this.props.form == 'groupname') {
      form = (
        React.createElement("div", null, 
          React.createElement("h3", null, "Hi ",  this.state.userName, "!"), 
          React.createElement("label", null, 
            React.createElement("span", null, "Group Name :"), 
            React.createElement("input", {type: "text", value: this.state.groupName, onChange: this.handleGroupNameChange})
          )
        )
      );
    } else if (this.props.form == 'groupconfirm') {
      var groupDetails,
          joinStr,
          keys = Object.keys(this.props.users);
      if (keys.length == 0) {
        groupDetails = (
          React.createElement("div", null, 
            React.createElement("label", null, "You are the first member of this group.")
          )
        );
      } else {
        groupDetails = (
          React.createElement("div", null, 
            React.createElement("label", null, "These are the people currently in this group:"), 
            React.createElement("ul", null, 
              keys.map(function(result) {
                return React.createElement("li", null, React.createElement("b", null, result));
              })
            )
          )
        );
      }

      joinStr = (keys.length ? "join" : "create");

      form = (
        React.createElement("div", null, 
          React.createElement("h3", null, "Group name: ",  this.state.groupName), 
          groupDetails, 
          React.createElement("label", null, " "), 
          React.createElement("span", null, "Do you want to ", joinStr, " this group?"), 
          React.createElement("label", null, 
            React.createElement("button", {onClick:  this.handleJoinGroup}, "Yes, ", joinStr ), 
            React.createElement("button", {onClick:  this.handleRejectGroup}, "No, enter a different group")
          )
        )
      );
    } else if (this.props.form == 'selectboard') {
      var clientChoices = [],
          submittable = false;
      for (var i = 0, ii = this.props.numClients; i < ii; i++) {
        var userSpan = ( React.createElement("i", null, "currently unclaimed") ),
            isOwn = false,
            selected = false,
            valid = true,
            selectedUsers = [];
        for (user in this.props.users) {
          if (this.props.users[user].client == i) {
            selectedUsers.push(user);
            if (user == this.state.userName) {
              isOwn = true;
              selected = true;
            }
            if (selectedUsers.length > 1) {
              valid = false;
            }
            userSpan = ( React.createElement("span", {className:  valid ? "" : "error"},  selectedUsers.join(", ") ) );
          }
        }
        if (isOwn && selectedUsers.length == 1) {
          submittable = true;
        }

        clientChoices.push(
          React.createElement("div", null, 
            React.createElement("input", {type: "radio", name: "clientSelection", defaultChecked: selected, value: i, onClick:  this.handleClientSelection}), "Circuit ",  i+1, " (", userSpan, ")"
          ) );
      }

      form = (
        React.createElement("div", null, 
          clientChoices, 
          React.createElement("label", null, 
            React.createElement("button", {disabled:  !submittable, onClick:  this.handleClientSelected}, "Select")
          )
        )
      );
    }

    return (
      React.createElement("form", {onSubmit:  this.handleSubmit}, 
        form 
      )
    );
  }
});


},{}]},{},[1]);
