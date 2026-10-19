import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return app info', () => {
      const info = appController.getInfo();
      expect(info.nombre).toBe('contratacion-back');
      expect(info.version).toBe('0.0.1');
    });

    it('should return health status', () => {
      const health = appController.getHealth();
      expect(health.status).toBe('ok');
    });
  });
});
