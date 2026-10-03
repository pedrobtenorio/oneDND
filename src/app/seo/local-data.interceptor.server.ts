import {HttpInterceptorFn,HttpResponse} from '@angular/common/http';
import {readFile} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {from,map} from 'rxjs';

/** Read the project's own catalogs at build time, without relying on the deployed site. */
export const localDataInterceptor:HttpInterceptorFn=(request,next)=>{
  if(request.method!=='GET'||!/^\/data\/[a-zA-Z0-9/._-]+\.json$/.test(request.url))return next(request);
  const root=resolve('public/data');const file=resolve('public',request.url.slice(1));
  if(!file.startsWith(root+sep))throw new Error('Invalid local catalog path');
  return from(readFile(file,'utf8')).pipe(map(raw=>new HttpResponse({body:JSON.parse(raw),status:200,url:request.url})));
};
