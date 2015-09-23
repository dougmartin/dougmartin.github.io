

var Editor = Class.create({
  initialize: function(parentdiv) {
    this.Div = parentdiv;

    this.Lines = $A();
    this.Highlighted = undefined;
    
    this.Changed = false;
  },


  fromString: function(words) {
    this.Div.innerHTML = '';
    this.Lines = $A();
    this.Highlighted = undefined;
    var lines = words.split(/\r?\n/);
    var len = lines.length;
    for(var i = 0; i < len; i++) {
      var editorline = new EditorLine(this,lines[i]);
      this.Div.appendChild(editorline.Line);
      this.Lines[i+1] = editorline;
    }
    this.updateLineNumbers();
  },
  
  toString: function() {
    var words = '';
    var len = this.Lines.length;
    for(var i=1; i < len; i++) {
      words += this.Lines[i].Words + "\n";
    }
    return words;
  },

  insertLine: function(editorline, position) {
    // default to last position
    if(position == undefined)
      position = this.Lines.length;
    // insert into div
    var before;
    if (this.Lines[position])
      before = this.Lines[position].Line; 
    this.Div.insertBefore(editorline.Line, before);
    // insert into lines array
    this.Lines.splice(position,0,editorline);
    // the doc has changed
    this.Changed = true;
  },

  removeLine: function(position) {
    // remove item at position from array
    var editorline = this.Lines.splice(position,1);
    // if one was removed then remove this from the div
    if(editorline[0]) {
      this.Div.removeChild(editorline[0].Line);
      // set the doc to changed
      this.Changed = true;
    }
  },

  updateLineNumbers: function(from) {
    // default to all lines
    if(!from) from = 1;
    var len = this.Lines.length;
    for(var i=from; i < len; i++) {
      // only do something if the number has changed
      if (this.Lines[i].LineNumber != i) {
        // if this line was highlighted before unhighlight
        if ((this.Highlighted) &&  (this.Highlighted == this.Lines[i].LineNumber))
          this.Lines[i].highlight(false);
        // set new line number
        this.Lines[i].LineNumber = i;
        this.Lines[i].Num.innerHTML = i;
        // if this line is now suposed to be highlighted then do that
        if ((this.Highlighted) && (this.Highlighted == i))
          this.Lines[i].highlight(true);
      }
    }
  },

  setHighlight: function(linenumber) {
    if(this.Highlighted != linenumber) {
      // unhighlight old line
      if ((this.Highlighted) && (this.Lines[this.Highlighted]))
        this.Lines[this.Highlighted].highlight(false);
      // check if this linenumber exists;
      if(!this.Lines[linenumber]) linenumber = undefined;
      // highlight new line
      if (linenumber)
        this.Lines[linenumber].highlight(true);
      this.Highlighted = linenumber;
    }
  },
 
  _ignore: 0
});

//    var words = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec adipiscing est sit amet nisl. Fusce rh';

var EditorLine = Class.create({
  initialize: function(editor,words) {
    this.Editor = editor;

    this.Line = Builder.node('div',{'class': 'EditorStyle EditorLine'});

    this.Glyph = Builder.node('div',{'class': 'EditorStyle EditorGlyph'});
    this.Line.appendChild(this.Glyph);

    this.Num = Builder.node('div',{'class': 'EditorStyle EditorNumber'});
    this.Line.appendChild(this.Num);

    this.Text = Builder.node('div',{'class': 'EditorStyle EditorText'});
    this.Line.appendChild(this.Text);

    if(words != undefined)
      this.setWords(words);
  },

  setWords: function(words) {
    this.Words = words;
    words = words.escapeHTML();
    words = words.replace(/ /g,'&nbsp;');
    words = words.replace(/\t/g,'&nbsp;&nbsp;&nbsp;&nbsp;');
    this.Text.innerHTML = words;
  },

  startEdit: function() {
    this.Input = Builder.node('input',{type: 'text', 'class': 'EditorStyle EditorInput'});
    this.Input.value = this.Words;
    this.Text.appendChild(this.Input);
  },

  endEdit: function() {
    if(this.Input) {
      this.setWords(this.Input.value);
      this.Text.removeChild(this.Input);
      this.Input = undefined;
    }
  },

  highlight: function(onoff) {
    this.Highlight = onoff;
    if(onoff) {
      this.Line.className = 'EditorStyle EditorLine EditorHighlight';
    } else {
      this.Line.className = 'EditorStyle EditorLine';
    }
  },

  _ignore: 0
});

