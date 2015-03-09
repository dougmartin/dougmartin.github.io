var div = React.DOM.div, 
    span = React.DOM.span, 
    italics = React.DOM.i,
    storagePrefix = 'local:',
    App, Header, Toolbar, Editor, Dialog;

App = React.createFactory(React.createClass({
  getInitialState: function () {
    var state = this.getEmptyState();
    state.showDialog = false;
    this.firebase = new Firebase('https://teaching-teamwork.firebaseio.com/dev/');
    this.authClient = null;
    this.remoteUrlWatcher = null;
    return state;
  },
  
  getEmptyState: function () {
    return {
      filename: null,
      dirty: false,
      empty: true,
      text: this.getEmptyDoc(),
      newed: true,
      user: this.state ? this.state.user : null,
      username: this.state ? this.state.username : null,
      remoteUrl: null,
      published: false
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
  
  getRemoteUrl: function (filename) {
    return this.state.username && filename ? ('https://teaching-teamwork.firebaseio.com/dev/activities/' + this.state.username + '/' + filename) : null;
  },
  
  componentWillUpdate: function (nextProps, nextState) {
    var self = this;
    
    if (nextState.remoteUrl != this.state.remoteUrl) {
      if (this.remoteUrlWatcher) {
        this.remoteUrlWatcher.off();
        this.remoteUrlWatcher = null;
      }
      if (nextState.remoteUrl) {
        this.remoteUrlWatcher = new Firebase(nextState.remoteUrl);
        this.remoteUrlWatcher.on("value", function (snapshot) {
          self.setState({published: !!snapshot.val()});
        });
      }
    }
  },
  
  openFile: function (filename) {
    var text = localStorage.getItem(storagePrefix + filename);
    this.setState({
      filename: filename,
      remoteUrl: this.getRemoteUrl(filename),
      text: text,
      dirty: false,
      empty: text.length == 0,
      opened: true
    });
    this.hideDialog();
  },
  
  saveFile: function (filename) {
    localStorage.setItem(storagePrefix + filename, this.state.text);
    this.setState({
      filename: filename, 
      dirty: false,
      remoteUrl: this.getRemoteUrl(filename)
    });
    this.hideDialog();
  },
  
  deleteFile: function () {
    localStorage.removeItem(storagePrefix + this.state.filename);
    this.newFile();
  },
  
  useFile: function (isLocal) {
    var prefix = isLocal ? 'local:' : ('remote:' + this.state.username + '/');
    window.open('../#' + prefix + this.state.filename);
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
  
  getAuthClient: function () {
    var self = this;
    this.authClient = this.authClient || new FirebaseSimpleLogin(this.firebase, function(error, user) {
      var atPos = user && user.email ? user.email.indexOf('@') : 0,
          username = atPos ? user.email.substr(0, atPos) : null;
      if (error) {
        alert(error);
      }
      self.setState({
        user: user, 
        username: username,
        remoteUrl: self.getRemoteUrl(self.state.filename)
      });
    });
    return this.authClient;
  },
  
  login: function () {
    var email = prompt('Email?'),
        password = email ? prompt('Password?') : null;
        
    if (email && password) {
      this.getAuthClient().login("password", {
        email: email,
        password: password
      });
    }
  },
  
  logout: function () {
    if (confirm('Are you sure you want to logout?')) {
      this.getAuthClient().logout();
      this.setState({user: null});
    }
  },
  
  publishFile: function () {
    this.firebase.child('activities').child(this.state.username).child(this.state.filename).set(JSON.parse(this.state.text));
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
      case 'Use Local':
      case 'Use Remote':
        if (this.okIfDirty()) {
          this.useFile(button == 'Use Local');
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
      case 'Login':
        this.login();
        break;
      case 'Logout':
        this.logout();
        break;
      case 'Publish':
        if (this.isValidText('Sorry, you must fix the JSON errors before you can publish.') && this.okIfDirty()) {
          this.publishFile();
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
        dirty: this.state.dirty,
        user: this.state.user,
        username: this.state.username,
        published: this.state.published
      }),
      Toolbar({
        filename: this.state.filename, 
        dirty: this.state.dirty, 
        empty: this.state.empty,
        user: this.state.user,
        onButtonPressed: this.handleToolbar,
        published: this.state.published
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
      alert('warning', this.props.dirty, 'UNSAVED'),
      alert('info', this.props.published && !this.props.dirty, 'PUBLISHED'),
      alert('warning', this.props.published && this.props.dirty, 'CHANGES NOT PUBLISHED'),
      div({style: {float: 'right'}}, this.props.user ? (this.props.user.email + ' (' + this.props.username + ')') : null)
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
      span(filenameProps, 'Use Local'),
      this.props.user ? span(filenameProps, 'Publish') : null,
      this.props.user ? span(this.props.published ? {} : disabledProps, 'Use Remote') : null,
      span({}, this.props.user ? 'Logout' : 'Login'),
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
