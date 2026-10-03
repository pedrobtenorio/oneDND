import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import {provideHttpClient,withFetch,withInterceptors} from '@angular/common/http';
import {localDataInterceptor} from './seo/local-data.interceptor.server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    provideHttpClient(withFetch(),withInterceptors([localDataInterceptor])),
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
