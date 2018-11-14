const Koa = require('koa')
const serve = require('koa-static')
const path = require('path')

const config = require('./config')
const utils = require('./utils')
const blog = require('./blog')

const app = new Koa()

const koaStaticConfig = {
  maxage: process.env.NODE_ENV === 'production' ? 2 * 365 * 24 * 3600 * 1000 : 0,
}

// `/xxx`
app.use(async (ctx, next) => {
  const rresult = ctx.path.match(/^\/([\w-%]+)\/?$/)

  if (rresult) {
    const folder = rresult[1]
    const filePath = path.resolve(config.target, folder, 'index.yml')

    if (await utils.isValidFile(filePath)) {
      ctx.body = await blog.list(filePath, ctx.path)
      ctx.set('content-type', 'text/html')
    } else {
      await next()
    }
  } else {
    await next()
  }
})

// `/xxx/xxx`
app.use(async (ctx, next) => {
  const rresult = ctx.path.match(/^\/([\w-%]+)\/([\w-%]+)\/?$/)

  if (rresult) {
    const [, folder, file] = rresult
    const filePath = path.resolve(config.target, folder, `${file}.xb`)
    if (await utils.isValidFile(filePath)) {
      ctx.body = await blog.article(filePath, ctx.path)
      ctx.set('content-type', 'text/html')
    } else {
      await next()
    }
  } else {
    await next()
  }
})

// `/`
app.use(async (ctx, next) => {
  if (/^\/?$/.test(ctx.path)) {
    ctx.body = blog.simple('index.html')
    ctx.set('content-type', 'text/html')
  } else {
    await next()
  }
})

config.static.forEach((p) => {
  app.use(serve(p, Object.assign({}, koaStaticConfig)))
})

app.use(serve(path.resolve(__dirname, 'source'), Object.assign({}, koaStaticConfig)))

app.listen(3000)
console.log('App start on 3000')
