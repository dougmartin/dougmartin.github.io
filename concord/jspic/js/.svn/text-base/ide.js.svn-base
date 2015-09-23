
// constants used globally

// the main IDE application object
var IDE = Class.create({
  initialize: function() {
    document.body.innerHTML = '';

    this.resetChanged();

    this.Chip = new PIC16F628A(this);

    this.MDI = new MDI();
    this.Memory = new IDEMemoryWindow(this);
    this.Special = new IDESpecialWindow(this);
    this.Source = new IDESourceWindow(this);

    this.Toolbar = new IDEToolbar(this);

    this.RunSpeed = 1000;
    this.Running = false;

    this.reset();

    console.info("Initialized");
  },

  resetButton: function(event) {
    this.reset();
    return Event.stop(event);
  },
  
  reset: function() {
    // reset change list
    this.resetChanged();
    // reset the chip registers
    this.Chip.reset();
    // load next instruction and get the linenumber too
    var linenumber = this.Chip.load();
    this.Source.Editor.setHighlight(linenumber);
    // reset all memory and register displays
    this.Memory.reset();
    this.Special.reset();
  },

  update: function() {
    this.Memory.update();
    this.Special.update();
    this.resetChanged();
  },

  resetChanged: function() {
    this._OldChanged = this._Changed;
    if(!this._OldChanged) this._OldChanged = $H();
    this._Changed = $H();
  },

  setChanged: function(f,v) {
    this._Changed.set(f,v);
    this._OldChanged.unset(f);
  },

  stepButton: function(event) {
    window.setTimeout(this.step.bind(this),0);
    return Event.stop(event);
  },
  
  step: function(event) {
    this.Chip.step();
    var linenumber = this.Chip.load();
    this.Source.Editor.setHighlight(linenumber);
    this.update();
  },

  stepOverButton: function(event) {
    if(!this.Running) {
      this.Running = true;
      this.RunUntilStack = this.Chip.StackPointer;
      this.run();
    }
    return Event.stop(event);
  },
  
  stepOutButton: function(event) {
    if((!this.Running) && (this.Chip.StackPointer > 0)) {
      this.Running = true;
      this.RunUntilStack = this.Chip.StackPointer - 1;
      this.run();
    }
    return Event.stop(event);
  },
  
  runSpeed: function(value) {
    this.RunSpeed = Math.round(2000 - (value * 2000));
  },
  
  runButton: function(event) {
    if(!this.Running) {
      this.Running = true;
      this.run();
    }
    return Event.stop(event);
  },
  
  stopButton: function(event) {
    this.stop();
    return Event.stop(event);
  },

  stop: function(){
    this.Running = false;
    this.RunUntilStack = undefined;
    if(this.RunSpeed <= 750) this.update();
  },
  
  run: function(event) {
    if (!this.Running) return this.stop();
    
    this.Chip.step();
    var linenumber = this.Chip.load();
    this.Source.Editor.setHighlight(linenumber);
    if(this.RunSpeed > 750) this.update();

    if(this.Source.Breakpoints[linenumber]) return this.stop();
    if((this.RunUntilStack != undefined) && (this.Chip.StackPointer <= this.RunUntilStack))
      return this.stop();

    // run next step
    window.setTimeout(this.run.bind(this),this.RunSpeed);
  },

  _ignore: 0
});

var IDEToolbar = Class.create({
  initialize: function(ide) {
    this.IDE = ide;

    if(!this.Load)
      this.Load = new MDIButton(this.IDE.MDI,'Load','img/load.png',function(){},this);
    if(!this.Save)
      this.Save = new MDIButton(this.IDE.MDI,'Save','img/save.png',function(){},this);
    
    if(!this.Compile)
      this.Compile = new MDIButton(this.IDE.MDI,'Compile','img/compile.png',this.IDE.Source.compileButton,this.IDE.Source);
    if(!this.Reset)
      this.Reset = new MDIButton(this.IDE.MDI,'Reset','img/reset.png',this.IDE.resetButton,this.IDE);

    if(!this.Speed)
      this.Speed = new MDISlider(this.IDE.MDI,'Speed','Run speed',this.IDE.runSpeed,this.IDE);


    if(!this.Run)
      this.Run = new MDIButton(this.IDE.MDI,'Run','img/run.png',this.IDE.runButton,this.IDE);
    if(!this.Stop)
      this.Stop = new MDIButton(this.IDE.MDI,'Stop','img/stop.png',this.IDE.stopButton,this.IDE);
    if(!this.StepInto)
      this.StepInto = new MDIButton(this.IDE.MDI,'Step into','img/step.png',this.IDE.stepButton,this.IDE);
    if(!this.StepOver)
      this.StepOver = new MDIButton(this.IDE.MDI,'Step over','img/stepover.png',this.IDE.stepOverButton,this.IDE);
    if(!this.StepOut)
      this.StepOut = new MDIButton(this.IDE.MDI,'Step out','img/stepout.png',this.IDE.stepOutButton,this.IDE);
  },

  _ignore: 0
});

var IDEMemoryWindow = Class.create({
  initialize: function(ide) {
    this.IDE = ide;

    var mdiwindow = this.IDE.MDI.find('Memory');
    if(mdiwindow) mdiwindow.destroy();
    this.Window = new MDIWindow(this.IDE.MDI,'Memory','File Registers',750,155,250,300);
  },

  // build one row
  rowHTML: function(a,v) {
    var n = this.IDE.Chip.RegAddr.get(a);
    if(!n) n = this.IDE.Chip.Const.get(a);
//    if(!n) n = this.IDE.Source.Const.get(a);
    if(!n) n = '&nbsp;';

    if(v === undefined) v = this.IDE.Chip.read(a,1);

    var c = '&nbsp;';
    if( (v > 32) && (v < 127) )
      c = String.fromCharCode(v).escapeHTML();

    var html =
      '<td align="center">0x'+a.toPaddedString(4,16)+'</td>'+
      '<td align="center">'+n+'</td>'+
      '<td align="center">'+c+'</td>'+
      '<td align="right">'+v+'</td>'+
      '<td align="center">'+v.toPaddedString(2,16)+'</td>'+
      '<td align="center">'+v.toPaddedString(8,2)+'</td>';

    return html;
  },

  // rebuild whole table
  reset: function() {
    var len = this.IDE.Chip.MemorySize;

    var html =
      '<table class="Grid" border="1" cellspacing="0" cellpadding="1"><tbody id="MemoryGrid">'+
      '<tr>'+
      '<th width="30">Addr</th>'+
      '<th width="100%">Name</th>'+
      '<th width="20">Chr</th>'+
      '<th width="20">Dec</th>'+
      '<th width="20">Hex</th>'+
      '<th width="50">Bin</th>'+
      '</tr>';
    for(a = 0; a < len; a++){
      html += '<tr>'+this.rowHTML(a)+'</tr>';
    }
    html += '</tbody></table>';
    
    this.Window.ScrollDiv.innerHTML = html;

    this.Grid = $('MemoryGrid');
    this.Rows = [];
    for(a = 0; a < len; a++){
      this.Rows[a] = this.Grid.rows[a+1];
    }
  },

  // update all rows that have changed    
  update: function() {
    this.eachFileRegister(this.IDE._Changed, this.updateRow);
    this.eachFileRegister(this.IDE._OldChanged, this.unmarkRow);
  },

  // update each mapped row for this row
  eachFileRegister: function(h,f) {
    h.each(function(i){
      var a = i.key;
      var v = i.value;
      // directly if a memory address was specified
      if(typeof a == 'number') {
        f.apply(this,[a,v]);
      }
      // lookup all addresses for a given register name
      else if(typeof a == 'string') {
        a = this.IDE.Chip.Registers.get(a);
        if(a) a.A.each(function(aa){
          f.apply(this, [aa,v]);
        },this);
      }
    },this);
  },

  // update one row    
  updateRow: function(a,v) {
    var newrow = tableRow(this.rowHTML(a,v));
    newrow.style.backgroundColor = '#ccf';
    this.Grid.replaceChild(newrow,this.Rows[a]);
    this.Rows[a] = newrow;
  },

  unmarkRow: function(a) {
    this.Rows[a].style.backgroundColor = '';
  },

  _ignore: 0
});


var IDESpecialWindow = Class.create({
  initialize: function(ide) {
    this.IDE = ide;

    var mdiwindow = this.IDE.MDI.find('Special');
    if(mdiwindow) mdiwindow.destroy();
    this.Window = new MDIWindow(this.IDE.MDI,'Special','Special Registers',500,1,500,150);
  },

  // build one row
  rowHTML: function(a,v) {
    if(v === undefined) v = this.IDE.Chip.read(a,1);

    var c = '&nbsp;';
    if( (v > 32) && (v < 127) )
      c = String.fromCharCode(v).escapeHTML();
 
    var bitnames = this.IDE.Chip.bitName(a);
    var bits = v.toPaddedString(8,2).split("");

    var html =
      '<td align="center">'+a+'</td>'+
      '<td align="center">'+c+'</td>'+
      '<td align="right">'+v+'</td>'+
      '<td align="center">'+v.toPaddedString(2,16)+'</td>';

    for(var b=0; b<8; b++) {
      html += '<td align="center"';
      if(bits[b] == '1') html += ' style="background-color: #afa"';
      html += '>'+bitnames[b]+'</td>';
    }

    return html;
  },

  // build whole table
  reset: function() {
    var reg = ['W'].concat(this.IDE.Chip.Registers.keys());
    var len = reg.length;

    // build table
    var html = '<table class="Grid" border="1" cellspacing="0" cellpadding="1"><tbody id="SpecialGrid">';
    html += '<tr><th width="100%">Name</th><th>Chr</th><th>Dec</th><th>Hex</th><th colspan="8">Bits</th></tr>';
    for(i = 0; i < len; i++){
      var a = reg[i];
      html += '<tr>'+this.rowHTML(a)+'</tr>';
    }
    html += '</tbody></table>';
    
    // set the html of this table
    this.Window.ScrollDiv.innerHTML = html;

    // find row dom objects
    this.Grid = $('SpecialGrid');
    this.Rows = {};
    for(i = 0; i < len; i++){
      this.Rows[reg[i]] = this.Grid.rows[i+1];      
    }
  },

  // update all rows that have changed    
  update: function() {
    this.eachFileRegister(this.IDE._Changed, this.updateRow);
    this.eachFileRegister(this.IDE._OldChanged, this.unmarkRow);
  },

  // run this function for each register in the given hash
  eachFileRegister: function(h,f) {
    h.each(function(i){
      if(this.Rows[i.key])
        f.apply(this,[i.key,i.value]);
    },this);
  },

  // update one row    
  updateRow: function(a,v) {
    var newrow = tableRow(this.rowHTML(a,v));
    newrow.style.backgroundColor = '#ccf';
    this.Grid.replaceChild(newrow,this.Rows[a]);
    this.Rows[a] = newrow;
  },

  unmarkRow: function(a) {
    this.Rows[a].style.backgroundColor = '';
  },

  _ignore: 0
});



var IDESourceWindow = Class.create({
  initialize: function(ide) {
    this.IDE = ide;
    this.Const = $H();
    this.Breakpoints = {};

    var mdiwindow = this.IDE.MDI.find('Source');
    if(mdiwindow) mdiwindow.destroy();

    mdiwindow = new MDIWindow(this.IDE.MDI,'Source','Source Code',1,1,390,460);
    this.Editor = new Editor(mdiwindow.ScrollDiv);

    this.Editor.fromString("main:\taddlw 4\n\tmovwf PORTA\n\tgoto main\n");
  },
  
  compileButton: function(event) {
    var result = this.compile();
    if(result) console.error('Error compiling: '+result);
    this.IDE.reset();
    return Event.stop(event);
  },
  
  compile: function() {
    this.Const = $H();
    
    var pc = 0x0000;
    var mc = 0x000;

    var defines = {};
    var code = [];

    var reSpace = /[\s,]+/;
    var reComment = /;.*$/;
    //            1                 2           3
    var reEqu = /^([A-Z0-9_]+)\s+\.?(set|equ)\s+(.*?)\s*$/i;
    //                  1                2                                                                                 3   4
    var reDirective = /^([A-Z0-9_]*:?\s*)#?(_config|define|include|undefine|variable|constant|if|ifdef|ifndef|else|endif|end)(\s+(.*?))?\s*$/i;
    //              1                 2
    var reLabel = /^([A-Z0-9_]+)?:?\s+(.*)$/i;
    //                 1               2
    var reVariable = /^([A-Z0-9_]+)\s*=\s*([^\s]+)\s*$/i;
    //               1               2
    var reDefine = /^([A-Z0-9_]+)\s+(.*?)\s*$/i;



    // first pass
    var len = this.Editor.Lines.length;
    for(var linenum = 1; linenum < len; linenum++) {
      var line = this.Editor.Lines[linenum].Words;
      if(line) {
        var result;
        console.debug('line '+linenum+': text:"'+line+'"');

        // remove comments
        line = line.replace(reComment,'');

        // get equ constants
        result = reEqu.exec(line);
        if(result != undefined) {
          var value = N(result[3]);
          if(value === NaN) return "Unknown number "+result[3]+" at line "+linenum;
          this.Const.set(resultl[1].toUpperCase(),value);          
          line = '';
        }

        // work out directives
        result = reDirective.exec(line);
        if(result != undefined) {
          line = result[1];
          var directive = result[2];
          var args = result[4];
          if((directive == 'CONSTANT') || (directive == 'VARIABLE') ) {
            if(result = reVariable.exec(args)) {
              var value = N(result[2]);
              if(value === NaN) return "Unknown number "+result[2]+" at line "+linenum;
              this.Const.set(result[1].toUpperCase(),value);
            }
          }
          if(directive == 'DEFINE') {
            if(result = reDefine.exec(args)) {
              defined[result[1].toUpperCase()] = [new RegExp(result[1],"gi"),result[2]];
            }
          }
          if(directive == 'UNDEFINE') {
            if(result = reDefine.exec(args)) {
              delete defined[result[1].toUpperCase()];
            }
          }
          if(directive == 'ORG') {
            var newpc = N(args);
            if(newpc === NaN) return "Unknown number "+args+" at line "+linenum;
            pc = newpc;
          }
        }

        // save label location if there is one
        result = reLabel.exec(line);
        if(result != undefined) {
          if(result[1] != undefined){
            console.debug('line '+linenum+': label '+result[1]+' = '+pc);
            this.Const.set(result[1].toUpperCase(),pc);
          }
          line = result[2];
        }

        // work out instructions
        if(line != '') {
          // run define replaces
          for (var def in defines) {
            def = defined[def];
            line = line.replace(def[0],def[1]);
          }
          // insert macros
          
          // store code
          console.debug('line '+linenum+': pc:'+pc+' inst:"'+line+'"');
          var args = line.split(reSpace);
          if(args[0] != '') {
            code[pc] = [
              linenum,
              args[0].toUpperCase(),
              args[1],
              args[2]
            ];
            pc++;
          }
        }

      }
    }

    // second pass to fill in values for labels and variables
    var maxcode = code.length;
    for(var i = 0x00; i < maxcode; i++){
      if(code[i] != undefined){
        var instr = code[i];
        var linenum = instr[0];
        var arg1 = 0;
        var arg2 = 0;
        if(instr[2] != '') {
          arg1 = N(instr[2]);
          if(arg1 === undefined) return "Unknown argument "+instr[2]+" at line "+linenum;
        }
        if(instr[3] != '') {
          arg2 = N(instr[3]);
          if(arg2 === NaN) return "Unknown argument "+instr[3]+" at line "+linenum;
        }
        // work out instructions
        var opcode = this.IDE.Chip.encode(instr[1],arg1,arg2);
        if(opcode === NaN) return "Unknown instruction "+instr+" at line "+linenum;
        code[i] = [opcode,linenum];
        console.info("pc:"+i.toPaddedString(4,16)+" line:"+linenum+" opcode:"+opcode.toPaddedString(4,16));
      }
    }

    this.IDE.Chip.setCode(code);
  },

  _ignore: 0
});




// set event initialise application
Event.observe(window, 'load', function(){
  window.setTimeout(function(){ window.IDEInstance = new IDE(); },1000);
});


