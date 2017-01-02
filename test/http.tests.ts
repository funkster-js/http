import * as request from 'supertest'
import { asRequestListener } from '../src'
import { ifPath, Ok, parsePath } from '../src/http'

describe('When using ifPath', () => {
  describe('on a matching path', () => {
    const pipe = ifPath('/some/route', () => Ok())

    it('should execute the next pipe.', done => {
      request(asRequestListener(pipe))
        .get('/some/route')
        .expect(200, done)
    })
  })

  describe('on a non-matching path', () => {
    const pipe = ifPath('/some/route', () => Ok())

    it('should result in a 404.', done => {
      request(asRequestListener(pipe))
        .get('/some')
        .expect(404, done)
    })
  })
})

describe('When using parsePath', () => {
  describe('on a url path with placeholders', () => {
    interface Params {
      foo: string
      bar: string
    }

    const pipe = parsePath<Params>('/route/:foo/some/:bar', params => Ok(JSON.stringify(params)))

    it('should parse the placeholder values correctly.', done => {
      request(asRequestListener(pipe))
        .get('/route/first/some/beer')
        .expect(200, JSON.stringify({ foo: 'first', bar: 'beer' }), done)
    })
  })

  describe('on a url path with one placeholder', () => {
    interface Params {
      foo: string
      bar: string
    }

    const pipe = parsePath<Params>('/route/:foo/some', params => Ok(JSON.stringify(params)))

    it('should parse the placeholder value correctly.', done => {
      request(asRequestListener(pipe))
        .get('/route/first/some')
        .expect(200, JSON.stringify({ foo: 'first' }), done)
    })
  })

  describe('on a url path with no placeholders', () => {
    interface Params {
      foo: string
      bar: string
    }

    const pipe = parsePath<Params>('/route/some', params => Ok(JSON.stringify(params)))

    it('should pass on an empty object.', done => {
      request(asRequestListener(pipe))
        .get('/route/some')
        .expect(200, '{}', done)
    })
  })

  describe('on a non-matching url path', () => {
    interface Params {
      foo: string
      bar: string
    }

    const pipe = parsePath<Params>('/route/:foo/some', params => Ok(JSON.stringify(params)))

    it('should result in a 404.', done => {
      request(asRequestListener(pipe))
        .get('/route/some')
        .expect(404, done)
    })
  })
})
