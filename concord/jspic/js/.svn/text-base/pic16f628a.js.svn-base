

// PIC16F628a

var PIC16F628A = Class.create(PIC,{

  setup: function() {

    this.CodeSize = 0x800;
    this.StackSize = 0x8;
    this.MemorySize = 0x200;

    //[Start, End ,	RealStart]
    this.MemoryAreas = [
      [0x020, 0x06F],
      [0x070, 0x07F],
      [0x0A0, 0x0EF],
      [0x0F0, 0x0FF,	0x070],
      [0x120, 0x14F],
      [0x170, 0x17F,	0x070],
      [0x1F0, 0x1FF,	0x070]
    ];
    
    //NAME:	[OPCODE,MASK,ARG1,ARG2,RSHIFT]
    this.Opcodes = {
      RETURN:	[0x0008,0x3FFF],
      RETFIE:	[0x0009,0x3FFF],
      CLRWDT:	[0x0064,0x3FFF],
      SLEEP:	[0x0063,0x3FFF],

      CALL:	[0x2000,0x3800],
      GOTO:	[0x2800,0x3800],
    
      MOVLW:	[0x3000,0x3C00,0x00FF],
      RETLW:	[0x3400,0x3C00,0x00FF],
      IORLW:	[0x3800,0x3F00,0x00FF],
      ANDLW:	[0x3900,0x3F00,0x00FF],
      XORLW:	[0x3A00,0x3F00,0x00FF],
      SUBLW:	[0x3C00,0x3E00,0x00FF],
      ADDLW:	[0x3E00,0x3E00,0x00FF],
    
      MOVWF:	[0x0080,0x3F80,0x007F],
      CLRW:	[0x0100,0x3F80],
      CLRF:	[0x0180,0x3F80,0x007F],

      SUBWF:	[0x0200,0x3F00,0x007F,0x0080,7],
      DECF:	[0x0300,0x3F00,0x007F,0x0080,7],
      IORWF:	[0x0400,0x3F00,0x007F,0x0080,7],
      ANDWF:	[0x0500,0x3F00,0x007F,0x0080,7],
      XORWF:	[0x0600,0x3F00,0x007F,0x0080,7],
      ADDWF:	[0x0700,0x3F00,0x007F,0x0080,7],
      MOVWF:	[0x0800,0x3F00,0x007F,0x0080,7],
      COMF:	[0x0900,0x3F00,0x007F,0x0080,7],
      INCF:	[0x0A00,0x3F00,0x007F,0x0080,7],
      DECFSZ:	[0x0B00,0x3F00,0x007F,0x0080,7],
      RRF:	[0x0C00,0x3F00,0x007F,0x0080,7],
      RLF:	[0x0D00,0x3F00,0x007F,0x0080,7],
      SWAPF:	[0x0E00,0x3F00,0x007F,0x0080,7],
      INCFSZ:	[0x0F00,0x3F00,0x007F,0x0080,7],

      BCF:	[0x1000,0x3C00,0x007F,0x0380,7],
      BSF:	[0x1400,0x3C00,0x007F,0x0380,7],
      BTSC:	[0x1800,0x3C00,0x007F,0x0380,7],
      BTSS:	[0x1C00,0x3C00,0x007F,0x0380,7],

      NOP:	[0x0000,0x3F9F]
    };

    this.Registers = $H({
      STATUS:	{ H:'CPU',	A:[0x003,0x083,0x103,0x183],
      						D:'00011XXX',	B:'IRP RP1 RP0 TO PD Z DC C' },
      PORTA:	{ H:'Ports',	A:[0x005],
   			   			D:'XXXX0000',	B:'RA7 RA6 RA5 RA4 RA3 RA2 RA1 RA0' },
      PORTB:	{ H:'Ports',	A:[0x006,0X106],
      						D:'XXXXXXXX',	B:'RB7 RB6 RB5 RB4 RB3 RB2 RB1 RB0' },
      INDF:	{ H:'Memory',	A:[0x000,0x080,0x100,0x180] },
      FSR:	{ H:'Memory',	A:[0x004,0x084,0x104,0x184],
      						D:'XXXXXXXX' },
      PCL:	{ H:'CPU',	A:[0x002,0x082,0x102,0x182] },
      PCLATH:	{ H:'CPU',	A:[0x00A,0x08A,0x10A,0x18A],
      						D:'---00000' },
      TRISA:	{ H:'Ports',	A:[0x085],
      						D:'11111111',	B:'TRISA7 TRISA6 TRISA5 TRISA4 TRISA3 TRISA2 TRISA1 TRISA0' },
      TRISB:	{ H:'Ports',	A:[0x006,0x086,0x106,0x186],
      						D:'11111111',	B:'TRISB7 TRISB6 TRISB5 TRISB4 TRISB3 TRISB2 TRISB1 TRISB0' },
      CMCON:	{ H:'Ports',	A:[0x01F],	D:'00000000',	B:'C2OUT C1OUT C2INV C1INV CIS CM2 CM1 CM0' },
      VRCON:	{ H:'Ports',	A:[0x09F],	D:'000-0000',	B:'VREN VROE VRR - VR3 VR2 VR1 VR0' },
      PCON: 	{ H:'Ports',	A:[0x08E],	D:'----1-0X',	B:'- - - - OSCF - POR BOR' },
      INTCON:	{ H:'Ints',	A:[0x00B,0x08B,0x10B,0x18B],
			      			D:'0000000X',	B:'GIE PEIE T0IE INTE RBIE T0IF INTF RBIF' },
      PIR1:	{ H:'Ints',	A:[0x00C],	D:'0000-000',	B:'EEIF CMIF RCIF TXIF - CCP1IF TMR2IF TMR1IF' },
      PIE1:	{ H:'Ints',	A:[0x08C],	D:'0000-000',	B:'EEIE CMIE RCIE TXIE - CCP1IE TMR2IE TMR1IE' },

      OPTION:	{ H:'Timer',	A:[0x081,0x181],D:'11111111',	B:'RBPU INTEDG T0CS T0SE PSA PS2 PS1 PS0' },
      TMR0:	{ H:'Timer',	A:[0x001,0x101],D:'XXXXXXXX' },
      TMR1L:	{ H:'Timer',	A:[0x00E],	D:'XXXXXXXX' },
      TMR1H:	{ H:'Timer',	A:[0x00F],	D:'XXXXXXXX' },
      T1CON:	{ H:'Timer',	A:[0x010],	D:'--000000',	B:'- - T1CKPS1 T1CKPS0 T1OSCEN T1SYNC TMR1CS TMR1ON' },
      TMR2:	{ H:'Timer',	A:[0x011],	D:'00000000' },
      T2CON:	{ H:'Timer',	A:[0x012],	D:'-0000000',	B:'- OUTPS3 TOUTPS2 TOUTPS1 TOUTPS0 TMR2ON T2CKPS1 T2CKPS0' },
      PR2:	{ H:'Timer',	A:[0x092],	D:'11111111'},

      CCPR1L:	{ H:'None',	A:[0x015],	D:'XXXXXXXX' },
      CCPR1H:	{ H:'None',	A:[0x016],	D:'XXXXXXXX' },
      CCP1CON:	{ H:'None',	A:[0x017],	D:'--000000',	B:'- - CCP1X CCP1Y CCP1M3 CCP1M2 CCP1M1 CCP1M0' },
      TXREG:	{ H:'None',	A:[0x019],	D:'00000000' },
      RCREG:	{ H:'None',	A:[0x01A],	D:'00000000' },
      TXSTA:	{ H:'None',	A:[0x098],	D:'0000-010',	B:'CSRC TX9 TXEN SYNC - BRGH TRMT TX9D' },
      SPBRG:	{ H:'None',	A:[0x099],	D:'00000000' },

      EEDATA:	{ H:'None',	A:[0x09A],	D:'XXXXXXXX' },
      EEADR:	{ H:'None',	A:[0x09B],	D:'XXXXXXXX' },
      EECON1:	{ H:'None',	A:[0x09C],	D:'----X000',	B:'- - - - WRERR WREN WR RD' },
      EECON2:	{ H:'None',	A:[0x09D] },
    });

  },


  // chip specific instruction utilities
  
  // jump to a 11 location and use 2 bits from the PCLATH to make up the 13 bit address
  _jump: function(a) {
    this._NewPC = (a & (this.CodeSize - 1)) | ((this._Data.get('PCLATH') & 0x30) << 8);
  },

  // skip the next instruction by setting the next PC to 2 instructions ahead
  _skip: function() {
    this._NewPC = this.PC + 2;
  },

  // jump to the interupt location
  _interrupt: function(){
    this._stackPush();
    this._jump(0x0004);
  },

  // combine instruction's 7 bit address with bank bits from STATUS to form 9 bit address
  _rp: function(f) {
    return (f & 0x7F) | ((this._Data.get('STATUS') & 0x60) << 2);
  },

  
  _ignore: 0
});


// instructions
PIC16F628A.prototype._Instructions = {

  ADDWF: function(f,d) {
    f = this._rp(f);
    var v = this.Memory.read(f) + this._W;
    this.write(d?f:'W',v);
    this._setBits('STATUS',{Z: !(v & 0xFF), C: (v & 0x100), CD: (v & 0x10) });
  },
  ANDWF: function(f,d) {
    f = this._rp(f);
    var v = this.read(f) & this._W;
    this.write(d?f:'W',v);
    this._setBit('STATUS','Z', !(v & 0xFF));
  },
  CLRF: function(f) {
    f = this._rp(f);
    this.write(f,0x00);
    this._setBit('STATUS','Z', 1);
  },
  CLRW: function() {
    this._W = 0x00;
    this._setBit('STATUS','Z', 1);
  },
  COMF: function(f,d) {
    f = this._rp(f);
    var v = (~ this.read(f));
    this.write(d?f:'W',v);
    this._setBit('STATUS','Z', !(v & 0xFF));
  },
  DECF: function(f,d) {
    f = this._rp(f);
    var v = this.read(f) - 1;
    this.write(d?f:'W',v);
    this._setBit('STATUS','Z', !(v & 0xFF));
  },
  DECFSZ: function(f,d) {
    f = this._rp(f);
    var v = this.read(f) - 1;
    this.write(d?f:'W',v);
    var z = !(v & 0xFF)
    if(z) this._skip();
  },
  INCF: function(f,d) {
    f = this._rp(f);
    var v = this.read(f) + 1;
    this.write(d?f:'W',v);
    this._setBit('STATUS','Z', !(v & 0xFF));
  },
  INCFSZ: function(f,d) {
    f = this._rp(f);
    var v = this.read(f) + 1;
    this.write(d?f:'W',v);
    var z = !(v & 0xFF)
    if(z) this._skip();
  },
  IORWF: function(f,d) {
    f = this._rp(f);
    var v = this.read(f) | this._W;
    this.write(d?f:'W',v);
    this._setBit('STATUS','Z', !(v & 0xFF));
  },
  MOVF: function(f,d) {
    f = this._rp(f);
    var v = this.read(f);
    this.write((d)?f:'W',v);
    this._setBit('STATUS','Z', !(v & 0xFF));
  },
  MOVWF: function(f) { 
    f = this._rp(f);
    this.write(f,this._W);
  },
  RLF: function(f,d) {
    f = this._rp(f);
    var v = (this.read(f) << 1) | (this._getBit('STATUS','C')?0x01:0x00);
    this.write(d?f:'W',v);
    this._setBit('STATUS','C', v & 0x100);
  },
  RRF: function(f,d) {
    f = this._rp(f);
    var v = this.read(f);
    var c = v & 0x01;
    v = (v >>> 1) | (this._getBit('STATUS','C')?0x80:0x00);
    this.write(d?f:'W',v);
    this._setBit('STATUS','C', v & 0x100);
  },
  SUBWF: function(f,d) {
    f = this._rp(f);
    var v = this.read(f) - this._W;
    var c = (v >= 0)?1:0;
    this.write(d?f:'W',v);
    this._setBits('STATUS',{Z: !(v & 0xFF), C: c, CD: c });
  },
  SWAPF: function(f,d) {
    f = this._rp(f);
    var v = this.read(f);
    v = ((v & 0x0F) << 4) | ((v & 0xF0) >> 4);
    this.write(d?f:'W',v);
  },
  XORWF: function(f,d) {
    f = this._rp(f);
    var v = this.read(f) ^ this._W;
    this.write(d?f:'W',v);
    this._setBit('STATUS','Z', !(v & 0xFF));
  },

  BCF: function(f,b) {
    f = this._rp(f);
    b = 1 << (b & 0x7);
    var v = this.read(f);
    this.write(f, v & (~b));
  },
  BSF: function(f,b) {
    f = this._rp(f);
    b = 0x1 << (b & 0x7);
    var v = this.read(f);
    this.write(f, v | b);
  },
  BTFSC: function(f,b) {
    f = this._rp(f);
    b = 0x1 << (b & 0x7);
    var v = this.read(f);
    if(!(v & b)) this._skip();
  },
  BTFSS: function(f,b) {
    f = this._rp(f);
    b = 0x1 << (b & 0x7);
    var v = this.read(f);
    if(v &b ) this._skip();
  },

  MOVLW: function(l) {
    this.write('W',l);
  },
  ADDLW: function(l) {
    var v = this._W + (l & 0xFF);
    this.write('W',v);
    this._setBits('STATUS',{Z: !(v & 0xFF), C: (v & 0x100), CD: (v & 0x10) });
  },
  SUBLW: function(l) {
    var v = (l & 0xFF) - this._W;
    var c = (v >= 0)?1:0;
    this.write(d?f:'W',v);
    this._setBits('STATUS',{Z: !(v & 0xFF), C: c, CD: c });
  },
  ANDLW: function(l) {
    var v = this._W & l;
    this.write('W',v);
    this._setBit('STATUS','Z', !(v & 0xFF));
  },
  IORLW: function(l) {
    var v = this._W | l;
    this.write('W',v);
    this._setBit('STATUS','Z', !(v & 0xFF));
  },
  XORLW: function(l) {
    var v = this._W ^ l;
    this.write('W',v);
    this._setBit('STATUS','Z', !(v & 0xFF));
  },

  GOTO: function(a){
    this._jump(a);
  },
  CALL: function(a){
    this._stackPush();
    this._jump(a);
  },
  RETURN: function(){
    this._stackPop();
  },
  RETLW: function(l){
    this.write('W',l);
    this._stackPop();
  },
  RETFIE: function(){
    this._setBit('INTCON','GIE', 1);
    this._stackPop();
  },

  SLEEP: function(){
  },
  CLRWDT: function(){
  },

  NOP: function() {
  }

};


// CPU component
PIC16F628A.prototype.CPU = {
  R: function(f,dontchange) {
    if (f == 'PCL')
      return this.PC & 0xFF;
  },

  W: function(f,d) {
    if (f == 'STATUS')
      return this._setMem(f, (this._Data.get(f) & 0x18) | d);

    if (f == 'PCL') {
      this._NewPC = (d & 0xFF) | ((this._Data.get('PCLATH') & 0x1F) << 8);
      return 1
    }
    if (f == 'PCLATH')
      return this._setMem(f, d & 0x1F);
  },

  _ignore: 0
};


// ram, code, and special registers, as well as general memory handling functions 
PIC16F628A.prototype.Memory = {
  R: function(f,dontchange) {

    if (f == 'INDF') {
      var fsr = this._Data.get('FSR') | (this._getBit('STATUS','IRP') << 8);
      // avoid a loop if the FSR is set to the INDF
      if ((fsr & 0x07F) == 0) return 0x00;
      return this.read(fsr,dontchange);
    }

  },

  W: function(f,d) {

    if (f == 'INDF') {
      var fsr = this._Data.get(f) | (this._getBit('STATUS','IRP') << 8);
      // avoid a loop if the FSR is set to the INDF
      if ((fsr & 0x07F) == 0) return 1;
      this.write(fsr,d);
      return 1;
    }

  },
 
  _ignore: 0
};


PIC16F628A.prototype.Ports = {
  I: function(f) {
  },

  R: function(f,dontchange) {
    return 0;
  },

  W: function(f,d) {
  },

  _ignore: 0
};

PIC16F628A.prototype.Ints = {
  I: function(f) {
  },

  R: function(f,dontchange) {
    return 0;
  },

  W: function(f,d) {
  },

  _ignore: 0
};

PIC16F628A.prototype.Timer = {
  I: function(f) {
  },

  R: function(f,dontchange) {
    return 0;
  },

  W: function(f,d) {
  },

  _ignore: 0
};


PIC16F628A.prototype.None = {
  W: function(f,d) {
    console.warn("Wrote "+d+" to unimplimented register "+f);
    return 1;
  },

  _ignore: 0
};






