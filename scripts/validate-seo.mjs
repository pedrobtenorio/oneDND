import {readFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
const pages=JSON.parse(readFileSync('src/app/seo/pages.json','utf8'));
const sitemap=readFileSync('dist/ficha-automatica/browser/sitemap.xml','utf8');
const titles=new Set();
for(const page of pages.filter(p=>p.prerender)){
  const html=readFileSync(`dist/ficha-automatica/browser/${page.path}/index.html`,'utf8');
  const title=html.match(/<title>([^<]+)<\/title>/)?.[1];
  assert(title&&title.includes('One D'),`Missing title: ${page.path}`);
  assert(!titles.has(title),`Duplicate title: ${page.path}`);titles.add(title);
  assert.equal((html.match(/name="description"/g)||[]).length,1);
  assert.equal((html.match(/rel="canonical"/g)||[]).length,1);
  assert(html.includes(`/${page.path}"`),`Canonical missing: ${page.path}`);
  assert(html.includes('property="og:image"'));
  assert(html.includes('application/ld+json'));
  assert(sitemap.includes('/'+page.path+'</loc>'));
  assert(html.includes('<h1'),`Empty page: ${page.path}`);
  if(page.classId){assert(html.includes('Como costuma jogar'));assert(html.includes('Características de'));assert(html.includes('Livro do Jogador'));assert.equal((html.match(/Consultar regras de /g)||[]).length,4);}
}
assert(!sitemap.includes('/busca<'));assert(!sitemap.includes('/monstros<'));assert(!sitemap.includes('/personagens/example-'));
assert(existsSync('dist/ficha-automatica/browser/index.csr.html'));
assert(existsSync('dist/ficha-automatica/browser/404.html'));
assert(existsSync('dist/ficha-automatica/browser/assets/seo/social-card.png'));
const redirects=readFileSync('dist/ficha-automatica/browser/_redirects','utf8');
assert(redirects.includes('/personagens/* /index.csr.html 200'));
assert(redirects.includes('/* /404.html 404'));
console.log(`SEO validado: ${titles.size} páginas pré-renderizadas, metadados, dados estruturados, sitemap e rotas Netlify.`);
