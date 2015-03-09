var div = React.DOM.div, 
    span = React.DOM.span, 
    italics = React.DOM.i,
    storagePrefix = 'local:',
    App, Header, Toolbar, Editor, Dialog;

App = React.createFactory(React.createClass({
  getInitialState: function () {
    var state = this.getEmptyState();
    state.showDialog = false;
    return state;
  },
  
  getEmptyState: function () {
    return {
      filename: null,
      dirty: false,
      empty: true,
      text: this.getEmptyDoc(),
      newed: true
    };
  },
  
  getEmptyDoc: function () {
    return JSON.stringify({
      "name": "",
      "externalComponents": [],
      "clients": []
    }, null, 2);
  },
  
  okIfDirty: function () {
    if (this.state.dirty) {
      return confirm('The current activity is not saved.  Are you sure you want to continue?');
    }
    return true;
  },
  
  hideDialog: function () {
    this.setState({showDialog: false});
  },
  
  newFile: function () {
    this.setState(this.getEmptyState());
  },
  
  openFile: function (filename) {
    var text = localStorage.getItem(storagePrefix + filename);
    this.setState({
      filename: filename,
      text: text,
      dirty: false,
      empty: text.length == 0,
      opened: true
    });
    this.hideDialog();
  },
  
  saveFile: function (filename) {
    localStorage.setItem(storagePrefix + filename, this.state.text);
    this.setState({filename: filename, dirty: false});
    this.hideDialog();
  },
  
  deleteFile: function () {
    localStorage.removeItem(storagePrefix + this.state.filename);
    this.newFile();
  },
  
  useFile: function () {
    window.open('../#local:' + this.state.filename);
  },
  
  formatText: function () {
    try {
      this.setState({text: JSON.stringify(JSON.parse(this.state.text), null, 2)});
    }
    catch (e) {
      alert('Unable to format invalid JSON!');
    }
  },
  
  isValidText: function (message) {
    try {
      JSON.parse(this.state.text);
      return true;
    }
    catch (e) {
      alert(message || 'The JSON is NOT valid');
      return false;
    }
  },
  
  handleToolbar: function (button) {
    var self = this,
        showDialog = function () {
          self.setState({showDialog: self.state.showDialog ? false : button});
        };
    
    switch (button) {
      case 'New':
        if (this.okIfDirty()) {
          this.newFile();
        }
        break;
      case 'Open':
        if (this.state.showDialog || this.okIfDirty()) {
          showDialog();
        }
        break;
      case 'Save':
        if (this.isValidText('Sorry, you must fix the JSON errors before you can save.')) {
          if (this.state.filename) {
            this.saveFile(this.state.filename);
          }
          else {
            showDialog();
          }
        }
        break;
      case 'Save As':
        if (this.isValidText('Sorry, you must fix the JSON errors before you can save.')) {
          showDialog();
        }
        break;
      case 'Use':
        if (this.okIfDirty()) {
          this.useFile();
        }
        break;
      case 'Delete':
        if (confirm('Are you sure you want to delete this?')) {
          this.deleteFile();
        }
        break;
      case 'Format':
        this.formatText();
        break;
      case 'Validate':
        if (this.isValidText()) {
          alert('The JSON is valid');
        }
        break;
    }
  },
  
  editorChanged: function (text) {
    var empty = text.length == 0;
    this.setState({
      empty: empty,
      dirty: !empty && !this.state.opened && !this.state.newed,
      text: text,
      opened: false,
      newed: false
    });
  },
  
  render: function () {
    return div({className: 'app'}, 
      Header({
        filename: this.state.filename, 
        dirty: this.state.dirty
      }),
      Toolbar({
        filename: this.state.filename, 
        dirty: this.state.dirty, 
        empty: this.state.empty,
        onButtonPressed: this.handleToolbar
      }),
      Editor({
        changed: this.editorChanged,
        text: this.state.text
      }),
      Dialog({
        show: this.state.showDialog,
        hideDialog: this.hideDialog,
        openFile: this.openFile,
        saveFile: this.saveFile
      })
    );
  }
}));

Header = React.createFactory(React.createClass({
  render: function () {
    var alert = function (type, show, text) {
      return show ? span({className: 'alert alert-' + type}, text) : null
    }
    return div({className: 'header'},
      'Teaching Teamwork Activity Editor - ',
      span({}, this.props.filename || italics({}, 'New Activity')),
      alert('warning', this.props.dirty, 'UNSAVED')
    );
  }
}));

Toolbar = React.createFactory(React.createClass({
  clicked: function (e) {
    var button = e.target;
    if ((button.nodeName != 'SPAN') || (button.className == 'disabled')) {
      return;
    }
    this.props.onButtonPressed(button.innerHTML);
  },
  
  render: function () {
    var disabledProps = {className: 'disabled'},
        dirtyProps = this.props.dirty ? {} : disabledProps,
        emptyProps = this.props.empty ? disabledProps : {},
        deleteProps = this.props.filename === null ? {className: 'disabled'} : {},
        filenameProps = this.props.filename === null ? {className: 'disabled'} : {};
        
    return div({className: 'toolbar', onClick: this.clicked}, 
      span({}, 'New'),
      span({}, 'Open'),
      span(dirtyProps, 'Save'),
      span(dirtyProps, 'Save As'),
      span(emptyProps, 'Format'),
      span(emptyProps, 'Validate'),
      span(filenameProps, 'Use'),
      span({className: this.props.filename === null ? 'disabled' : null, style: {'float': 'right'}}, 'Delete')
    );
  }
}));

Editor = React.createFactory(React.createClass({
  componentDidMount: function() {
    this.editor = CodeMirror.fromTextArea(this.refs.editor.getDOMNode(), {
      lineNumbers: true,
      matchBrackets: true,
      autoCloseBrackets: true,
      mode: 'application/json',
      tabSize: 2,
      electricChars: true,
      lint: true,
      gutters: ["CodeMirror-lint-markers"],
    });
    this.editor.on('change', this.handleChange);
  },
  
  shouldComponentUpdate: function() {
    return false;
  },
  
  componentWillReceiveProps: function (nextProps) {
    if (this.editor.getValue() != nextProps.text) {
      this.editor.setValue(nextProps.text);
    }
  },
  
  handleChange: function() {
    if (!this.editor) {
      return;
    }
    this.props.changed(this.editor.getValue());
  },
  
  render: function () {
    return div({className: 'editor'}, React.DOM.textarea({
      ref: 'editor',
      defaultValue: this.props.text
    }));
  }
}));

Dialog = React.createFactory(React.createClass({
  getInitialState: function () {
    this.lastFileClick = null;
    return {files: []};
  },
  
  findFiles: function () {
    var files = [],
        i, len, key;
    for (i = 0, len = localStorage.length; i < len; ++i ) {
      key = localStorage.key(i);
      if (key.substr(0, storagePrefix.length) == storagePrefix) {
        files.push(key.substr(storagePrefix.length));
      }
    }
    this.setState({files: files});
  },
  
  componentWillReceiveProps: function (nextProps) {
    if (nextProps.show) {
      var input = this.refs.fileinput.getDOMNode();
      input.value = '';
      setTimeout(function () {
        input.focus();
      }, 10);
      this.findFiles();
    }
  },
  
  checkForEnter: function (e) {
    if (e.which == 13) {
      this.buttonClicked();
    }
  },
  
  buttonClicked: function () {
    var filename = this.refs.fileinput.getDOMNode().value.replace(/^\s+|\s+$/g, '');
    if (filename.length > 0) {
      switch (this.props.show) {
        case 'Open': 
          this.props.openFile(filename);
          break;
        case 'Save':
        case 'Save As':
          this.props.saveFile(filename);
          break;
      }
    }
  },
  
  fileClicked: function (e) {
    if (e.target.className != 'filelistitem') {
      return;
    }
    this.refs.fileinput.getDOMNode().value = e.target.innerHTML;
    e.preventDefault();
    var now = (new Date()).getTime();
    if (now - this.lastFileClick < 250) {
      this.buttonClicked();
    }
    this.lastFileClick = now;
  },
  
  render: function () {
    var files = [],
        i, len;
    for (i = 0, len = this.state.files.length; i < len; i++) {
      files.push(div({className: 'filelistitem', key: this.state.files[i]}, this.state.files[i]));
    }
    
    return div({className: 'dialog', style: {'display': this.props.show ? 'block' : 'none'}}, 
      div({className: 'title'}, 
        this.props.show,
        div({className: 'close', onClick: this.props.hideDialog}, 'X')
      ),
      div({className: 'inner'},
        div({className: 'filelist', onClick: this.fileClicked}, files),
        React.DOM.input({className: 'fileinput', type: 'text', ref: 'fileinput', onKeyUp: this.checkForEnter}),
        React.DOM.button({className: 'button', onClick: this.buttonClicked}, this.props.show)
      )
    );
  }
}));

if (window.localStorage) {
  React.render(App(), document.getElementById('content'));
}
else {
  document.write('<div style="padding: 10px;">Sorry, your browser doesn\'t support LocalStorage which is needed by this app.</div>');
}
