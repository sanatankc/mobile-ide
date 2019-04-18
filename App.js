import React from 'react'
import { sortBy } from 'lodash'
import {
  StyleSheet,
  StatusBar,
  View,
  KeyboardAvoidingView,
  WebView,
  Dimensions,
  Keyboard,
  Text,
  TouchableHighlight,
  FlatList,
  TouchableOpacity,
  TextInput,
  TouchableWithoutFeedback
} from 'react-native'
import runCode from './runCode'


export default class App extends React.Component {
  constructor(props) {
    super(props)
    this.onMessage = this.onMessage.bind(this)
  }
  state = {
    isKeyboard: false,
    keyBoardHeight: 0,
    autocomplete: [],
    shouldOutput: false,
    output: []
  }
  keywords = ['print', 'find']
  acceptedTypes = ['keyword', 'builtin', 'variable', 'property', 'variable-2', 'def']
  tokenAtCursor= {}
  cursor={}

  componentDidUpdate() {
    console.log(this.state.output)
  }
  componentDidMount() {
    this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', e => {
      this.setState({
        isKeyboard: true,
        keyBoardHeight: e.endCoordinates.height
      })
    })
    this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', e => {
      this.setState({
        isKeyboard: false,
        keyBoardHeight: 0
      })
    })
  }

  componentWillUnmount() {
    this.keyboardDidShowListener.remove();
    this.keyboardDidHideListener.remove();
  }

  onMessage(e) {
    const data = JSON.parse(e.nativeEvent.data)
    if (data.type && this[data.type]) {
      this[data.type](data.data)
    }
  }

  setKeywords(data) {
    this.keywords = [...this.keywords, ...data]
  }

  onGetCode(data) {
    const newOutput = []
    runCode(data.code, (text, isError) => {
      newOutput.push({
        text,
        isError
      })
    })
    this.setState({
      output: newOutput,
      shouldOutput: true
    })
  }

  onEditorChange(data) {
    const keywords = [...new Set([...this.keywords, ...data.tokens])]
    this.tokenAtCursor = data.tokenAtCursor
    this.cursor = data.cursor
    const matchKeywords = []
    if (!this.acceptedTypes.includes(data.tokenAtCursor.type)) {
      this.setState({ autocomplete: [] })
      return
    }
    for (const keyword of keywords) {
      if (keyword !== data.tokenAtCursor.string) {
        const indexOfKeyword = keyword.indexOf(data.tokenAtCursor.string)
        if (indexOfKeyword >= 0 ) {
          matchKeywords.push({
            key: keyword,
            keyword,
            indexOfKeyword
          })
        }
      }
    }
    this.setState({autocomplete: sortBy(matchKeywords, ['indexOfKeyword', 'keyword']).slice(0, 10)})
  }

  a = 'dsd'
  render() {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar hidden/>
        <KeyboardAvoidingView
          behavior='padding'
          style={styles.container}
          enabled
        >
          <View style={{ ...styles.strip, height: 45}}>
            <TextInput />
          </View>
          <View style={styles.body}>
            <WebView
              originWhitelist={['*']}
              ref={webview => this.webview = webview}
              onMessage={this.onMessage}
              javaScriptEnabled={true}
              source={{
                html: `
                  <!doctype html>
                  <html>
                    <head>
                      <meta charset="UTF-8">
                      <meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0">
                      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.44.0/codemirror.min.css">
                    </head>
                    <style>
                      html, body {
                        margin: 0;
                        padding: 0;
                      }
                      .CodeMirror {
                        height: 100vh;
                        width: 100%;
                        font-size: 16px;
                      }
                    </style>
                    <body>
                      <textarea id='python-editor'>print('Hello World')</textarea>
                      <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.44.0/codemirror.min.js"></script>
                      <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.44.0/mode/python/python.min.js"></script>
                      <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.44.0/addon/edit/closebrackets.min.js"></script>
                      <script>
                        function awaitPostMessage(){var isReactNativePostMessageReady=!!window.originalPostMessage;var queue=[];var currentPostMessageFn=function store(message){if(queue.length>100)queue.shift();queue.push(message)};if(!isReactNativePostMessageReady){Object.defineProperty(window,'postMessage',{configurable:true,enumerable:true,get:function get(){return currentPostMessageFn},set:function set(fn){currentPostMessageFn=fn;isReactNativePostMessageReady=true;setTimeout(sendQueue,0)}})}function sendQueue(){while(queue.length>0){window.postMessage(queue.shift())}}}
                        function debounce(n,t,u){var e;return function(){var i=this,o=arguments,a=u&&!e;clearTimeout(e),e=setTimeout(function(){e=null,u||n.apply(i,o)},t),a&&n.apply(i,o)}}
                        var editor = CodeMirror.fromTextArea(
                          document.getElementById('python-editor'), {
                            lineNumbers: false,
                            mode: 'python',
                            inputStyle: 'textarea',
                            autoCloseBrackets: true
                        });
                        var handleRNMessages = {
                          replaceText: function (data) {
                            var pos = data.cursor;
                            var tok = data.tokenAtCursor;
                            editor.replaceRange(data.replaceText, {line: pos.line , ch:tok.start},{line:pos.line , ch:tok.end});
                          },
                          dismissKeyboard: function() {
                            editor.getInputField().blur()
                          },

                          getCode: function() {
                            postMessage(JSON.stringify({
                              type: 'onGetCode',
                              data: {
                                code: editor.getValue()
                              }
                            }), '*')
                          },

                        };
                        awaitPostMessage();
                        editor.on('cursorActivity', debounce(function (cm) {
                          var tokens = [];
                          for (var i = 0; i < editor.lineCount(); i++) {
                            tokens = [].concat(tokens, editor.getLineTokens(i));
                          }
                          var acceptedTypes = ['keyword', 'builtin', 'variable', 'property', 'variable-2', 'def'];
                          tokens = Array.from(new Set(tokens.filter(function (token) {
                            return acceptedTypes.includes(token.type);
                          }).map(function (token) {
                            return token.string;
                          })));
                          var tokenAtCursor = editor.getTokenAt(editor.getCursor())
                          postMessage(JSON.stringify({
                            type: 'onEditorChange',
                            data: {
                              tokens: tokens,
                              tokenAtCursor: tokenAtCursor,
                              cursor: editor.getCursor()
                            }
                          }), '*');
                        }, 250));
                        postMessage(JSON.stringify({
                          type: 'setKeywords',
                          data: CodeMirror.hintWords.python
                        }), '*');

                        document.addEventListener('message', function(e) {
                          const data = JSON.parse(e.data)
                          if (data.type) {
                            handleRNMessages[data.type](data.data)
                          }
                        });
                      </script>
                    </body>
                  </html>
                `,
                baseUrl:''
              }}
              style={{
                flex: 1,
                width: Dimensions.get('window').width,
                height: 100
              }}
            />
          </View>
          {this.state.isKeyboard &&
            <View style={{ ...styles.strip, ...styles.absoluteStrip, elevation: 5, bottom: this.state.keyBoardHeight + 30  }}>
              <FlatList
                data={this.state.autocomplete}
                renderItem={({item}) =>
                  <TouchableHighlight
                    style={styles.autocompleteWrapper}
                    onPress={() => {
                      this.webview.postMessage(JSON.stringify({
                        type: 'replaceText',
                        data: {
                          cursor: this.cursor,
                          tokenAtCursor: this.tokenAtCursor,
                          replaceText: item.keyword
                        }
                      }))
                    }}
                    underlayColor ='#eee'
                  >
                    <Text style={styles.autocompleteItem}>{item.keyword}</Text>
                  </TouchableHighlight>
                }
                horizontal
              >
              </FlatList>
            </View>
          }
          <TouchableOpacity
            style={{
              position: 'absolute',
              right: 15,
              bottom: this.state.isKeyboard ? this.state.keyBoardHeight + 48 + 50 : 20,
              backgroundColor: '#841584',
              padding: 10,
              paddingRight: 25,
              paddingLeft: 25,
              borderRadius: 2,
              zIndex: 0,
            }}
            onPress={() => {
              this.webview.postMessage(JSON.stringify({
                type: 'dismissKeyboard'
              }))
              this.webview.postMessage(JSON.stringify({
                type: 'getCode'
              }))
            }}
          >
            <Text style={{ color: 'white' }}>Run</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
        {this.state.shouldOutput &&
          <>
            <TouchableWithoutFeedback onPress={() => {
              this.setState({ shouldOutput: false })
            }}>
              <View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '40%',
                backgroundColor: 'black',
                opacity: 0.3,
                zIndex: 4,
              }}>
              </View>
            </TouchableWithoutFeedback>
            <View style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              height: '60%',
              backgroundColor: 'white',
              zIndex: 5
            }}>{
              this.state.output.map((outputItem, i) => (
                <Text key={i} style={{ color: outputItem.isError ? 'red' : 'black' }}>{outputItem.text}</Text>
              ))
            }</View>
          </>
        }
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  strip: {
    height: 48,
    width: '100%',
  },
  absoluteStrip: {
    position: 'absolute',
    left: 0,
    backgroundColor: 'white'
  },
  body: {
    flex: 10,
    width: '100%',
    alignItems: 'center',
  },
  autocompleteWrapper: {
    marginLeft: 10,
    alignSelf: 'center',
    backgroundColor: 'white',
    paddingRight: 15,
    paddingLeft: 15,
    borderRadius: 4,
    elevation: 6
  },
  autocompleteItem: {
    padding: 10,
    fontFamily: 'monospace'
  }
});
