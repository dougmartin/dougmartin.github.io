(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// for this mockup I've put all components in one file

/*
  TODO:
  
  o Add eval function
    a. Resolve all wire input values
      o clear all wire input values
      o for each wire pin or hole (a,b)
        set b.input = a.output and a.input = b.output
    b. Resolve all component instantanous output values and display
    d. evaluate current PIC instruction and then increment IP
*/

var div = React.DOM.div,
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
    BoardEditorView, SimulatorControlView, Wire, Button, ButtonView, Segment;

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

Button = function (options) {
  this.value = options.value;
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
  this.connector = options.connector;
};

Pin = function (options) {
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
  this.inputValue = options.inputValue || 0;
  this.outputValue = options.outputValue || 0;
};
Pin.prototype.getBezierReflection = function () {
  return this.bezierReflection;
};

Hole = function (options) {
  this.index = options.index;
  this.cx = options.cx;
  this.cy = options.cy;
  this.radius = options.radius;
  this.color = options.color;
  this.connector = options.connector;
  this.inputValue = options.inputValue || 0;
  this.outputValue = options.outputValue || 0;
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
  var i, pin, button;
  
  this.view = KeypadView;
  
  this.pushedButton = null;
  
  this.pins = [];
  this.pinMap = {};
  for (i = 0; i < 7; i++) {
    pin = {
      number: i,
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
  
  this.buttons = [];
  for (i = 0; i < 12; i++) {
    button = {
      value: (i + 1),
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
      text: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'][i],
    };
    this.buttons.push(new Button(button));
  }
    
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
};
Keypad.prototype.toggleButton = function (button) {
  this.pushedButton = this.pushedButton === button ? null : button;
};
Keypad.prototype.resolveOutputValues = function () {
};

LED = function () {
  var i, pin, segmentLayoutMap, segment;
  
  this.view = LEDView;
  
  this.pins = [];
  this.pinMap = {};
  for (i = 0; i < 10; i++) {
    pin = {
      number: i,
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
      text: ['g', 'f', 'cc', 'a', 'b', 'e', 'd', 'cc', 'c', 'DP'][i]
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
    {x: 0, y: 1, rotation: 0},
    {x: 0, y: 0, rotation: 90}
  ];
  for (i = 0; i < 7; i++) {
    segment = {
      number: i,
      layout: segmentLayoutMap[i],
      component: this
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
LED.prototype.resolveOutputValues = function () {
};

PIC = function () {
  var i, pin;
  
  this.view = PICView;
  
  this.pins = [];
  this.pinMap = {};
  for (i = 0; i < 18; i++) {
    pin = {
      number: i,
      x: 0,
      y: 0,
      height: 0,
      width: 0,
      labelSize: 0,
      component: this,
      notConnectable: [3, 4, 11, 12, 13].indexOf(i) !== -1
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
};
PIC.prototype.evaluateCurrentPICInstruction = function () {
};
PIC.prototype.evaluateRemainingPICInstructions = function () {
};

Board = function (options) {
  this.number = options.number;
  this.components = options.components;
  this.connectors = options.connectors;
  this.bezierReflectionModifier = options.bezierReflectionModifier;
  this.wires = [];

  this.numComponents = 0;
  for (var name in this.components) {
    if (this.components.hasOwnProperty(name)) {
      this.numComponents++;
    }
  }
};
Board.prototype.removeWire = function (sourceOrDest) {
  var i;
 
  for (i = 0; i < this.wires.length; i++) {
    if (this.wires[i].connectsTo(sourceOrDest)) {
      this.wires.splice(i, 1);
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
  return true;
};
Board.prototype.simulate = function (step) {
  var name, i, j, wire, source, dest, findTerminal, component;
  
  // clear pin and hole input values
  for (name in this.components) {
    if (this.components.hasOwnProperty(name)) {
      for (i = 0; i < this.components[name].pins.length; i++) {
        this.components[name].pins[i].inputValue = 0;
      }
    }
  }
  for (i = 0; i < this.connectors.length; i++) {
    for (j = 0; j < this.connectors[i].holes.length; i++) {
      this.connectors[i].holes[j].inputValue = 0;
    }
  }
  
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
  
  // resolve component output values
  for (name in this.components) {
    if (this.components.hasOwnProperty(name)) {
      component = this.components[name];
      component.resolveOutputValues();
    }
  }
  
  if (step) {
    this.components.pic.evaluateCurrentPICInstruction();
  }
  else {
    this.components.pic.evaluateRemainingPICInstructions();
  }
    
  return true;
};

KeypadView = createComponent({
  displayName: 'KeypadView',
  
  getInitialState: function () {
    return {
      pushedButton: this.props.component.pushedButton
    };
  },
  
  toggleButton: function (button) {
    this.props.component.toggleButton(button);
    this.setState({pushedButton: this.props.component.pushedButton});
  },

  render: function () {
    var p = this.props.component.position,
        pins = [],
        buttons = [],
        i, pin, button;
    
    for (i = 0; i < this.props.component.pins.length; i++) {
      pin = this.props.component.pins[i];
      pins.push(PinView({key: 'pin' + i, pin: pin, selected: this.props.selected, drawConnection: this.props.drawConnection, reportHover: this.props.reportHover}));
      pins.push(text({key: 'label' + i, x: pin.label.x, y: pin.label.y, fontSize: pin.labelSize, fill: '#333', style: {textAnchor: pin.label.anchor}}, pin.label.text));
    }

    for (i = 0; i < this.props.component.buttons.length; i++) {
      button = this.props.component.buttons[i];
      buttons.push(ButtonView({key: i, button: button, selected: this.props.selected, pushed: button === this.state.pushedButton, toggleButton: this.toggleButton}));
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
  
  getInitialState: function () {
    return {
      poweredSegments: [],
      poweredDecimalPoint: false
    };
  },

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
      pins.push(PinView({key: 'pin' + i, pin: pin, selected: this.props.selected, drawConnection: this.props.drawConnection, reportHover: this.props.reportHover}));
      pins.push(text({key: 'label' + i, x: pin.label.x, y: pin.label.y, fontSize: pin.labelSize, fill: '#fff', style: {textAnchor: pin.label.anchor}}, pin.label.text));
    }

    for (i = 0; i < this.props.component.segments.length; i++) {
      segment = this.props.component.segments[i];
      segments.push(path({key: 'segment' + i, d: segment.pathCommands, fill: i < 3 ? '#ccff00' : UNSELECTED_FILL, transform: segment.transform}));
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
      circle({cx: decimalPoint.cx, cy: decimalPoint.cy, r: decimalPoint.radius, fill: this.state.poweredDecimalPoint ? '#ccff00' : UNSELECTED_FILL}),
      ccComponents
    );
  }
});

ButtonView = createComponent({
  displayName: 'ButtonView',
  
  onClick: function (e) {
    e.preventDefault();
    this.props.toggleButton(this.props.button);
  },

  render: function () {
    return g({onClick: this.props.selected ? this.onClick : null, style: {cursor: 'pointer'}},
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
    return rect({x: this.props.pin.x, y: this.props.pin.y, width: this.props.pin.width, height: this.props.pin.height, fill: '#777', onMouseDown: this.props.selected ? this.startDrag : null, onMouseOver: this.props.selected ? this.mouseOver : null, onMouseOut: this.props.selected ? this.mouseOut : null});
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
      pins.push(PinView({key: 'pin' + i, pin: pin, selected: this.props.selected, drawConnection: this.props.drawConnection, reportHover: this.props.reportHover}));
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
      xtalLine(this.props.component.pins[12])
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
        components.push(component.view({key: name, component: component, selected: this.props.selected, drawConnection: this.drawConnection, reportHover: this.reportHover}));
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
    return div({className: 'pic-info'}, 
      div({className: 'pic-info-title'}, 'PIC Editor (TBD)'),
      div({className: 'pic-info-code'}, [
        ';******************************************************************************',
        ';',
        '; Description: ',
        ';   This would be the description of the specific PIC\'s program',
        ';',
        ';******************************************************************************',
        ';',
        '; The code would follow...'
      ].join('\n'))
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
        BoardView({board: this.state.selectedBoard, selected: true, toggleBoard: this.toggleBoard}),
        BoardEditorView({board: this.state.selectedBoard})
      );
    }
    else {
      return div({id: 'workspace', style: {width: WORKSPACE_WIDTH}},
        BoardView({board: this.props.boards[0], toggleBoard: this.toggleBoard}),
        RibbonView({connector: this.props.boards[0].connectors.output}),
        BoardView({board: this.props.boards[1], toggleBoard: this.toggleBoard}),
        RibbonView({connector: this.props.boards[1].connectors.output}),
        BoardView({board: this.props.boards[2], toggleBoard: this.toggleBoard})
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
      div({id: 'simulator-control-title'}, 'Simulator Control'),
      div({id: 'simulator-control-area'}, controls)
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
          new Board({number: 0, bezierReflectionModifier: 1, components: {keypad: new Keypad(), pic: new PIC()}, connectors: {output: board0Output}}),
          new Board({number: 1, bezierReflectionModifier: -0.5, components: {pic: new PIC()}, connectors: {input: board1Input, output: board1Output}}),
          new Board({number: 2, bezierReflectionModifier: 0.75, components: {pic: new PIC(), led: new LED()}, connectors: {input: board2Input}})
        ];
        
    board0Output.connectsTo = board1Input;
    board0Output.board = boards[0];
    
    board1Input.connectsTo = board0Output;
    board1Input.board = boards[1];
    
    board1Output.connectsTo = board2Input;
    board1Output.board = boards[1];
    
    board2Input.connectsTo = board1Output;
    board2Input.board = boards[2];
        
    return {
      boards: boards,
      running: true
    };
  },
  
  componentDidMount: function () {
    //this.simulatorInterval = setInterval(this.simulate, 100);
  },
  
  simulate: function (step) {
    var i;
    
    return;
    
    if (this.state.running || step) {
      for (i = 0; i < this.state.boards.length; i++) {
        if (!this.state.boards[i].simulate(step)) {
          this.setState({running: false});
          break;
        }
      }
      this.setState({boards: this.state.boards});
    }
  },
  
  reset: function () {
    for (var i = 0; i < this.state.boards.length; i++) {
      this.state.boards[i].reset();
    }
  },
  
  run: function (running) {
    this.setState({running: running});
  },
  
  step: function () {
    this.simulate(true);
  },
  
  render: function () {
    return div({id: 'picapp'},
      WorkspaceView({boards: this.state.boards, running: this.state.running}),
      SimulatorControlView({running: this.state.running, run: this.run, step: this.step, reset: this.reset}),
      FakeSidebarView({})
    );
  }
});

React.render(AppView({}), document.getElementById('content'));


},{}]},{},[1]);
