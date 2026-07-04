import { INestApplication, VersioningType } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request = require('supertest')
import { HealthController } from './health.controller'

describe('HealthController', () => {
  let app: INestApplication

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.setGlobalPrefix('api')
    app.enableVersioning({
      defaultVersion: '1',
      type: VersioningType.URI,
    })
    await app.init()
  })

  afterEach(async () => {
    await app.close()
  })

  it('serves the versioned API health endpoint', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect({ status: 'ok' })
  })
})
