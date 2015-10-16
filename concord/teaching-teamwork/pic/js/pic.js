(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// for this mockup I've put all components in one file

/*

  Todo:
    
  1. Add connected component rendering
  2. Add fake chat output
  3. Add logic probe

*/

var picCode = require('./data/pic-code'),
    div = React.DOM.div,
    span = React.DOM.span,
    svg = React.DOM.svg,
    rect = React.DOM.rect,
    line = React.DOM.line,
    circle = React.DOM.circle,
    text = React.DOM.text,
    path = React.DOM.path,
    button = React.DOM.button,
    g = React.DOM.g,
    WORKSPACE_HEIGHT = 768,
    WORKSPACE_WIDTH = 1024 - 200,
    RIBBON_HEIGHT = 21,
    SELECTED_FILL = '#bbb',
    UNSELECTED_FILL = '#777',
    AppView, FakeSidebarView, WorkspaceView, BoardView, Board, RibbonView, ConnectorView,
    Keypad, LED, PIC, Connector, KeypadView, LEDView, PICView,
    ConnectorHoleView, calculateComponentRect, Hole, Pin, PinView,
    BoardEditorView, SimulatorControlView, Wire, Button, ButtonView, Segment, Circuit, DemoControlView;

function createComponent(def) {
  return React.createFactory(React.createClass(def));
}

function selectedConstants(selected) {
  var boardHeight;
  
  if (selected) {
    boardHeight = WORKSPACE_HEIGHT * 0.5;
    return {
      WIRE_WIDTH: 3,
      CONNECTOR_HOLE_DIAMETER: 15,
      CONNECTOR_HOLE_MARGIN: 4,
      BOARD_HEIGHT: boardHeight,
      COMPONENT_WIDTH: boardHeight * 0.5,
      COMPONENT_HEIGHT: boardHeight * 0.5,
      COMPONENT_SPACING: boardHeight * 0.5,
      PIC_FONT_SIZE: 12,
      BUTTON_FONT_SIZE: 16,
      PIN_WIDTH: 13.72,
      PIN_HEIGHT: 13.72
    };
  }
  else {
    boardHeight = (WORKSPACE_HEIGHT - (2 * RIBBON_HEIGHT)) / 3;
    return {
      WIRE_WIDTH: 2,
      CONNECTOR_HOLE_DIAMETER: 10,
      CONNECTOR_HOLE_MARGIN: 3,
      BOARD_HEIGHT: boardHeight,
      COMPONENT_WIDTH: boardHeight * 0.5,
      COMPONENT_HEIGHT: boardHeight * 0.5,
      COMPONENT_SPACING: boardHeight * 0.5,
      PIC_FONT_SIZE: 8,
      BUTTON_FONT_SIZE: 13,
      PIN_WIDTH: 8.64,
      PIN_HEIGHT: 8.64
    };
  }
}

function getBezierPath(options) {
  var firstPointIsLowest, lowest, highest, midX, midY, perpSlope, x3, y3, reflection;
  
  firstPointIsLowest = options.y1 > options.y2;
  lowest = {x: firstPointIsLowest ? options.x1 : options.x2, y: firstPointIsLowest ? options.y1: options.y2};
  highest = {x: firstPointIsLowest ? options.x2 : options.x1, y: firstPointIsLowest ? options.y2 : options.y1};

  midX = (lowest.x + highest.x) / 2;
  midY = (lowest.y + highest.y) / 2;
  perpSlope = (lowest.x - highest.x) / (highest.y - lowest.y);
  if (!isFinite(perpSlope)) {
    perpSlope = 1;
  }
  reflection = highest.x >= lowest.x ? options.reflection : -options.reflection;
  
  x3 = midX + (Math.cos(perpSlope) * 100 * reflection);
  y3 = midY + (Math.sin(perpSlope) * 100 * reflection);
  
  return ['M', options.x1, ',', options.y1, ' Q', x3, ',', y3, ' ', options.x2, ',', options.y2].join('');
}

Wire = function (options) {
  this.source = options.source;
  this.dest = options.dest;
  this.color = options.color;
};
Wire.prototype.connectsTo = function (sourceOrDest) {
  return (this.source === sourceOrDest) || (this.dest === sourceOrDest);
};
Wire.prototype.getBezierReflection = function () {
  if (this.dest.connector) {
    return this.dest.getBezierReflection();
  }
  return this.source.getBezierReflection();
};

Circuit = function (options) {
  this.source = options.source;
  this.dest = options.dest;
};
Circuit.ResolveWires = function (wires) {
  var circuits = [],
      wire, i, source, dest;
      
  for (i = 0; i < wires.length; i++) {
    wire = wires[i];
    
    source = Circuit.FindTerminal(wire, wire.source);
    dest = Circuit.FindTerminal(wire, wire.dest);
    if ((source === 'circular') || (dest === 'circular')) {
      alert('A circular wire graph was found.  Aborting!');
      return false;
    }
    circuits.push(new Circuit({
      source: source,
      dest: dest
    }));
  }
  return circuits;
};
Circuit.FindTerminal = function (wire, pinOrHole) {
  var terminal = pinOrHole, 
      foundWire = true,
      otherConnector, otherHole, otherWire, i;
  
  while (terminal.connector && foundWire) {
    otherConnector = terminal.connector.connectsTo;
    otherHole = otherConnector.holes[terminal.index];
    
    foundWire = false;
    for (i = 0; i < otherConnector.board.wires.length; i++) {
      otherWire = otherConnector.board.wires[i];
      if (otherWire === wire) {
        return 'circular';
      }
      if ((otherWire.source === otherHole) || (otherWire.dest === otherHole)) {
        terminal = otherWire.source === otherHole ? otherWire.dest : otherWire.source;
        foundWire = true;
        break;
      }
    }
  }
  
  return terminal;
};

Circuit.prototype.resolveInputValues = function () {
  var input = null,
      output = null;
      
  if (this.source.isPin && this.dest.isPin) {
    if (this.source.inputMode && !this.dest.inputMode) {
      input = this.source;
      output = this.dest;
    }
    else if (!this.source.inputMode && this.dest.inputMode) {
      input = this.dest;
      output = this.source;
    }
  }
  else if (this.source.isPin && !this.source.inputMode) {
    input = this.dest;
    output = this.source;
  }
  else if (this.dest.isPin && !this.dest.inputMode) {
    input = this.source;
    output = this.dest;
  }
  
  if (input && output) {
    input.value = output.value;
  }
};
/*
var name, i, j, wire, source, dest, findTerminal, component;

// create the source and dest pin and hole lists and check for cycles
findTerminal = function (wire, pinOrHole) {
  var otherConnector, otherHole, otherWire, i;
  
  while (pinOrHole.connector) {
    otherConnector = pinOrHole.connector.connectsTo;
    otherHole = otherConnector.holes[pinOrHole.index];
    for (i = 0; i < otherConnector.board.wires; i++) {
      otherWire = otherConnector.board.wires[i];
      if (((otherWire.source === otherHole) || (otherWire.dest === otherHole)) && (otherWire === wire)) {
        return 'circular';
      }
      if (otherWire.source === otherHole) {
        pinOrHole = otherWire.dest;
        break;
      }
      if (otherWire.dest === otherHole) {
        pinOrHole = otherWire.source;
        break;
      }
    }
  }
  
  return pinOrHole;
};

// resolve wire input values
for (i = 0; i < this.wires.length; i++) {
  wire = this.wires[i];
  
  // find the terminal source and dest pins or holes
  source = findTerminal(wire, wire.source);
  dest = findTerminal(wire, wire.dest);
  if ((source === 'circular') || (dest === 'circular')) {
    alert('A circular wire graph was found.  Aborting!');
    return false;
  }
  
  source.inputValue = dest.outputValue;
  dest.inputValue = source.outputValue;
}
*/
/*
// find the terminal source and dest pins or holes
source = findTerminal(wire, wire.source);
dest = findTerminal(wire, wire.dest);
if ((source === 'circular') || (dest === 'circular')) {
  alert('A circular wire graph was found.  Aborting!');
  return false;
}
*/

Button = function (options) {
  this.value = options.value;
  this.intValue = options.intValue;
  this.x = options.x;
  this.y = options.y;
  this.cx = options.x + (options.width / 2);
  this.cy = options.y + (options.height / 2);
  this.height = options.height;
  this.width = options.width;
  this.labelSize = options.labelSize;
  this.label = options.label;
  this.component = options.component;
};

Segment = function (options) {
  this.index = options.index;
  this.layout = options.layout;
  this.component = options.component;
  this.pin = options.pin;
};

Pin = function (options) {
  this.isPin = true; // to allow for easy checks against holes in circuits
  this.inputMode = options.inputMode;
  this.placement = options.placement;
  this.number = options.number;
  this.x = options.x;
  this.y = options.y;
  this.cx = options.x + (options.width / 2);
  this.cy = options.y + (options.height / 2);
  this.height = options.height;
  this.width = options.width;
  this.labelSize = options.labelSize;
  this.label = options.label;
  this.component = options.component;
  this.bezierReflection = options.bezierReflection || 1;
  this.notConnectable = options.notConnectable || false;
  this.connected = options.connected || false;
  this.value = options.value || 0;
};
Pin.prototype.getBezierReflection = function () {
  return this.bezierReflection;
};

Hole = function (options) {
  this.isPin = false; // to allow for easy checks against pins in circuits
  this.index = options.index;
  this.cx = options.cx;
  this.cy = options.cy;
  this.radius = options.radius;
  this.color = options.color;
  this.connector = options.connector;
  this.connected = options.connected || false;
  this.value = options.value || 0;
};
Hole.prototype.getBezierReflection = function () {
  return this.connector.type === 'input' ? 1 : -1;
};

Connector = function (options) {
  var self = this,
      i;
  
  this.type = options.type;
  this.count = options.count;
  this.position = {};
  
  this.holes = [];
  for (i = 0; i < this.count; i++) {
    this.holes.push(new Hole({
      index: i,
      x: 0,
      y: 0,
      radius: 0,
      color: ['blue', 'green', 'purple', 'red'][i],
      connector: self
    }));
  }  
};
Connector.prototype.calculatePosition = function (selected) {
  var constants = selectedConstants(selected),
      i, cx, cy, radius, holeWidth, hole;

  holeWidth = constants.CONNECTOR_HOLE_DIAMETER + (constants.CONNECTOR_HOLE_MARGIN * 2);
  this.position.width = holeWidth * this.count;
  this.position.height = holeWidth;
  this.position.x = (WORKSPACE_WIDTH - this.position.width) / 2;
  this.position.y = this.type === 'input' ? 0 : constants.BOARD_HEIGHT - this.position.height;

  radius = constants.CONNECTOR_HOLE_DIAMETER / 2;
  cy = this.type === 'input' ? this.position.y + constants.CONNECTOR_HOLE_MARGIN + radius : constants.BOARD_HEIGHT - (constants.CONNECTOR_HOLE_MARGIN + radius);
  cx = ((WORKSPACE_WIDTH - this.position.width) / 2) + (holeWidth / 2);

  for (i = 0; i < this.count; i++) {
    hole = this.holes[i];
    hole.cx = cx + (i * holeWidth);
    hole.cy = cy;
    hole.radius =  radius;
  }
};

calculateComponentRect = function (selected, index, count, componentWidth, componentHeight) {
  
  var constants = selectedConstants(selected),
      startX, position;
      
  componentWidth = componentWidth || constants.COMPONENT_WIDTH;
  componentHeight = componentHeight || constants.COMPONENT_HEIGHT;
  
  startX = (WORKSPACE_WIDTH - (count * componentWidth) - ((count - 1) * constants.COMPONENT_SPACING)) / 2;
      
  position = {
    x: startX + (index * (componentWidth + constants.COMPONENT_SPACING)),
    y: ((constants.BOARD_HEIGHT - componentHeight) / 2),
    width: componentWidth,
    height: componentHeight
  };
  
  return position;
};

Keypad = function () {
  var i, pin, button, values;
  
  this.view = KeypadView;
  
  this.pushedButton = null;
  
  this.pins = [];
  this.pinMap = {};
  for (i = 0; i < 7; i++) {
    pin = {
      number: i,
      inputMode: i > 2,
      placement: i < 3 ? 'top' : 'right',
      x: 0,
      y: 0,
      height: 0,
      width: 0,
      labelSize: 0,
      component: this,
      bezierReflection: i < 3 ? -1 : 1 // the top pins should arc the opposite
    };
    pin.label = {
      x: 0,
      y: 0,
      anchor: 'end',
      //text: ['RB0', 'RB1', 'RB2', 'RB3', 'RB4', 'RB5', 'RB6'][i]
      text: ['COL0', 'COL1', 'COL2', 'ROW0', 'ROW1', 'ROW2', 'ROW3'][i]
    };
    pin = new Pin(pin);
    this.pins.push(pin);
    this.pinMap[pin.label.text] = pin;
  }
  
  values = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
  this.buttons = [];
  for (i = 0; i < 12; i++) {
    button = {
      value: values[i],
      intValue: parseInt(values[i]),
      x: 0,
      y: 0,
      height: 0,
      width: 0,
      labelSize: 0,
      component: this
    };
    button.label = {
      x: 0,
      y: 0,
      anchor: 'middle',
      text: values[i],
    };
    this.buttons.push(new Button(button));
  }
  this.bottomButtonValues = [this.buttons[9].value, this.buttons[10].value, this.buttons[11].value];
};
Keypad.prototype.calculatePosition = function (selected, index, count) {
  var constants = selectedConstants(selected),
      padWidth, padHeight, i, pin, j, button, buttonWidth, buttonHeight, buttonDX, buttonDY;
  
  this.position = calculateComponentRect(selected, index, count, constants.COMPONENT_WIDTH * 1.5, constants.COMPONENT_HEIGHT * 1.5);
  
  padWidth = this.position.width * 0.8;
  padHeight = this.position.height * 0.9;
  
  this.position.pad = {
    x: this.position.x + ((this.position.width - padWidth) / 2),
    y: this.position.y + ((this.position.height - padHeight) / 2),
    width: padWidth,
    height: padHeight
  };

  // buttons
  buttonWidth = padWidth / 5;
  buttonHeight = buttonWidth;
  buttonDX = (padWidth - (buttonWidth * 3)) / 4;
  buttonDY = (padHeight - (buttonHeight * 4)) / 5;
  
  for (i = 0; i < 3; i++) {
    for (j = 0; j < 4; j++) {
      button = this.buttons[(j * 3) + i];
      button.x = this.position.pad.x + buttonDX + (i * (buttonWidth + buttonDX));
      button.y = this.position.pad.y + buttonDY + (j * (buttonHeight + buttonDY));
      button.cx = button.x + (buttonWidth / 2);
      button.cy = button.y + (buttonHeight / 2);
      button.height = buttonWidth;
      button.width = buttonHeight;
      button.labelSize = constants.BUTTON_FONT_SIZE;
      button.label.x = (button.x + (buttonWidth / 2));
      button.label.y = (button.y + ((buttonHeight + constants.BUTTON_FONT_SIZE) / 2.25));
    }
  }
  
  // upper pins
  for (i = 0; i < 3; i++) {
    pin = this.pins[i];
    pin.x = this.buttons[i].cx - (constants.PIN_WIDTH / 2);
    pin.y = this.position.pad.y - constants.PIN_HEIGHT;
    pin.label.x = pin.x + (constants.PIN_WIDTH / 2);
    pin.label.y = this.position.pad.y - (1.5 * constants.PIC_FONT_SIZE);
    pin.label.anchor = 'middle';
  }
  
  // right side pins
  for (i = 3; i < this.pins.length; i++) {
    pin = this.pins[i];
    pin.x = this.position.pad.x + this.position.pad.width;
    pin.y = this.buttons[(i - 3) * 3].cy - (constants.PIN_HEIGHT / 2);
    pin.label.x = pin.x + (1.5  * constants.PIN_WIDTH);
    pin.label.y = pin.y + ((constants.PIN_HEIGHT + constants.PIC_FONT_SIZE) / 2.25);
    pin.label.anchor = 'start';
  }
  
  // update all pins
  for (i = 0; i < this.pins.length; i++) {
    pin = this.pins[i];
    pin.cx = pin.x + (constants.PIN_WIDTH / 2);
    pin.cy = pin.y + (constants.PIN_HEIGHT / 2);
    pin.width = constants.PIN_WIDTH;
    pin.height = constants.PIN_HEIGHT;
    pin.labelSize = constants.PIC_FONT_SIZE;
  }
  
  this.listeners = [];
};
Keypad.prototype.addListener = function (listener) {
  this.listeners.push(listener);
};
Keypad.prototype.removeListener = function (listener) {
  this.listeners.splice(this.listeners.indexOf(listener), 1);
};
Keypad.prototype.notify = function () {
  var i;
  for (i = 0; i < this.listeners.length; i++) {
    this.listeners[i](this);
  }
};
Keypad.prototype.reset = function () {
  this.pushedButton = null;
  this.notify();
};
Keypad.prototype.pushButton = function (button) {
  this.pushedButton = button;
  this.notify();
};
Keypad.prototype.resolveOutputValues = function () {
  var colValue = 7,
      intValue, bottomButtonIndex;
  
  if (this.pushedButton) {
    intValue = this.pushedButton.intValue;
    bottomButtonIndex = this.bottomButtonValues.indexOf(this.pushedButton.value);
    
    if (!this.pinMap.ROW0.value && ((intValue >= 1) && (intValue <= 3))) {
      colValue = colValue & ~(1 << (intValue - 1));
    }
    else if (!this.pinMap.ROW1.value && ((intValue >= 4) && (intValue <= 6))) {
      colValue = colValue & ~(1 << (intValue - 4));
    }
    else if (!this.pinMap.ROW2.value && ((intValue >= 7) && (intValue <= 9))) {
      colValue = colValue & ~(1 << (intValue - 7));
    }
    else if (!this.pinMap.ROW3.value && (bottomButtonIndex !== -1)) {
      colValue = colValue & ~(1 << bottomButtonIndex);
    }
  }
  
  this.pinMap.COL0.value = colValue & 1 ? 1 : 0;
  this.pinMap.COL1.value = colValue & 2 ? 1 : 0;
  this.pinMap.COL2.value = colValue & 4 ? 1 : 0;
};

LED = function () {
  var i, pin, segmentLayoutMap, segment;
  
  this.view = LEDView;
  
  this.pins = [];
  this.pinMap = {};
  for (i = 0; i < 10; i++) {
    pin = {
      number: i,
      inputMode: true,
      placement: i < 5 ? 'top' : 'bottom',
      x: 0,
      y: 0,
      height: 0,
      width: 0,
      labelSize: 0,
      component: this,
      notConnectable: [2, 7].indexOf(i) !== -1
    };
    pin.label = {
      x: 0,
      y: 0,
      anchor: 'end',
      text: ['g', 'f', 'ca', 'a', 'b', 'e', 'd', 'ca', 'c', 'DP'][i]
    };
    pin = new Pin(pin);
    this.pins.push(pin);
    this.pinMap[pin.label.text] = pin;
  }
  
  this.segments = [];
  segmentLayoutMap = [
    {x: 0, y: 0, rotation: 0},
    {x: 1, y: 0, rotation: 90},
    {x: 1, y: 1, rotation: 90},
    {x: 0, y: 2, rotation: 0},
    {x: 0, y: 1, rotation: 90},
    {x: 0, y: 0, rotation: 90},
    {x: 0, y: 1, rotation: 0}
  ];
  for (i = 0; i < 7; i++) {
    segment = {
      number: i,
      layout: segmentLayoutMap[i],
      component: this,
      pin: this.pinMap[['a', 'b', 'c', 'd', 'e', 'f', 'g', 'DP'][i]]
    };
    this.segments.push(new Segment(segment));    
  }
  
  this.decimalPoint = {
    layout: {x: 1, y: 2}
  };
};
LED.prototype.calculatePosition = function (selected, index, count) {
  var constants = selectedConstants(selected),
      displayWidth, displayHeight, i, pin, pinDX, segmentWidth, segmentHeight, segment, pathCommands, endCapSize, p;
  
  this.position = calculateComponentRect(selected, index, count);
  
  displayWidth = this.position.width * 0.8;
  displayHeight = this.position.height * 0.9;
  
  this.position.display = {
    x: this.position.x + ((this.position.width - displayWidth) / 2),
    y: this.position.y + ((this.position.height - displayHeight) / 2),
    width: displayWidth,
    height: displayHeight
  };

  // pins
  pinDX = (this.position.display.width - (constants.PIN_WIDTH * 5)) / 6;
  for (i = 0; i < this.pins.length; i++) {
    pin = this.pins[i];
    pin.x = this.position.display.x + pinDX + ((i % (this.pins.length / 2)) * (constants.PIN_WIDTH + pinDX));
    pin.y = i < 5 ? this.position.display.y - constants.PIN_HEIGHT : this.position.display.y + this.position.display.height;
    pin.cx = pin.x + (constants.PIN_WIDTH / 2);
    pin.cy = pin.y + (constants.PIN_HEIGHT / 2);
    pin.width = constants.PIN_WIDTH;
    pin.height = constants.PIN_HEIGHT;
    pin.labelSize = constants.PIC_FONT_SIZE;
    pin.label.x = pin.x + (constants.PIN_WIDTH / 2);
    pin.label.y = i < 5 ? this.position.display.y + (1.5 * constants.PIC_FONT_SIZE) : this.position.display.y + this.position.display.height - (0.75 * constants.PIC_FONT_SIZE);
    pin.label.anchor = 'middle';
  }
  
  // segments
  segmentWidth = this.position.display.width / 3;
  segmentHeight = this.position.display.width / 12;
  p = this.position.segments = {
    x: this.position.display.x + ((this.position.display.width - segmentWidth) / 2),
    y: this.position.display.y + ((this.position.display.height - (segmentWidth * 2)) / 2) - (segmentHeight / 2), // y is rotated to width = height
    segmentWidth: segmentWidth,
    segmentHeight: segmentHeight
  };
  
  endCapSize = segmentHeight / 2;
  pathCommands = [
    'M', p.x, ',', p.y + endCapSize, ' ',
    'L', p.x + endCapSize, ',', p.y, ' ',
    'L', p.x + segmentWidth - endCapSize, ',', p.y, ' ',
    'L', p.x + segmentWidth, ',', p.y + endCapSize, ' ',
    'L', p.x + segmentWidth - endCapSize, ',', p.y + segmentHeight, ' ',
    'L', p.x + endCapSize, ',', p.y + segmentHeight, ' ',
    'L', p.x, ',', p.y + endCapSize, ' '
  ].join('');
      
  for (i = 0; i < this.segments.length; i++) {
    segment = this.segments[i];
    segment.transform = ['translate(', segment.layout.x * segmentWidth, ',', segment.layout.y * segmentWidth, ')'].join('');
    if (segment.layout.rotation) {
      segment.transform = [segment.transform, ' rotate(', segment.layout.rotation, ' ', this.position.segments.x, ' ', this.position.segments.y + (segmentHeight / 2), ')'].join('');
    }
    segment.pathCommands = pathCommands;
  }
  
  this.decimalPoint.cx = this.position.segments.x + segmentWidth + segmentHeight + endCapSize;
  this.decimalPoint.cy = this.position.segments.y + (2 * segmentWidth) + endCapSize;
  this.decimalPoint.radius = endCapSize;
};
LED.prototype.reset = function () {
  // nothing to do for LED
};
LED.prototype.resolveOutputValues = function () {
  // nothing to do for LED
};

PIC = function (options) {
  var i, pin, notConnectable;
  
  this.view = PICView;
  this.board = options.board;
  
  this.pins = [];
  this.pinMap = {};
  for (i = 0; i < 18; i++) {
    notConnectable = [3, 4, 11, 12, 13].indexOf(i) !== -1;
    
    pin = {
      number: i,
      inputMode: !notConnectable,
      placement: i < 9 ? 'left' : 'right',
      x: 0,
      y: 0,
      height: 0,
      width: 0,
      labelSize: 0,
      component: this,
      notConnectable: notConnectable
    };
    pin.label = {
      x: 0,
      y: 0,
      anchor: 'end',
      text: ['RA2', 'RA3', 'RA4', 'MCL', 'GND', 'RB0', 'RB1', 'RB2', 'RB3', 'RA1', 'RA0', 'XTAL', 'XTAL', 'VCC', 'RB7', 'RB6', 'RB5', 'RB4'][i]
    };
    pin = new Pin(pin);
    this.pins.push(pin);
    this.pinMap[pin.label.text] = pin;
  }
  
  // in reverse order so we can scan it quickly in the getter/setter
  this.portAPins = [this.pinMap.RA0, this.pinMap.RA1, this.pinMap.RA2, this.pinMap.RA3, this.pinMap.RA4];
  this.portBPins = [this.pinMap.RB0, this.pinMap.RB1, this.pinMap.RB2, this.pinMap.RB3, this.pinMap.RB4, this.pinMap.RB5, this.pinMap.RB6, this.pinMap.RB7];
    
  this.ip = 0;
  this.code = options.code;
  this.emulator = options.code.js(this);
};
PIC.prototype.reset = function () {
  this.ip = 0;
  this.trisPortA(0xff);
  this.trisPortB(0xff);
  this.emulator.start();
};
PIC.prototype.calculatePosition = function (selected, index, count) {
  var constants = selectedConstants(selected),
      chipWidth, pinDY, i, j, pin, pinNumber;

  this.position = calculateComponentRect(selected, index, count);

  chipWidth = this.position.width / 2;

  this.position.chip = {
    x: this.position.x + (chipWidth / 2),
    y: this.position.y,
    width: chipWidth,
    height: this.position.height
  };

  pinDY = (this.position.chip.height - (constants.PIN_WIDTH * 9)) / 10;
  
  for (i = 0; i < 2; i++) {
    for (j = 0; j < 9; j++) {
      pinNumber = (i * 9) + j;
      pin = this.pins[pinNumber];
      pin.x = (this.position.chip.x - constants.PIN_WIDTH) + (i * (this.position.chip.width + constants.PIN_WIDTH));
      pin.y = this.position.chip.y + pinDY + (j * (constants.PIN_HEIGHT + pinDY));
      pin.cx = pin.x + (constants.PIN_WIDTH / 2);
      pin.cy = pin.y + (constants.PIN_HEIGHT / 2);
      pin.width = constants.PIN_WIDTH;
      pin.height = constants.PIN_HEIGHT;
      pin.labelSize = constants.PIC_FONT_SIZE;
      pin.label.x = pin.x + ((i ? -0.5 : 1.5) * constants.PIN_WIDTH);
      pin.label.y = pin.y + ((constants.PIN_HEIGHT + pin.labelSize) / 2.25);
      pin.label.anchor = i ? 'end' : 'start';
    }
  }
};
PIC.prototype.resolveOutputValues = function () {
  // nothing to do here for the pic
};
PIC.prototype.evaluateCurrentPICInstruction = function () {
  var restartLoop = false;
  if (this.ip < this.emulator.loop.length) {
    restartLoop = this.emulator.loop[this.ip]();
  }
  this.ip = restartLoop ? 0 : (this.ip + 1) % this.emulator.loop.length;
  return restartLoop;
};
PIC.prototype.evaluateRemainingPICInstructions = function () {
  var restartLoop = false;
  while (!restartLoop && (this.ip < this.emulator.loop.length)) {
    restartLoop = this.emulator.loop[this.ip]();
    this.ip++;
  }
  this.ip = 0;
};
PIC.prototype.trisPortA = function (mask) {
  this.setPinListInputMode(this.portAPins, mask);
};
PIC.prototype.trisPortB = function (mask) {
  this.setPinListInputMode(this.portBPins, mask);
};
PIC.prototype.getPortA = function () {
  return this.getPinListValue(this.portAPins);
};
PIC.prototype.getPortB = function () {
  return this.getPinListValue(this.portBPins);
};
PIC.prototype.setPortA = function (value) {
  this.setPinListValue(this.portAPins, value);
};
PIC.prototype.setPortB = function (value) {
  this.setPinListValue(this.portBPins, value);
};
PIC.prototype.getPinListValue = function (list) {
  var value = 0,
      i;
  
  // each get causes the board to resolve so that we have the most current value
  this.board.resolveComponentOutputValues();
  
  for (i = 0; i < list.length; i++) {
    value = value | ((list[i].inputMode && list[i].value ? 1 : 0) << i);
  }
  return value;
};
PIC.prototype.setPinListValue = function (list, value) {
  var i;
  for (i = 0; i < list.length; i++) {
    list[i].value = !list[i].inputMode && (value & (1 << i)) ? 1 : 0;
  }
  // each set causes the circuit to be resolved
  this.board.resolveIOValues();
};
PIC.prototype.setPinListInputMode = function (list, mask) {
  var i;
  for (i = 0; i < list.length; i++) {
    list[i].inputMode = !!(mask & (1 << i));
  }
  this.board.resolveIOValues();
};

Board = function (options) {
  var i, j;
  
  this.number = options.number;
  this.components = options.components;
  this.connectors = options.connectors;
  this.bezierReflectionModifier = options.bezierReflectionModifier;
  this.wires = [];
  this.circuits = [];
  
  this.pinsAndHoles = [];
  this.componentList = [];

  this.numComponents = 0;
  for (var name in this.components) {
    if (this.components.hasOwnProperty(name)) {
      this.componentList.push(this.components[name]);
      this.numComponents++;
      for (i = 0; i < this.components[name].pins.length; i++) {
        this.pinsAndHoles.push(this.components[name].pins[i]);
      }
    }
  }
  for (i = 0; i < this.connectors.length; i++) {
    for (j = 0; j < this.connectors[i].holes.length; i++) {
      this.pinsAndHoles.push(this.connectors[i].holes[j]);
    }
  }

  // link the pic to the board and reset it so the pin output is set
  this.components.pic.board = this;
  this.components.pic.reset();  
};
Board.prototype.clear = function () {
  this.wires = [];
  this.circuits = [];
  this.reset();
};
Board.prototype.reset = function () {
  var i;
  for (i = 0; i < this.pinsAndHoles.length; i++) {
    this.pinsAndHoles[i].value = 0;
    this.pinsAndHoles[i].connected = false;
  }
  for (i = 0; i < this.componentList.length; i++) {
    this.componentList[i].reset();
  }
};
Board.prototype.removeWire = function (sourceOrDest) {
  var i;
 
  for (i = 0; i < this.wires.length; i++) {
    if (this.wires[i].connectsTo(sourceOrDest)) {
      if (this.wires[i].source.inputMode) {
        this.wires[i].source.value = 0;
      }
      this.wires[i].source.connected = false;
      if (this.wires[i].dest.inputMode) {
        this.wires[i].dest.value = 0;
      }
      this.wires[i].dest.connected = false;
      this.wires.splice(i, 1);
      this.resolveCircuits();
      return true;
    }
  }
  return false;
};
Board.prototype.addWire = function (source, dest, color) {
  if (!source || !dest) {
    return false;
  }
  /*
  if ((source.connector && dest.connector) && (source.connector === dest.connector)) {
    alert("Sorry, you can't wire connectors to themselves.");
    return false;
  }
  if (source.component === dest.component) {
    alert("Sorry, you can't wire a component's pin to the same component.");
    return false;
  }
  */
  if (source.notConnectable || dest.notConnectable) {
    alert("Sorry, you can't add a wire to the " + (source.notConnectable ? source.label.text : dest.label.text) + ' pin.  It is already connected to a breadboard component.');
    return false;
  }
  
  this.removeWire(source);
  this.removeWire(dest);
  this.wires.push(new Wire({
    source: source,
    dest: dest,
    color: color
  }));
  if (!this.resolveCircuits()) {
    this.wires.pop();
    return false;
  }
  source.connected = true;
  dest.connected = true;
  return true;
};
Board.prototype.resolveCircuits = function() {
  var newCircuits;

  if (this.wires.length === 0) {
    this.circuits = [];
    return true;
  }
  
  newCircuits = Circuit.ResolveWires(this.wires);
  if (newCircuits) {
    this.circuits = newCircuits;
    return true;
  }
  
  return false;
};
Board.prototype.resolveCircuitInputValues = function () {
  var i;
  for (i = 0; i < this.circuits.length; i++) {
    this.circuits[i].resolveInputValues();
  }  
};
Board.prototype.resolveComponentOutputValues = function () {
  var i;
  for (i = 0; i < this.componentList.length; i++) {
    this.componentList[i].resolveOutputValues();
  }
};
Board.prototype.resolveIOValues = function () {
  // first resolve the input into the components, then the component values and finally the output of the components
  this.resolveCircuitInputValues();
  this.resolveComponentOutputValues();
  this.resolveCircuitInputValues();
};

KeypadView = createComponent({
  displayName: 'KeypadView',
  
  componentWillMount: function () {
    this.props.component.addListener(this.keypadChanged);
  },
  
  componentWillUnmount: function () {
    this.props.component.removeListener(this.keypadChanged);
  },
  
  keypadChanged: function (keypad) {
    this.setState({pushedButton: keypad.pushedButton});
  },
  
  getInitialState: function () {
    return {
      pushedButton: this.props.component.pushedButton
    };
  },
  
  pushButton: function (button) {
    this.props.component.pushButton(button);
    this.setState({pushedButton: this.props.component.pushedButton});
  },

  render: function () {
    var p = this.props.component.position,
        pins = [],
        buttons = [],
        i, pin, button;
    
    for (i = 0; i < this.props.component.pins.length; i++) {
      pin = this.props.component.pins[i];
      pins.push(PinView({key: 'pin' + i, pin: pin, selected: this.props.selected, stepping: this.props.stepping, showDebugPins: this.props.showDebugPins, drawConnection: this.props.drawConnection, reportHover: this.props.reportHover}));
      pins.push(text({key: 'label' + i, x: pin.label.x, y: pin.label.y, fontSize: pin.labelSize, fill: '#333', style: {textAnchor: pin.label.anchor}}, pin.label.text));
    }

    for (i = 0; i < this.props.component.buttons.length; i++) {
      button = this.props.component.buttons[i];
      buttons.push(ButtonView({key: i, button: button, selected: this.props.selected, pushed: button === this.state.pushedButton, pushButton: this.pushButton}));
    }

    return g({},
      rect({x: p.pad.x, y: p.pad.y, width: p.pad.width, height: p.pad.height, fill: '#333'}),
      pins,
      buttons
    );
  }
});

LEDView = createComponent({
  displayName: 'LEDView',
  
  render: function () {
    var constants = selectedConstants(this.props.selected),
        p = this.props.component.position,
        decimalPoint = this.props.component.decimalPoint,
        pins = [],
        pin,
        segments = [],
        segment,
        i, ccComponents, cc1Pin, cc2Pin;

    for (i = 0; i < this.props.component.pins.length; i++) {
      pin = this.props.component.pins[i];
      pins.push(PinView({key: 'pin' + i, pin: pin, selected: this.props.selected, stepping: this.props.stepping, showDebugPins: this.props.showDebugPins, drawConnection: this.props.drawConnection, reportHover: this.props.reportHover}));
      pins.push(text({key: 'label' + i, x: pin.label.x, y: pin.label.y, fontSize: pin.labelSize, fill: '#fff', style: {textAnchor: pin.label.anchor}}, pin.label.text));
    }

    for (i = 0; i < this.props.component.segments.length; i++) {
      segment = this.props.component.segments[i];
      segments.push(path({key: 'segment' + i, d: segment.pathCommands, fill: segment.pin.connected && !segment.pin.value ? '#ccff00' : UNSELECTED_FILL, transform: segment.transform}));
    }
    
    cc1Pin = this.props.component.pins[2];
    cc2Pin = this.props.component.pins[7];
    ccComponents = g({},
      line({x1: cc1Pin.x + (cc1Pin.width / 2), y1: cc1Pin.y, x2: cc1Pin.x + (cc1Pin.width / 2), y2: cc1Pin.y - (3 * cc1Pin.width), strokeWidth: constants.WIRE_WIDTH, stroke: '#333'}),
      line({x1: cc2Pin.x + (cc1Pin.width / 2), y1: cc2Pin.y + cc2Pin.height, x2: cc2Pin.x + (cc1Pin.width / 2), y2: cc2Pin.y + cc2Pin.height + (3 * cc2Pin.width), strokeWidth: constants.WIRE_WIDTH, stroke: '#333'})
    );

    return g({},
      rect({x: p.display.x, y: p.display.y, width: p.display.width, height: p.display.height, fill: '#333'}),
      pins,
      segments,
      circle({cx: decimalPoint.cx, cy: decimalPoint.cy, r: decimalPoint.radius, fill: this.props.component.pinMap.DP.connected && !this.props.component.pinMap.DP.value ? '#ccff00' : UNSELECTED_FILL}),
      ccComponents
    );
  }
});

ButtonView = createComponent({
  displayName: 'ButtonView',
  
  onClick: function (e) {
    e.preventDefault();
    e.stopPropagation();
    this.props.pushButton(this.props.button);
  },

  render: function () {
    // TODO: allowing keypad clicks in global view for demo
    var onClick = this.onClick; // this.props.selected ? this.onClick : null
    return g({onClick: onClick, style: {cursor: 'pointer'}},
      rect({x: this.props.button.x, y: this.props.button.y, width: this.props.button.width, height: this.props.button.height, fill: this.props.pushed ? SELECTED_FILL : UNSELECTED_FILL}),
      text({x: this.props.button.label.x, y: this.props.button.label.y, fontSize: this.props.button.labelSize, fill: '#fff', style: {textAnchor: this.props.button.label.anchor}}, this.props.button.label.text)
    );
  }
});

PinView = createComponent({
  displayName: 'PinView',

  mouseOver: function () {
    this.props.reportHover(this.props.pin);
  },

  mouseOut: function () {
    this.props.reportHover(null);
  },

  startDrag: function (e) {
    this.props.drawConnection(this.props.pin, e, '#555');
  },

  render: function () {
    var pin = this.props.pin,
        showColors = this.props.stepping && this.props.showDebugPins && !pin.notConnectable,
        inputRect, outputRect;
        
    switch (pin.placement) {
      case 'top':
        inputRect = {x: pin.x, y: pin.y + (pin.height / 2), width: pin.width, height: pin.height / 2};
        outputRect = {x: pin.x, y: pin.y, width: pin.width, height: pin.height / 2};
        break;
      case 'bottom':
        inputRect = {x: pin.x, y: pin.y, width: pin.width, height: pin.height / 2};
        outputRect = {x: pin.x, y: pin.y + (pin.height / 2), width: pin.width, height: pin.height / 2};
        break;
      case 'right':
        inputRect = {x: pin.x, y: pin.y, width: pin.width / 2, height: pin.height};
        outputRect = {x: pin.x + (pin.width / 2), y: pin.y, width: pin.width / 2, height: pin.height};
        break;
      default:
        outputRect = {x: pin.x, y: pin.y, width: pin.width / 2, height: pin.height};
        inputRect = {x: pin.x + (pin.width / 2), y: pin.y, width: pin.width / 2, height: pin.height};
        break;
    }
        
    inputRect.fill = showColors && pin.inputMode && pin.connected ? (pin.value ? 'red' : 'green') : '#777';
    outputRect.fill = showColors && !pin.inputMode ? (pin.value ? 'red' : 'green') : '#777';
    
    return g({onMouseDown: this.props.selected ? this.startDrag : null, onMouseOver: this.props.selected ? this.mouseOver : null, onMouseOut: this.props.selected ? this.mouseOut : null},
      rect(inputRect),
      rect(outputRect)
    );
  }
});

PICView = createComponent({
  displayName: 'PICView',

  render: function () {
    var constants = selectedConstants(this.props.selected),
        p = this.props.component.position,
        pins = [],
        pin,
        i, groundComponents, mclComponents, xtalComponents,
        xtalLine;
        
    for (i = 0; i < this.props.component.pins.length; i++) {
      pin = this.props.component.pins[i];
      pins.push(PinView({key: 'pin' + i, pin: pin, selected: this.props.selected, stepping: this.props.stepping, showDebugPins: this.props.showDebugPins, drawConnection: this.props.drawConnection, reportHover: this.props.reportHover}));
      pins.push(text({key: 'label' + i, x: pin.label.x, y: pin.label.y, fontSize: pin.labelSize, fill: '#fff', style: {textAnchor: pin.label.anchor}}, pin.label.text));
    }

    pin = this.props.component.pinMap.GND;
    groundComponents = g({},
      line({x1: pin.x, y1: pin.y + (pin.height / 2), x2: pin.x - (3 * pin.width), y2: pin.y + (pin.height / 2), strokeWidth: constants.WIRE_WIDTH, stroke: '#333'})
    );
    
    pin = this.props.component.pinMap.MCL;
    mclComponents = g({},
      line({x1: pin.x, y1: pin.y + (pin.height / 2), x2: pin.x - (3 * pin.width), y2: pin.y + (pin.height / 2), strokeWidth: constants.WIRE_WIDTH, stroke: '#333'})
    );
    
    xtalLine = function (pin) {
      return line({x1: pin.x + pin.width, y1: pin.y + (pin.height / 2), x2: pin.x + pin.width + (3 * pin.width), y2: pin.y + (pin.height / 2), strokeWidth: constants.WIRE_WIDTH, stroke: '#333'});
    };
    
    pin = this.props.component.pinMap.XTAL;
    xtalComponents = g({},
      xtalLine(this.props.component.pins[11]),
      xtalLine(this.props.component.pins[12]),
      xtalLine(this.props.component.pins[13])
    );
    
    return g({},
      rect({x: p.chip.x, y: p.chip.y, width: p.chip.width, height: p.chip.height, fill: '#333'}),
      pins,
      groundComponents, 
      mclComponents, 
      xtalComponents
    );
  }
});

BoardView = createComponent({
  displayName: 'BoardView',

  toggleBoard: function () {
    this.props.toggleBoard(this.props.board);
  },

  getInitialState: function () {
    return {
      drawConnection: null,
      hoverSource: null,
      wires: this.props.board.wires
    };
  },

  reportHover: function (hoverSource) {
    this.setState({hoverSource: hoverSource});
  },
  
  drawConnection: function (source, e, color) {
    var $window = $(window),
        self = this,
        dx, dy, drag, stopDrag;

    e.preventDefault();
    
    dx = e.pageX - e.nativeEvent.offsetX;
    dy = e.pageY - e.nativeEvent.offsetY;

    // remove the existing wire
    if (this.props.board.removeWire(source)) {
      this.props.board.resolveCircuits();
      this.setState({wires: this.props.board.wires});
    }

    this.setState({
      drawConnection: {
        x1: source.cx,
        y1: source.cy,
        x2: source.cx,
        y2: source.cy,
        strokeWidth: selectedConstants(this.props.selected).WIRE_WIDTH,
        stroke: color,
        reflection: source.getBezierReflection() * this.props.board.bezierReflectionModifier
      }
    });

    drag = function (e) {
      e.preventDefault();
      self.state.drawConnection.x2 = e.pageX - dx;
      self.state.drawConnection.y2 = e.pageY - dy;
      self.setState({drawConnection: self.state.drawConnection});
    };

    stopDrag = function (e) {
      var dest = self.state.hoverSource;
      
      e.preventDefault();
      $window.off('mousemove', drag);
      $window.off('mouseup', stopDrag);
      self.setState({drawConnection: null});
      
      if (dest) {
        self.props.board.addWire(source, dest, (source.color || dest.color || color));
        self.setState({wires: self.props.board.wires});
      }
    };

    $window.on('mousemove', drag);
    $window.on('mouseup', stopDrag);
  },

  render: function () {
    var constants = selectedConstants(this.props.selected),
        style = {
          width: WORKSPACE_WIDTH,
          height: constants.BOARD_HEIGHT,
          position: 'relative'
        },
        connectors = [],
        components = [],
        wires = [],
        componentIndex = 0,
        closeButton = null,
        name, component, i, wire;

    // resolve input values
    this.props.board.resolveCircuitInputValues();
    
    // calculate the position so the wires can be updated
    if (this.props.board.connectors.input) {
      this.props.board.connectors.input.calculatePosition(this.props.selected);
      connectors.push(ConnectorView({key: 'input', connector: this.props.board.connectors.input, selected: this.props.selected, drawConnection: this.drawConnection, reportHover: this.reportHover}));
    }
    if (this.props.board.connectors.output) {
      this.props.board.connectors.output.calculatePosition(this.props.selected);
      connectors.push(ConnectorView({key: 'output', connector: this.props.board.connectors.output, selected: this.props.selected, drawConnection: this.drawConnection, reportHover: this.reportHover}));
    }

    for (name in this.props.board.components) {
      if (this.props.board.components.hasOwnProperty(name)) {
        component = this.props.board.components[name];
        component.calculatePosition(this.props.selected, componentIndex++, this.props.board.numComponents);
        components.push(component.view({key: name, component: component, selected: this.props.selected, stepping: this.props.stepping, showDebugPins: this.props.showDebugPins, drawConnection: this.drawConnection, reportHover: this.reportHover}));
      }
    }

    if (this.props.selected) {
      closeButton = g({onClick: this.toggleBoard},
        rect({x: style.width - 25, y: 5, width: 20, height: 20, fill: '#f00'}),
        line({x1: style.width - 20, y1: 10, x2: style.width - 10, y2: 20, strokeWidth: 2, stroke: '#fff'}),
        line({x1: style.width - 10, y1: 10, x2: style.width - 20, y2: 20, strokeWidth: 2, stroke: '#fff'})
      );
    }
    
    for (i = 0; i < this.props.board.wires.length; i++) {
      wire = this.props.board.wires[i];
      wires.push(path({key: i, d: getBezierPath({x1: wire.source.cx, y1: wire.source.cy, x2: wire.dest.cx, y2: wire.dest.cy, reflection: wire.getBezierReflection() * this.props.board.bezierReflectionModifier}), strokeWidth: constants.WIRE_WIDTH, stroke: wire.color, fill: 'none', style: {pointerEvents: 'none'}}));
    }
    
    //bezierPath = this.state.drawConnection ? getBezierPath(this.state.drawConnection) : null;

    return div({className: 'board', style: style, onClick: this.props.selected ? null : this.toggleBoard},
      span({className: 'board-user'}, 'Student ' + (this.props.board.number + 1)),
      svg({className: 'board-area'},
        closeButton,
        connectors,
        components,
        wires,
        //(bezierPath ? path({d: bezierPath, stroke: this.state.drawConnection.stroke, strokeWidth: this.state.drawConnection.strokeWidth, fill: 'none', style: {pointerEvents: 'none'}}) : null)
        (this.state.drawConnection ? line({x1: this.state.drawConnection.x1, x2: this.state.drawConnection.x2, y1: this.state.drawConnection.y1, y2: this.state.drawConnection.y2, stroke: this.state.drawConnection.stroke, strokeWidth: this.state.drawConnection.strokeWidth, fill: 'none', style: {pointerEvents: 'none'}}) : null)
      )
    );
  }
});

ConnectorHoleView = createComponent({
  displayName: 'ConnectorHoleView',

  mouseOver: function () {
    this.props.reportHover(this.props.hole);
  },

  mouseOut: function () {
    this.props.reportHover(null);
  },

  startDrag: function (e) {
    this.props.drawConnection(this.props.hole, e, this.props.hole.color);
  },

  render: function () {
    return g({},
      circle({cx: this.props.hole.cx, cy: this.props.hole.cy, r: this.props.hole.radius, fill: this.props.hole.color, onMouseDown: this.props.selected ? this.startDrag : null, onMouseOver: this.props.selected ? this.mouseOver : null, onMouseOut: this.props.selected ? this.mouseOut : null})
    );
  }
});

ConnectorView = createComponent({
  displayName: 'ConnectorView',

  render: function () {
    var position = this.props.connector.position,
        holes = [],
        hole, i;

    for (i = 0; i < this.props.connector.holes.length; i++) {
      hole = this.props.connector.holes[i];
      holes.push(ConnectorHoleView({key: i, connector: this.props.connector, hole: hole, selected: this.props.selected, drawConnection: this.props.drawConnection, reportHover: this.props.reportHover}));
    }

    return svg({},
      rect({x: position.x, y: position.y, width: position.width, height: position.height, fill: '#aaa'}),
      holes
    );
  }
});

RibbonView = createComponent({
  displayName: 'RibbonView',

  render: function () {
    var constants = selectedConstants(false),
        wires = [],
        hole, i;

    for (i = 0; i < this.props.connector.holes.length; i++) {
      hole = this.props.connector.holes[i];
      wires.push(line({key: i, x1: hole.cx, y1: 0, x2: hole.cx, y2: RIBBON_HEIGHT, strokeWidth: constants.WIRE_WIDTH, stroke: hole.color}));
    }
    return div({style: {height: RIBBON_HEIGHT}},
      svg({}, wires)
    );
  }
});

BoardEditorView = createComponent({
  displayName: 'BoardEditorView',

  render: function () {
    var constants = selectedConstants(true),
      style = {
        width: WORKSPACE_WIDTH,
        top: constants.BOARD_HEIGHT + 28
      };
      
    return div({className: 'pic-info'}, 
      div({className: 'pic-info-title'}, 'Code'),
      div({className: 'pic-info-code-wrapper', style: style}, 
        div({className: 'pic-info-code'}, this.props.board.components.pic.code.asm)
      )
    );
  }
});

WorkspaceView = createComponent({
  displayName: 'WorkspaceView',

  getInitialState: function () {
    return {
      selectedBoard: null
    };
  },

  toggleBoard: function (board) {
    this.setState({selectedBoard: board === this.state.selectedBoard ? null : board});
  },

  render: function () {
    if (this.state.selectedBoard) {
      return div({id: 'workspace'},
        BoardView({board: this.state.selectedBoard, selected: true, stepping: this.props.stepping, showDebugPins: this.props.showDebugPins, toggleBoard: this.toggleBoard}),
        BoardEditorView({board: this.state.selectedBoard})
      );
    }
    else {
      return div({id: 'workspace', style: {width: WORKSPACE_WIDTH}},
        BoardView({board: this.props.boards[0], stepping: this.props.stepping, showDebugPins: this.props.showDebugPins, toggleBoard: this.toggleBoard}),
        RibbonView({connector: this.props.boards[0].connectors.output}),
        BoardView({board: this.props.boards[1], stepping: this.props.stepping, showDebugPins: this.props.showDebugPins, toggleBoard: this.toggleBoard}),
        RibbonView({connector: this.props.boards[1].connectors.output}),
        BoardView({board: this.props.boards[2], stepping: this.props.stepping, showDebugPins: this.props.showDebugPins, toggleBoard: this.toggleBoard})
      );
    }
  }
});

SimulatorControlView = createComponent({
  displayName: 'SimulatorControlView',
  
  stop: function () {
    this.props.run(false);
  },

  run: function () {
    this.props.run(true);
  },

  step: function () {
    this.props.step();
  },

  reset: function () {
    this.props.reset();
  },

  render: function () {
    var controls = [];
    if (this.props.running) {
      controls.push(button({key: 'stop', onClick: this.stop}, 'Stop'));
    }
    else {
      controls.push(button({key: 'run', onClick: this.run}, 'Run'));
      controls.push(button({key: 'step', onClick: this.step}, 'Step'));
      controls.push(button({key: 'reset', onClick: this.reset}, 'Reset'));
    }
    
    return div({id: 'simulator-control'},
      div({id: 'simulator-control-title'}, 'Simulator - ' + (this.props.running ? 'Running' : 'NOT Running')),
      div({id: 'simulator-control-area'}, controls)
    );
  }
});

DemoControlView = createComponent({
  displayName: 'DemoControlView',
  
  toggleAllWires: function () {
    this.props.toggleAllWires();
  },

  toggleDebugPins: function () {
    this.props.toggleDebugPins();
  },

  render: function () {
    return div({id: 'demo-control'},
      div({id: 'demo-control-title'}, 'Demo Control'),
      div({id: 'demo-control-area'}, 
        button({onClick: this.toggleAllWires}, (this.props.addedAllWires ? '-' : '+') + ' Wires'),
        !this.props.running ? button({onClick: this.toggleDebugPins}, (this.props.showDebugPins ? '-' : '+') + ' Pin Colors') : null
      )
    );
  }
});

FakeSidebarView = createComponent({
  displayName: 'FakeSidebarView',

  render: function () {
    return div({id: 'sidebar'},
      div({id: 'sidebar-title'}, 'Chat Sidebar (TBD)')
    );
  }
});

AppView = createComponent({
  displayName: 'AppView',

  getInitialState: function () {
    var board0Output = new Connector({type: 'output', count: 4}),
        board1Input = new Connector({type: 'input', count: 4}),
        board1Output = new Connector({type: 'output', count: 4}),
        board2Input = new Connector({type: 'input', count: 4}),
        boards = [
          new Board({number: 0, bezierReflectionModifier: 1, components: {keypad: new Keypad(), pic: new PIC({code: picCode[0]})}, connectors: {output: board0Output}}),
          new Board({number: 1, bezierReflectionModifier: -0.5, components: {pic: new PIC({code: picCode[1]})}, connectors: {input: board1Input, output: board1Output}}),
          new Board({number: 2, bezierReflectionModifier: 0.75, components: {pic: new PIC({code: picCode[2]}), led: new LED()}, connectors: {input: board2Input}})
        ];
        
    board0Output.connectsTo = board1Input;
    board1Input.connectsTo = board0Output;
    board1Output.connectsTo = board2Input;
    board2Input.connectsTo = board1Output;
    
    board0Output.board = boards[0];
    board1Input.board = boards[1];
    board1Output.board = boards[1];
    board2Input.board = boards[2];
        
    return {
      boards: boards,
      running: false,
      showDebugPins: true,
      addedAllWires: false
    };
  },
  
  simulate: function (step) {
    var i, pic;
    
    if (this.state.running || step) {
      for (i = 0; i < this.state.boards.length; i++) {
        pic = this.state.boards[i].components.pic;
        if (step) {
          pic.evaluateCurrentPICInstruction();
        }
        else {
          pic.evaluateRemainingPICInstructions();
        }
      }
      this.setState({boards: this.state.boards});
    }
  },
  
  reset: function () {
    for (var i = 0; i < this.state.boards.length; i++) {
      this.state.boards[i].reset();
    }
    this.setState({boards: this.state.boards});
  },
  
  run: function (run) {
    clearInterval(this.simulatorInterval);
    if (run) {
      this.simulatorInterval = setInterval(this.simulate.bind(this), 100);
    }
    this.setState({running: run});
  },
  
  step: function () {
    this.simulate(true);
  },
  
  toggleAllWires: function () {
    var defaultColor = '#555',
        
        b0 = this.state.boards[0],
        b0Keypad = b0.components.keypad.pinMap,
        b0PIC = b0.components.pic.pinMap,
        b0o = b0.connectors.output.holes,
        
        b1 = this.state.boards[1],
        b1PIC = b1.components.pic.pinMap,
        b1o = b1.connectors.output.holes,
        b1i = b1.connectors.input.holes,
        
        b2 = this.state.boards[2],
        b2PIC = b2.components.pic.pinMap,
        b2LED = b2.components.led.pinMap,
        b2i = b2.connectors.input.holes,
        wire, boardWires, i, j;
        
    boardWires = [
      [
        {source: b0Keypad.COL0, dest: b0PIC.RB0, color: defaultColor},
        {source: b0Keypad.COL1, dest: b0PIC.RB1, color: defaultColor},
        {source: b0Keypad.COL2, dest: b0PIC.RB2, color: defaultColor},
        {source: b0Keypad.ROW0, dest: b0PIC.RB3, color: defaultColor},
        {source: b0Keypad.ROW1, dest: b0PIC.RB4, color: defaultColor},
        {source: b0Keypad.ROW2, dest: b0PIC.RB5, color: defaultColor},
        {source: b0Keypad.ROW3, dest: b0PIC.RB6, color: defaultColor},
        {source: b0PIC.RA0, dest: b0o[0], color: b0o[0].color},
        {source: b0PIC.RA1, dest: b0o[1], color: b0o[1].color},
        {source: b0PIC.RA2, dest: b0o[2], color: b0o[2].color},
        {source: b0PIC.RA3, dest: b0o[3], color: b0o[3].color}
      ],
      [
        {source: b1i[0], dest: b1PIC.RB0, color: b1i[0].color},
        {source: b1i[1], dest: b1PIC.RB1, color: b1i[1].color},
        {source: b1i[2], dest: b1PIC.RB2, color: b1i[2].color},
        {source: b1i[3], dest: b1PIC.RB3, color: b1i[3].color},
        {source: b1PIC.RA0, dest: b1o[0], color: b1o[0].color},
        {source: b1PIC.RA1, dest: b1o[1], color: b1o[1].color},
        {source: b1PIC.RA2, dest: b1o[2], color: b1o[2].color},
        {source: b1PIC.RA3, dest: b1o[3], color: b1o[3].color}
      ],
      [
        {source: b2i[0], dest: b2PIC.RA0, color: b2i[0].color},
        {source: b2i[1], dest: b2PIC.RA1, color: b2i[1].color},
        {source: b2i[2], dest: b2PIC.RA2, color: b2i[2].color},
        {source: b2i[3], dest: b2PIC.RA3, color: b2i[3].color},
        {source: b2PIC.RB0, dest: b2LED.a, color: defaultColor},
        {source: b2PIC.RB1, dest: b2LED.b, color: defaultColor},
        {source: b2PIC.RB2, dest: b2LED.c, color: defaultColor},
        {source: b2PIC.RB3, dest: b2LED.d, color: defaultColor},
        {source: b2PIC.RB4, dest: b2LED.e, color: defaultColor},
        {source: b2PIC.RB5, dest: b2LED.f, color: defaultColor},
        {source: b2PIC.RB6, dest: b2LED.g, color: defaultColor}
      ]
    ];
  
    for (i = 0; i < this.state.boards.length; i++) {
      this.state.boards[i].clear();
      if (!this.state.addedAllWires) {
        for (j = 0; j < boardWires[i].length; j++) {
          wire = boardWires[i][j];
          this.state.boards[i].addWire(wire.source, wire.dest, wire.color);
        }
      }
    }
    
    this.setState({boards: this.state.boards, addedAllWires: !this.state.addedAllWires});
  },
  
  toggleDebugPins: function () {
    this.setState({showDebugPins: !this.state.showDebugPins});
  },

  render: function () {
    return div({id: 'picapp'},
      WorkspaceView({boards: this.state.boards, stepping: !this.state.running, showDebugPins: this.state.showDebugPins}),
      SimulatorControlView({running: this.state.running, run: this.run, step: this.step, reset: this.reset}),
      DemoControlView({running: this.state.running, toggleAllWires: this.toggleAllWires, toggleDebugPins: this.toggleDebugPins, showDebugPins: this.state.showDebugPins, addedAllWires: this.state.addedAllWires}),
      FakeSidebarView({})
    );
  }
});

React.render(AppView({}), document.getElementById('content'));


},{"./data/pic-code":2}],2:[function(require,module,exports){
var code = [];
code.push({
  asm: [
      ";*************************************************************************************",
      ";	Lab Assignment: TT Board 1 ",
      ";	Program File Name: TT Circuit 1.asm",
      ";	Name:Al Koon  ",
      ";	Date:9/30/15  ",
      ";",
      ";   Software:	",
      ";   This program takes a key that is pressed on the keypad and ",
      ";   converts it to a 4 bit binary number RRCC Where RR is Row and CC is column ",
      ";",
      ";*************************************************************************************",
      "",
      ";======================= Configuration Register Programming =====================",
      ";This loading of the CONFIG register with the WDT turned off and the security",
      ";inactive.",
      "",
      " __CONFIG 0x3FFA	;0x3FFA hex = b'11 1111 1111 1010'",
      "",
      ";  Bits 13 - 4 Code Protect Bits, Bit 3 Power Up Timer, Bit 2 Watch Dog Timer,",
      ";  Bits 1 and 0 are Oscillator Select Bits",
      ";",
      ";=========================================================================",
      ";============================= Equates=====================================",
      "",
      "Keypr	equ	0x0c	;First DRAM location used as short term storage",
      "Col	equ	0x0d	;Second DRAM location used as short term storage",
      "Row  	equ 	0x0e    ;Third DRAM location used for short term storage",
      ";=========================================================================",
      ";  Information the assembler needs to create proper files and program output",
      "",
      "",
      "	title\"TT Circuit 1\" 	;Title of lab printed on History File",
      "	list p=16f84A		;Directive telling Assembler which PIC to use",
      "	#include <ETR261.h>	;Header file to make programming simpler",
      "",
      ";=========================================================================",
      "",
      "		org 00h		;starting address for the program in PRAM",
      "		goto Start	;skip over the interrupt address",
      "		org 04h		;starting address for the start of code",
      "		retfie		;return from interrupt to take care of an false interrupt",
      "",
      ";=========================================================================",
      "",
      "Start	movlw	0xf0		;setup PORTA",
      "		tris	PORTA",
      "		",
      "		movlw 	0x87		;setup PORTB",
      "		tris	PORTB",
      "		movlw	0x0F",
      "		movwf	PORTA",
      "again	movlw	0xf0		;scan row 1",
      "		movwf	Row",
      "		movwf	PORTB",
      "		call	KEY",
      "",
      "		movlw	0xe8		;scan row 2",
      "		movwf	Row",
      "		movwf	PORTB",
      "		call	KEY",
      "",
      "		movlw	0xd8		;scan row 3",
      "		movwf	Row",
      "		movwf	PORTB",
      "		call	KEY",
      "",
      "		movlw	0xb8		;scan row 4",
      "		movwf	Row",
      "		movwf	PORTB",
      "		call	KEY",
      "		goto	again",
      "",
      "KEY	",
      "		movlw 	0x06",
      "		movwf	Col",
      "		btfss	PORTB,0		;scan column 3",
      "		call 	KEYPRESS",
      "	",
      "		movlw 	0x05",
      "		movwf	Col",
      "		btfss	PORTB,1		;scan column 2",
      "		call 	KEYPRESS",
      "",
      "		movlw 	0x03",
      "		movwf	Col",
      "		btfss	PORTB,2		;scan column 1",
      "		call	KEYPRESS",
      "		return",
      "",
      "KEYPRESS	movf	Row,w",
      "		andlw	0xf8",
      "		iorwf	Col,w",
      "		movwf	Keypr",
      "		movf 	Keypr,w",
      "		sublw	0xf3",
      "		btfss	STATUS,Z",
      "		goto 	two",
      "		movlw	0x00",
      "		movwf	PORTA",
      "		return",
      "two		movf 	Keypr,w",
      "		sublw	0xf5",
      "		btfss	STATUS,Z",
      "		goto 	three",
      "		movlw	0x01",
      "		movwf	PORTA",
      "		return",
      "three		movf 	Keypr,w",
      "		sublw	0xf6",
      "		btfss	STATUS,Z",
      "		goto 	four",
      "		movlw	0x02",
      "		movwf	PORTA",
      "		return",
      "four		movf 	Keypr,w",
      "		sublw	0xeb",
      "		btfss	STATUS,Z",
      "		goto 	five",
      "		movlw	0x04",
      "		movwf	PORTA",
      "		return",
      "five		movf 	Keypr,w",
      "		sublw	0xed",
      "		btfss	STATUS,Z",
      "		goto 	six",
      "		movlw	0x05",
      "		movwf	PORTA",
      "		return",
      "six		movf 	Keypr,w",
      "		sublw	0xee",
      "		btfss	STATUS,Z",
      "		goto 	seven",
      "		movlw	0x06",
      "		movwf	PORTA",
      "		return",
      "seven		movf 	Keypr,w",
      "		sublw	0xdb",
      "		btfss	STATUS,Z",
      "		goto 	eight",
      "		movlw	0x08",
      "		movwf	PORTA",
      "		return",
      "eight		movf 	Keypr,w",
      "		sublw	0xdd",
      "		btfss	STATUS,Z",
      "		goto 	nine",
      "		movlw	0x09",
      "		movwf	PORTA",
      "		return",
      "nine		movf 	Keypr,w",
      "		sublw	0xde",
      "		btfss	STATUS,Z",
      "		goto	Asterisk",
      "		movlw	0x0A",
      "		movwf	PORTA",
      "		return",
      "Asterisk	movf 	Keypr,w",
      "		sublw	0xbe",
      "		btfss	STATUS,Z",
      "		goto	zero",
      "		movlw	0x0E",
      "		movwf	PORTA",
      "		return",
      "zero		movf 	Keypr,w",
      "		sublw	0xbd",
      "		btfss	STATUS,Z",
      "		goto	Pound",
      "		movlw	0x0D",
      "		movwf	PORTA",
      "		return",
      "Pound		movf 	Keypr,w",
      "		sublw	0xbb",
      "		btfss	STATUS,Z",
      "		return",
      "		movlw	0x0C",
      "		movwf	PORTA",
      "		return",
      "",
      "		end"
    ].join('\n'),
  js: function (pic) {
    var checkRow;
    
    checkRow = function (number) {
      return function () {
        var row = number << 2,
            input;
            
        pic.setPortB([0xf0, 0xe8, 0xd8, 0xb8][number]);
        input = pic.getPortB();
        
        if (input === 0x06) {
          pic.setPortA(row + 0x0);
        }
        if (input === 0x05) {
          pic.setPortA(row + 0x1);
        }
        if (input === 0x03) {
          pic.setPortA(row + 0x2);
        }
      };
    };
    
    return {
      start: function () {
        pic.trisPortA(0xf0);
        pic.trisPortB(0x87);
        pic.setPortA(0x0f);
      },
      loop: [checkRow(0), checkRow(1), checkRow(2), checkRow(3)]
    };
  }
});

code.push({
  asm: [
      ";*************************************************************************************",
      ";	Lab Assignment: TT Board 2 ",
      ";	Program File Name: TT Circuit 2.asm",
      ";	Name:Al Koon  ",
      ";	Date:9/30/15  ",
      ";",
      ";   Software:	",
      ";   This program takes row and column information from circuit 1 and converts that  ",
      ";   it to a BCD number representing the key pressed in circuit 1.",
      ";",
      ";*************************************************************************************",
      "",
      ";======================= Configuration Register Programming =====================",
      ";This loading of the CONFIG register with the WDT turned off and the security",
      ";inactive.",
      "",
      " __CONFIG 0x3FFA	;0x3FFA hex = b'11 1111 1111 1010'",
      "",
      ";  Bits 13 - 4 Code Protect Bits, Bit 3 Power Up Timer, Bit 2 Watch Dog Timer,",
      ";  Bits 1 and 0 are Oscillator Select Bits",
      ";",
      ";=========================================================================",
      ";============================= Equates=====================================",
      "",
      "Keypr	equ	0x0c	;First DRAM location used as short term storage",
      "",
      ";=========================================================================",
      ";  Information the assembler needs to create proper files and program output",
      "",
      "",
      "	title\"TT Circuit 2\" 		;Title of lab printed on History File",
      "	list p=16f84A			;Directive telling Assembler which PIC to use",
      "	#include <ETR261.h>		;Header file to make programming simpler",
      "",
      ";=========================================================================",
      "",
      "		org 00h		;starting address for the program in PRAM",
      "		goto Start	;skip over the interrupt address",
      "		org 04h		;starting address for the start of code",
      "		retfie		;return from interrupt to take care of an false interrupt",
      "",
      ";=========================================================================",
      "",
      "Start		movlw	0xf0		;setup PORTA bit0 -bit 4 outputs ",
      "		tris	PORTA",
      "		",
      "		movlw 	0xff		;setup PORTB all inputs",
      "		tris	PORTB",
      "		movlw	0x0F",
      "		movwf	PORTA",
      "",
      "again	movf 	PORTB,W",
      "		movwf	Keypr",
      "		call 	KEYPRESS",
      "		goto 	again",
      "",
      "KEYPRESS	",
      "		movf 	Keypr,w",
      "		sublw	0x00",
      "		btfss	STATUS,Z",
      "		goto 	two",
      "		movlw	0x01",
      "		movwf	PORTA",
      "		return",
      "two		movf 	Keypr,w",
      "		sublw	0x01",
      "		btfss	STATUS,Z",
      "		goto 	three",
      "		movlw	0x02",
      "		movwf	PORTA",
      "		return",
      "three		movf 	Keypr,w",
      "		sublw	0x02",
      "		btfss	STATUS,Z",
      "		goto 	four",
      "		movlw	0x03",
      "		movwf	PORTA",
      "		return",
      "four		movf 	Keypr,w",
      "		sublw	0x04",
      "		btfss	STATUS,Z",
      "		goto 	five",
      "		movlw	0x04",
      "		movwf	PORTA",
      "		return",
      "five		movf 	Keypr,w",
      "		sublw	0x05",
      "		btfss	STATUS,Z",
      "		goto 	six",
      "		movlw	0x05",
      "		movwf	PORTA",
      "		return",
      "six		movf 	Keypr,w",
      "		sublw	0x06",
      "		btfss	STATUS,Z",
      "		goto 	seven",
      "		movlw	0x06",
      "		movwf	PORTA",
      "		return",
      "seven		movf 	Keypr,w",
      "		sublw	0x08",
      "		btfss	STATUS,Z",
      "		goto 	eight",
      "		movlw	0x07",
      "		movwf	PORTA",
      "		return",
      "eight		movf 	Keypr,w",
      "		sublw	0x09",
      "		btfss	STATUS,Z",
      "		goto 	nine",
      "		movlw	0x08",
      "		movwf	PORTA",
      "		return",
      "nine		movf 	Keypr,w",
      "		sublw	0x0A",
      "		btfss	STATUS,Z",
      "		goto	Asterisk",
      "		movlw	0x09",
      "		movwf	PORTA",
      "		return",
      "Asterisk	movf 	Keypr,w",
      "		sublw	0x0E",
      "		btfss	STATUS,Z",
      "		goto	zero",
      "		movlw	0x0A",
      "		movwf	PORTA",
      "		return",
      "zero		movf 	Keypr,w",
      "		sublw	0x0F",
      "		btfss	STATUS,Z",
      "		goto	Blank",
      "		movlw	0x0F",
      "		movwf	PORTA",
      "		return",
      "Blank		movf 	Keypr,w",
      "		sublw	0x0D",
      "		btfss	STATUS,Z",
      "		goto	Pound",
      "		movlw	0x00",
      "		movwf	PORTA",
      "		return",
      "Pound		movf 	Keypr,w",
      "		sublw	0x0C",
      "		btfss	STATUS,Z",
      "		return",
      "		movlw	0x0F",
      "		movwf	PORTA",
      "		return",
      "",
      "",
      "		end"
    ].join('\n'),
  js: function (pic) {
    var inputMap, mapRowColToBCD;
    
    inputMap = {
      0: 1, 
      1: 2, 
      2: 3, 
      3: 0x0f, 
      4: 4, 
      5: 5, 
      6: 6, 
      7: 0x0f, 
      8: 7, 
      9: 8, 
      10: 9, 
      11: 0x0f, 
      12: 0xa, 
      13: 0, 
      14: 0x0f, 
      15: 0x0f 
    };

    mapRowColToBCD = function () {
      pic.setPortA(inputMap[pic.getPortB()]);
    };

    return {
      start: function () {
        pic.trisPortA(0xf0);
        pic.trisPortB(0xff);
        pic.setPortA(0x0f);
      },
      loop: [mapRowColToBCD]
    };
  }
});

code.push({
  asm: [
      ";*************************************************************************************",
      ";	Lab Assignment: TT Board 3 ",
      ";	Program File Name: TT Circuit 3",
      ";	Name:  Al Koon  ",
      ";	Date:  9/30/15",
      ";",
      ";   Software:	",
      ";   This program converts BCD to 7 segment information for a CA display",
      ";   ",
      ";",
      ";*************************************************************************************",
      "",
      ";======================= Configuration Register Programming =====================",
      ";This loading of the CONFIG register with the WDT turned off and the security",
      ";inactive.",
      "",
      " __CONFIG 0x3FFA	;0x3FFA hex = b'11 1111 1111 1010'",
      "",
      ";  Bits 13 - 4 Code Protect Bits, Bit 3 Power Up Timer, Bit 2 Watch Dog Timer,",
      ";  Bits 1 and 0 are Oscillator Select Bits",
      ";",
      ";=========================================================================",
      ";============================= Equates=====================================",
      "",
      "",
      ";=========================================================================",
      ";  Information the assembler needs to create proper files and program output",
      "",
      "",
      "	title\"TT Circuit 3\" 		;Title of lab printed on History File",
      "	list p=16f84A			;Directive telling Assembler which PIC to use",
      "	#include <ETR261.h>		;Header file to make programming simpler",
      "",
      ";=========================================================================",
      "",
      "			org 00h		;starting address for the program in PRAM",
      "			goto Start	;skip over the interrupt address",
      "			org 04h		;starting address for the start of code",
      "			retfie		;return from interrupt to take care of an false interrupt",
      "",
      ";=========================================================================",
      "",
      "Start			                	",
      "",
      ";============================= Configure Port B ==============================",
      "Start		movlw	0x80		;all bits as outputs but bit7",
      "		tris	PORTB",
      "		",
      "		movlw 	0xff		;setup PORTB all inputs",
      "		tris	PORTA",
      ";=========================================================================",
      "",
      "Main		movf 	PORTA,W",
      "		call 	table",
      "		movwf	PORTB",
      "		goto 	Main",
      "		                        ",
      "",
      "",
      "table		addwf	PCL",
      "		retlw	0xc0	;0",
      "		retlw	0xf9	;1",
      "		retlw	0xa4	;2",
      "		retlw	0xb0	;3",
      "		retlw	0x99	;4",
      "		retlw	0x92	;5",
      "		retlw	0x83	;6",
      "		retlw	0xf8	;7",
      "		retlw	0x80	;8",
      "		retlw	0x98	;9",
      "		retlw	0xbf	;blank",
      "		retlw	0xff	;blank",
      "		retlw	0xff	;blank",
      "		retlw	0xff	;blank",
      "		retlw	0xff	;blank",
      "		retlw	0xff	;blank",
      "		",
      "		end",
      ""
    ].join('\n'),
  js: function (pic) {
    var inputMap, mapBCDTo7SegmentDisplay;
    
    inputMap = {
      0: 0xc0, 
      1: 0xf9, 
      2: 0xa4, 
      3: 0xb0, 
      4: 0x99, 
      5: 0x92, 
      6: 0x83, 
      7: 0xf8, 
      8: 0x80, 
      9: 0x98, 
      10: 0xbf, 
      11: 0xff, 
      12: 0xff, 
      13: 0xff, 
      14: 0xff, 
      15: 0xff 
    };

    mapBCDTo7SegmentDisplay = function () {
      pic.setPortB(inputMap[pic.getPortA()]);
    };
    
    return {
      start: function () {
        pic.trisPortA(0xff);
        pic.trisPortB(0x80);
      },
      loop: [mapBCDTo7SegmentDisplay]
    };
  }
});

module.exports = code;


},{}]},{},[1]);
