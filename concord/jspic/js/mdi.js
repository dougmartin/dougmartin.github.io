

var MDI = Class.create({
  initialize: function() {
    this.Windows = $H();

    this.Toolbar = Builder.node('div',{'class': 'MDIToolbar'});

    this.Div = Builder.node('div',{'class': 'MDI'});
    this.CoverDiv = Builder.node('div',{'class': 'MDICover'});
    this.Div.appendChild(this.CoverDiv);
    this.FrameDiv = Builder.node('div',{'class': 'MDIFrame'});
    this.Div.appendChild(this.FrameDiv);
    this.FrameSizeDiv = Builder.node('div',{style: 'position: absolute; top: -20px'});
    this.FrameDiv.appendChild(this.FrameSizeDiv);

    document.body.appendChild(this.Toolbar);
    document.body.appendChild(this.Div);

  },
  
  register: function(win) {
    if(!this.Windows.get(win.WindowName)) {
      this.Windows.set(win.WindowName,win);
      this.Div.appendChild(win.Div);
    }
  },

  focus: function(win) {
    if(typeof win == 'string')
      win = this.Windows.get(win);
    if(!win) return; 
    if(this.Top == win) return;
    this.Windows.values().each(function(item){
      if(item == win) {
        item.TitleDiv.className = 'MDITitle MDITitleFocused';
        item.Div.style.zIndex = 100;
      } else {
        item.TitleDiv.className = 'MDITitle MDITitleBlurred';
        var i = item.Div.style.zIndex;
        i--;
        if(i < 50) i = 50;
        item.Div.style.zIndex = i;
      }
    },this);
    this.Top = win;
  },
  
  find: function(win) {
    if(typeof win == 'string')
      win = this.Windows.get(win);
    return win;
  },

  onMouseDown: function(event,type) {
    this.MouseType = type;
    this.MouseStart = {
      mx: Event.pointerX(event),
      my: Event.pointerY(event),
      x: this.Top.X,
      y: this.Top.Y,
      w: this.Top.W,
      h: this.Top.H,
    };
    Event.observe(this.CoverDiv, 'mousemove', this.onMouseMove.bind(this));
    Event.observe(this.CoverDiv, 'mouseup', this.onMouseUp.bind(this));
    Event.observe(this.CoverDiv, 'mouseout', this.onMouseUp.bind(this));
    this.CoverDiv.style.display = 'block';    
    this.onMouseMove(event);
    return Event.stop(event);
  },
  onMouseMove: function(event) {
    if(this.MouseType == 'size') {
      var w = Event.pointerX(event) - this.MouseStart.mx + this.MouseStart.w;
      var h = Event.pointerY(event) - this.MouseStart.my + this.MouseStart.h;
      this.Top.setPos(undefined,undefined,w,h);
      this.FrameSizeDiv.innerHTML = w+'x'+h;
    } else {
      var x = Event.pointerX(event) - this.MouseStart.mx + this.MouseStart.x;
      var y = Event.pointerY(event) - this.MouseStart.my + this.MouseStart.y;
      this.Top.setPos(x,y);
      this.FrameSizeDiv.innerHTML = x+'x'+y;
    }
    this.FrameDiv.style.left = (this.Top.X-1) + 'px';
    this.FrameDiv.style.top = (this.Top.Y-1) + 'px';
    this.FrameDiv.style.width = this.Top.W + 'px';
    if(this.Top.Rolled) 
      this.FrameDiv.style.height = '22px';
    else
      this.FrameDiv.style.height = this.Top.H + 'px';
    this.FrameDiv.style.display = 'block';    
    return Event.stop(event);
  },
  onMouseUp: function(event) {
    Event.stopObserving(this.CoverDiv);
    this.CoverDiv.style.display = 'none';    
    this.FrameDiv.style.display = 'none';    
    this.Top.draw();
    return Event.stop(event);
  },

  unRegister: function(win) {
    if(typeof win == 'string')
      win = this.Windows.get(win);
    if(!win) return;
    this.Windows.unset(win.WindowName);
    this.Div.removeChild(win.Div);
    if(this.Top == win) this.Top = undefined;
  }
  
});

var MDIWindow = Class.create({
  initialize: function(mdi,windowname,title,x,y,w,h,noscroll) {
    this.MDI = mdi;
    
    this.WindowName = windowname;

    this.Div = Builder.node('div',{'id': 'Window'+windowname, 'class': 'MDIWindow'});
    this.TitleDiv = Builder.node('div',{'class': 'MDITitle'});
    this.TitleDiv.innerHTML = title.escapeHTML();
    this.Div.appendChild(this.TitleDiv);
    
    if(!noscroll) {
      this.ScrollDiv = Builder.node('div',{'class': 'MDIScrollBox'});
      this.Div.appendChild(this.ScrollDiv);
    }

    this.ResizeDiv = Builder.node('div',{'class': 'MDIResize'});
    this.Div.appendChild(this.ResizeDiv);

    this.RollupDiv = Builder.node('div',{'class': 'MDIRollup'});
    this.Div.appendChild(this.RollupDiv);

    // get cookie
    var settings = Cookies.get('MDIWindow'+this.WindowName);
    if(settings) {
      settings = settings.split(',');
      this.Rolled = (settings[4] == 'true') ? true : false;
      this.setPos(settings[0],settings[1],settings[2],settings[3]);
    } else {
      this.Rolled = false;
      this.setPos(x,y,w,h);
    }
    this.draw();
    this.MDI.register(this);
    this.focus();

    Event.observe(this.TitleDiv, 'mousedown', this.onMove.bind(this));
    Event.observe(this.TitleDiv, 'mouseup', this.MDI.onMouseUp.bind(this.MDI));
    Event.observe(this.ResizeDiv, 'mousedown', this.onSize.bind(this));
    Event.observe(this.ResizeDiv, 'mouseup', this.MDI.onMouseUp.bind(this.MDI));
    Event.observe(this.RollupDiv, 'mousedown', this.onRollup.bind(this));
    Event.observe(this.Div, 'mousedown', this.focus.bind(this));
//    Event.observe(this.TitleDiv, 'click', Event.stop);
  },

  setPos: function(x,y,w,h){
    if(w != undefined) this.W = parseInt(w);
    if(h != undefined) this.H = parseInt(h);
    if(x != undefined) this.X = parseInt(x);
    if(y != undefined) this.Y = parseInt(y);

    if(this.W < 100) this.W = 100;
    if(this.H < 40) this.H = 40;

    var dW = this.MDI.Div.clientWidth;
    var dH = this.MDI.Div.clientHeight;

    if(this.W > dW) this.W = dW;
    if(this.H > dH) this.H = dH;

    var maxX = dW - this.W;
    var maxY = dH - this.H;

    if(this.X > maxX) this.X = maxX;
    if(this.Y > maxY) this.Y = maxY;

    if(this.X < 0) this.X = 0;
    if(this.Y < 0) this.Y = 0;
  },

  draw: function() {
    this.Div.style.left = this.X+'px';
    this.Div.style.top = this.Y+'px';
    this.Div.style.width = this.W+'px';
    if(this.Rolled) {
      if(this.ScrollDiv) this.ScrollDiv.style.display = 'none';
      this.ResizeDiv.style.display = 'none';
      this.Div.style.height = '22px';
    } else {
      if(this.ScrollDiv) this.ScrollDiv.style.display = 'block';
      this.ResizeDiv.style.display = 'block';
      this.Div.style.height = this.H+'px';
    }

    // save cookie
    var settings = $A([this.X, this.Y, this.W, this.H, this.Rolled?'true':'false']).join(',');    
    Cookies.set('MDIWindow'+this.WindowName, settings);
  },

  focus: function() {
    this.MDI.focus(this);
  },

  onMove: function(event) {
    this.focus();
    return this.MDI.onMouseDown(event,'move');
  },
  
  onRollup: function(event) {
    this.focus();

    this.Rolled = !this.Rolled;
    this.draw();

    return Event.stop(event);
  },
  
  onSize: function(event) {
    this.focus();
    return this.MDI.onMouseDown(event,'size');
  },
  
  destroy: function() {
    Event.stopObserving(this.TitleDiv);
    this.MDI.unRegister(this);
  }
  
});

var MDIButton = Class.create({
  initialize: function(mdi,titletext,image,callback,context) {
    this.MDI = mdi;
    
    this.Element = Builder.node('a',{ href: '#', style: 'background-image: url('+image+')', alt: titletext, title: titletext});
//    this.Element.innerHTML = titletext;
    this.MDI.Toolbar.appendChild(this.Element);

    Event.observe(this.Element, 'click', callback.bind(context));
  },

  destroy: function() {
    Event.stopObserving(this.Element);
    this.MDI.Toolbar.removeChild(this.Element);
  }
  
});

var MDISlider = Class.create({
  initialize: function(mdi,slider,titletext,callback,context) {
    this.MDI = mdi;
    
    this.Slider = Builder.node('div',{ id: slider, 'class': 'MDISlider', title: titletext });
    
    this.Text = Builder.node('div', { 'class': 'MDISliderText' });
    this.Text.innerHTML = titletext;
    this.Slider.appendChild(this.Text);

    var track = Builder.node('div',{ id: slider+'-track', 'class': 'MDISliderTrack' });
    this.Slider.appendChild(track);
    
    var handle = Builder.node('div',{ id: slider+'-handle',  'class': 'MDISliderHandle' });
    track.appendChild(handle);
    
    var image = Builder.node('img',{ src: 'img/handle.png', alt: '' });
    handle.appendChild(image);
    
    this.MDI.Toolbar.appendChild(this.Slider);

    new Control.Slider(slider+'-handle', slider+'-track', { onSlide: callback.bind(context) });
  },

  destroy: function() {
    this.MDI.Toolbar.removeChild(this.Slider);
  }
  
});


