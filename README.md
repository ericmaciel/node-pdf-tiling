# node-pdf-tiling

### Usage 
=============
```GET /files```

Retrieve all file ids currently available

```GET /files/:id```

Retrieve pdf file

```GET /files/:id/:page?zoom=[zoom]&row=[row]&col=[col]```

Retrieve tile from file id and page [page] in zoom [zoom] row and col. Each tile has 256x256 resolution

```GET /files/:id/:page/info```

Retrieve page resolution (width and height)

### Setup
=============
__1.__ Install [node-canvas](https://github.com/Automattic/node-canvas), [choose your OS instalation](https://github.com/Automattic/node-canvas/wiki/_pages)
__1.__ Install install [GraphicsMagick](http://www.graphicsmagick.org/) or [ImageMagick](http://www.imagemagick.org/)

### References
=============
[node-canvas](https://github.com/Automattic/node-canvas)

[Ubuntu](https://github.com/Automattic/node-canvas/wiki/Installation---Ubuntu-and-other-Debian-based-systems)

[node-pdfreader](https://github.com/jviereck/node-pdfreader)

[pdfdraw](https://github.com/flexpaper/pdfdraw)

[Render PDFs on the Server with PDF.JS and Node-Canvas](http://baudehlo.com/2013/02/21/render-pdfs-on-the-server-with-pdf-js-and-node-canvas/)

[gm](https://github.com/aheckmann/gm)
