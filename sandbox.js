const { PythonShell } = require('python-shell')

const code = `
def greet(name):
return "Hello " + name
print(greet("Sanatan"))
`
PythonShell.runString(code, null, (err, results) => {
  console.log(err, results)
})