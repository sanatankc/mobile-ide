import skA from './skulpt-min'
import skB from './skulpt-stdlib'

const builtinRead = (x) => {
  if (Sk.builtinFiles === undefined || Sk.builtinFiles.files[x] === undefined) {
    const error = `File not found: '${x}'`
    throw error
  }
  return Sk.builtinFiles.files[x]
}

const runCode = (codeString, outf) => {
  Sk.configure({ output: outf, read: builtinRead, execLimit: 60000 })
  console.log('codeString', codeString)
  const myPromise = Sk.misceval.asyncToPromise(() =>
    Sk.importMainWithBody('<stdin>', false, codeString, true),
  )

  myPromise.then((mod) => {},
  (err) => {
    outf(err.toString(), true)
  })
}


export default runCode