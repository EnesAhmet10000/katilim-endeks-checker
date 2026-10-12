const fs=require('fs');const http=require('http');const path=require('path');
const root=path.resolve('.');
http.createServer((req,res)=>{
 const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const file=path.resolve(root,'.'+name);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try {const data=fs.readFileSync(file);const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css'};res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'}).end(data);}catch{res.writeHead(404).end();}
}).listen(8765,'127.0.0.1',()=>console.log('Local UI fixture preview: http://127.0.0.1:8765/qa-preview.html'));
