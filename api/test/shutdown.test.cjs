const path = require('node:path')

// Exercise the real bootstrap and Nest signal handling with a local-only module.
// The production AppModule is never loaded: no database, queue, push or mail clients.
if (process.argv.includes('--shutdown-child')) {
  const fs = require('node:fs')
  const ts = require('typescript')
  require.extensions['.ts'] = (module, filename) => {
    const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
      },
      fileName: filename,
    })
    module._compile(output.outputText, filename)
  }
  const { Module } = require('@nestjs/common')
  const { NestFactory } = require('@nestjs/core')
  const { HealthController } = require('../src/health.controller.ts')

  class ShutdownProbe {
    onApplicationShutdown(signal) {
      return new Promise((resolve, reject) => {
        process.send({ shutdownSignal: signal }, (error) => error ? reject(error) : resolve())
      })
    }
  }

  class LocalTestModule {}
  Module({ controllers: [HealthController], providers: [ShutdownProbe] })(LocalTestModule)
  const modulePath = require.resolve('../src/app.module.ts')
  require.cache[modulePath] = {
    id: modulePath, filename: modulePath, loaded: true,
    exports: { AppModule: LocalTestModule },
  }

  const create = NestFactory.create.bind(NestFactory)
  NestFactory.create = async (...args) => {
    const app = await create(...args)
    // Nest's application proxy ignores method assignment; wrap its listen access.
    return new Proxy(app, {
      get(target, property) {
        if (property === 'listen') return async () => {
          const server = await target.listen(0, '127.0.0.1')
          process.send({ port: server.address().port })
          return server
        }
        return Reflect.get(target, property)
      },
    })
  }
  require('../src/main.ts')
} else {
  const assert = require('node:assert/strict')
  const { fork } = require('node:child_process')
  const { once } = require('node:events')
  const { test } = require('node:test')

  test('SIGTERM invokes application shutdown hooks through the real bootstrap', {
    skip: process.platform === 'win32' && 'Run in WSL/Linux: Windows force-terminates SIGTERM children',
    timeout: 120000,
  }, async (t) => {
    const child = fork(__filename, ['--shutdown-child'], {
      cwd: path.resolve(__dirname, '..'),
      env: {
        PATH: process.env.PATH,
        NODE_ENV: 'test',
        PORT: '0',
        DOTENV_CONFIG_PATH: path.join(__dirname, '__no_test_env__'),
      },
      stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
    })
    child.stderr.resume()
    const exit = once(child, 'exit')
    const signals = []
    child.on('message', (message) => {
      if (message.shutdownSignal) signals.push(message.shutdownSignal)
    })
    t.after(async () => {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
      await exit
    })

    const ready = once(child, 'message')
    const [message] = await Promise.race([
      ready,
      exit.then(() => { throw new Error('Bootstrap exited before opening the test listener') }),
    ])
    assert.ok(Number.isInteger(message.port), 'Bootstrap reports its listening port')
    const response = await fetch(`http://127.0.0.1:${message.port}/api/v1/health`)
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { status: 'ok' })

    assert.equal(child.kill('SIGTERM'), true)
    const deadline = setTimeout(() => child.kill('SIGKILL'), 10000)
    const [code, signal] = await exit.finally(() => clearTimeout(deadline))
    assert.deepEqual(signals, ['SIGTERM'], 'Nest must invoke the shutdown provider exactly once')
    assert.equal(code, null)
    assert.equal(signal, 'SIGTERM')
  })
}
