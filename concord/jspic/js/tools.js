



// overwirtable addressed time delays
var TimeDelay = {
  _delays: $H(),
  
  set: function(details) {
    var data = TimeDelay._delays.get(details.id);
    if(!data)
      details._timerid = window.setTimeout('TimeDelay._do("'+details.id+'")',details.timeout);
    this._delays.set(details.id, details);
  },
  unset: function(id) {
    var data = TimeDelay._delays.get(details.id);
    if(data) {
      TimeDelay._delays.unset(id);
      window.clearTimeout(data._timerid);
    }
  },
  _do: function(id) {
    var data = TimeDelay._delays.get(id);
    if(data) {
      TimeDelay._delays.unset(id);
      data.func.apply(data.context,data.args);
    }
  }
};

// handle no console
if(!console) {
  var console = {
    info: function(){},
    warn: function(){},
    error: function(){},
    debug: function(){},
    profile: function(){},
    profileEnd: function(){},
  };
}

// basic cookie handling and caching
var Cookies = {
  initialize: function() {
    this._cookies = $H();
    var cookietext = document.cookie;
    if(!cookietext) return;
    var allcookies = cookietext.split("; ");
    for (var i=0; i < allcookies.length; i++) {
      var cookie = allcookies[i].split("=");
      this._cookies.set(unescape(cookie[0]), unescape(cookie[1]));
    }
  },

  get: function(key) {
    if(!this._cookies) this.initialize();
    return this._cookies.get(key);
  },

  set: function (key, value)
  {
    if(!this._cookies) this.initialize();
    this._cookies.set(key,value);
    var date = new Date();
    date.setYear(date.getYear()+1901);
    var cookie = escape(key) + "=" + escape(value) + "; expires=" + date.toUTCString(); 
    document.cookie = cookie; 
  },

  unset: function(key) {
    if(!this._cookies) this.initialize();
    this._cookies.unset(key);
    document.cookie = escape(key) + "=; expires=Fri, 31 Dec 1999 23:59:59 GMT;";
  }
};



// update a number with the bits specified
function B(binary, d) {
  var bit = 0x80;
  if (!d) d = 0x00;
  binary.split("").each(function(n){
     if (n == '0') d &= (~bit);
     if (n == '1') d |= (bit);
     bit = bit >>> 1;
  });
  return d;
}



// convert a asm style number representation to a number
function N(n) {
  if(n === undefined) return NaN;
  if(n == '') return NaN;

  if(typeof n == 'number') return n;

  n = n.toUpperCase();
  // lookup a constant in loaded IDE Chip of present
  if( (IDEInstance) && (IDEInstance.Chip) && (IDEInstance.Chip.Const) ) {
    var c = IDEInstance.Chip.Const.get(n);
    if(c != undefined) return c;
  }

  // lookup a define in loaded IDE source
  if( (IDEInstance) && (IDEInstance.Source) && (IDEInstance.Source.Const) ) {
    var c = IDEInstance.Source.Const.get(n);
    if(c != undefined) return c;
  }
  
  var m;
  // try .123 style decimal
  m = /^\.([0-9]+)$/i.exec(n);
  if(m) return parseInt(m[1]);

  // try d'123' style decimal
  m = /^d'([0-9]+)'$/i.exec(n);
  if(m) return parseInt(m[1]);

  // try h'2fe2' style hex
  m = /^h'([a-f0-9]+)'$/i.exec(n);
  if(m) return parseInt('0x'+m[1]);

  // try b'01010101' style binary
  m = /^b'([0-1]+)'$/i.exec(n);
  if(m) return B(m[1]);

  // try single character representation
  m = /^'(.)'$/i.exec(n);
  if(m) return ord(m[1]);

  // fall back to parsing the string as a stright binary or 0xFF stlye hex string
  return parseInt(n);
};

function tableRow(html) {
  var table = document.createElement('table');
  table.innerHTML ='<tbody><tr>'+html+'</tr></tbody>';
  return table.rows[0];
}


