


PIC = Class.create({

  initialize: function(ide) {
    this.IDE = ide;


    // init vars    
    this.MemorySize = 0;
    this.MemoryAreas = [];
    this.CodeSize = 0;
    this.StackSize = 0;
    
    this.Opcodes = {};
    this.Registers = $H();
    this.Const = $H();



    // run setup of overridden class
    this.setup();



    // make ram location to special register lookup table
    this.RegAddr = $H();
    this.Registers.each(function(r){
      r.value.A.each(function(a){
        this.RegAddr.set(a, r.key);
      }, this);
    }, this);



    // set up constants for file registers
    this.RegAddr.each(function(i){
      if(!this.Const.get(i.value))
        this.Const.set(i.value, i.key & 0xFF);
    }, this);

    // set up constants for bit names
    this.Registers.each(function(i){
      var bits = i.value.B;
      if(bits) {
        var bitnum = 7;
        bits.split(" ").each(function(b) {
          if(b != '-')
            this.Const.set(b, bitnum);
          bitnum--;
        }, this);
      }
    }, this);

    // create private data array if it doesnt already exist
    if(!this._Data) this._Data = $H();

    // create code array if it doesnt already exist
    if(!this._code) this.codeClear();



    // call reset
    this.reset();
  },


  // reset memory locations and registers
  reset: function() {

    this._W = 0x00;
    this.Stack = $A();
    this.StackPointer = 0;
    this.PC = 0x0000;
    this._NewPC = this.PC;
    this._Pipeline = [this.encode('NOP'), undefined];
    this._Instruction = [this.encode('NOP'), undefined];
  
  
    // reset ram addresses
    for (var i=0; i < this.MemoryAreas.length; i++) {
      var area = this.MemoryAreas[i];
      if(area[2] == undefined) {
        for(var a = area[0]; a <= area[1]; a++){
          this._Data.set(a, 0xFF);
        }
      }
    }
    
    // set up defaults for registers
    this.Registers.each(function(i){
      var defaults = i.value.D;
      if (defaults)
        this._Data.set(i.key, B(defaults, this._Data.get(i.key)));
      var handler = this[i.value.H];
      if((handler) && (handler.I))
      	handler.I.apply(this,[i.key]);
    }, this);
    
  },


  // called before the step is run to load the instruction into the CPU
  // Returns: the linenumber that this instruction was compiled from
  load: function() {
    if(this._NewPC != undefined){
      this.PC = this._NewPC;
      // flush pipeline (fill it with a NOP and keep the same sourcecode line)
      this._Pipeline = [ this.encode('NOP'), this._Instruction[1] ];
      this._NewPC = undefined;
    } else {
      this.PC++;
    }

    // limit to the code size and wrap round
    this._PC &= (this.CodeSize - 1);
    
    this._Instruction = this._Pipeline;
    this._Pipeline = this.codeWord(this.PC);

    this.IDE.setChanged('PCL');

    // return linenumber
    return this._Instruction[1];
  },


  // called to execute the current instruction
  // Returns: 0 if successfull
  step: function() {
    // return -3 if there is no instruction
    if(!this._Instruction)
      return -3;
    // decode instruction back to text and args
    var args = this.decode(this._Instruction[0]);
    if(!args){
      console.error('instruction 0x'+this._Instruction[0].toPaddedString(4,16)+' at line '+this._Instruction[1]+' not understood by CPU!');
      return -1;
    }
    var instr = args.shift();
    // get instruction function from _instructions hash
    var f = this._Instructions[instr]
    if(typeof f != 'function'){
      // this shouldn't happen because everything in the Instruction table should have a function here.
      console.error('instruction 0x'+this._Instruction[0].toPaddedString(4,16)+' translated to '+instr+' at line '+this._Instruction[1]+' not found on CPU!');
      return -2;
    }
    // debug print the instruction we are about to run
    if(1) {
      var a = 'Running '+instr;
      if(args[0] != undefined) a += ' 0x'+args[0].toPaddedString(3,16);
      if(args[1] != undefined) a += ', '+args[1];
      if(this._Instruction[1]) a += ' at line '+this._Instruction[1];
      console.debug(a);
    }
    
    // run instruction in the context of the PIC object
    return f.apply(this,args);
  },


  // encode instruction and args to hexcode
  // Returns: hexcode, or 0 on error
  encode: function(instr, arg1, arg2){
    instr = this.Opcodes[instr];
    if(!instr) return 0x0000;
    var opcode = instr[0];
    if(instr[2]) opcode |= (arg1 & instr[2]);
    if(instr[3]) opcode |= ((arg2 << 7) & instr[3]);
    return opcode;
  },

  // decode hexcode to instruction and args
  // Returns: instruction and args, or undefined on error
  decode: function(opcode){
    for (var asm in this.Opcodes) {
      var instr = this.Opcodes[asm];
      if(Object.isArray(instr) && ((opcode & instr[1]) == instr[0])) {
        if(instr[3]) return [asm,(opcode & instr[2]),(opcode & instr[3]) >>> instr[4]];
        if(instr[2]) return [asm,(opcode & instr[2])];
        return [asm];
      }
    }
    // unknown opcode
    return;
  },



  // Clear code array
  codeClear: function() {
    this._Code = $A();
  },

  // get or set code locaion
  codeWord: function(a,word,line) {
    a &= (this.CodeSize - 1);
    if(word != undefined) {
      this._Code[i] = [word,line];
    } else {
      if(this._Code[a] != undefined) return this._Code[a];
      return [0x3FFF,undefined];
    }
  },

  // set whole code
  setCode: function(code) {
    this._Code = code;
  },

  // get the name of a bit (or all bits) of a named register
  bitName: function(f,bit) {
    // get bit name for a given register
    var r = '';
    f = this.Registers.get(f);
    if((f) && (f.B)) {
      var bits = f.B.split(" ");
      // return the bit we asked for or all if no bit was asked for
      if(bit != undefined) return bits[7 - (bit & 0x7)];
      return bits;
    }
    if(bit != undefined) return bit;
    return ['7','6','5','4','3','2','1','0'];
  },




  // push the next instruction location onto the stack
  _stackPush: function() {
    this.StackPointer++;
    if(this.StackPointer > this.StackSize) this.StackPointer = 1;
    this.Stack[this.StackPointer] = this.PC + 1;
    IDE.setChanged('STACK');
  },


  // pop a value off the stack into the PC
  _stackPop: function() {
    this._NewPC = this.Stack[this.StackPointer];
    this.StackPointer--;
    if(this.StackPointer <= 0) this.StackPointer = 8;
    IDE.setChanged('STACK');
  },

  // lookup mapped location or special register from 9 bit address
  _decodeAddr: function(f) {

    // decode given memory address to correct location
    for (var i=0; i < this.MemoryAreas.length; i++) {
      var area = this.MemoryAreas[i];
      if((f >= area[0]) && (f <= area[1])) {
        if(area[2]) return f - (area[2] - area[0]);
        return f;
      }
    }

    // otherwise try to find the special register at the address.
    // this will return undefined if one is not found
    return this.RegAddr.get(f);
  },


  // internal direct set existing memory function
  _setMem: function(f,d) {
    var old = this._Data.get(f);
    if((d == undefined) || (old == undefined)) return 0;
    this._Data.set(f, d);
    if((d != old) && (this.IDE)) this.IDE.setChanged(f,d);
    return 1;
  },



  write: function(f, v) {
    // write 8 bit value to a 9 bit address, register, or W
    v = v & 0xFF;
    // W
    if (f == 'W') {
      var old = this._W;
      this._W = v;
      if((v != old) && (this.IDE)) this.IDE.setChanged(f,v);
      return 1;
    }
    // decode address
    if (typeof(f) == 'number')
      f = this._decodeAddr(f);
    // 9 bit RAM address
    if (typeof(f) == 'number')
      this._setMem(f, v);
    // register
    if (typeof(f) == 'string'){
      var handler = this[this.Registers.get(f).H];
      if(handler) {
        var func = handler.W;
        if(func) {
          if (func.apply(this[f,v])) return 1;
        }
        return this._setMem(f,v);
      }
    }
    // unknown register or no handler
    return 1;
  },

  read: function(f,nochange) {
    // read 8 bit value to a 9 bit address, register, or W
    // W
    if (f == 'W')
      return this._W;
    // decode address
    if (typeof(f) == 'number')
      f = this._decodeAddr(f);
    // 9 bit address
    if (typeof(f) == 'number')
      return this._Data.get(f) & 0xFF;
    // register
    if (typeof(f) == 'string'){
      var handler = this[this.Registers.get(f).H];
      if(handler) {
        if(handler.R) {
          var v = handler.R.apply(this,[f,nochange]);
          if (v != undefined) return v;
        }
        return this._Data.get(f) & 0xFF;          
      }
    }
    // unknown register or no handler
    return 0x00;
  },

  // directly get a bit in data location f, bypassing functions
  _getBit: function(f, b) {
    // get a bit from data location f
    if(typeof b == 'string')
      b = this.Const.get(b);
    b = 1 << (b & 0x7);
    var d = this._Data.get(f);
    return (d & b) ? 1 : 0;
  },

  // directly set a bit in data location f, bypassing functions
  _setBit: function(f, b, s) {
    if(typeof b == 'string')
      b = this.Const.get(b);
    b = 1 << (b & 0x7);
    var d = this._Data.get(f);
    if(d == undefined) return 0;
    if(s) {
      this._setMem(f, (d | b) & 0xFF);
    } else {
      this._setMem(f, (d & (~b)) & 0xFF);
    }
    return 1;
  },

  // directly set a bits in data location f, bypassing functions
  _setBits: function(f, bits) {
    var d = this._Data.get(f);
    if(d == undefined) return 0;
    for(var bit in bits) {
      var b = bit;
      if(typeof b == 'string')
        b = this.Const.get(b);
      b = 1 << (b & 0x7);
      if(bits[bit]) {
        d = d | b;
      } else {
        d = d & (~b);
      }
    }
    this._setMem(f, d & 0xFF);
    return 1;
  },





  _ignore: 0
});



