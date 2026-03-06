import { ApplicationConfig } from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {

providers: [

provideRouter(
routes,
withPreloading(PreloadAllModules)
)

]

};