# node-pdf-tiling
This code receives a PDF file, breaks each page into a .png file. Than each page is resized into 4 levels of zoom (TBD) than each resized picture is cropped into 256x256 tiles.

### Usage 
```GET /files```

Retrieve all file ids currently available

```GET /files/:id```

Retrieve pdf file

```GET /files/:id/:page?zoom=[zoom]&row=[row]&col=[col]```

Retrieve tile from file id and page [page] in zoom [zoom] row and col. Each tile has 256x256 resolution

```GET /files/:id/:page/info```

Retrieve page resolution (width and height) ```{"width": 750,"height": 580}```

```GET /files/:id/pages```

Retrieve count of pages of pdf ```{"numPages": 1}```

### Setup
__1.__ Install install [GraphicsMagick](http://www.graphicsmagick.org/) or [ImageMagick](http://www.imagemagick.org/)

__2.__ Make sure you have [Ghostscript](http://www.ghostscript.com/)

__3.__ Install [RabbitMQ](http://www.rabbitmq.com/) or point to a RabbitMQ changing the ```queue/config.js``` file 

__4.__ ```npm install``` 

__5.__ Run ```index.jx``` and ```queue/receiver.js```	

### References
[node-canvas](https://github.com/Automattic/node-canvas)
node-canvas was used on previous versions bellow 0.1, node-canvas](https://github.com/Automattic/node-canvas), [choose your OS instalation](https://github.com/Automattic/node-canvas/wiki/_pages)

[Ubuntu](https://github.com/Automattic/node-canvas/wiki/Installation---Ubuntu-and-other-Debian-based-systems)

[node-pdfreader](https://github.com/jviereck/node-pdfreader)

[pdfdraw](https://github.com/flexpaper/pdfdraw)

[Render PDFs on the Server with PDF.JS and Node-Canvas](http://baudehlo.com/2013/02/21/render-pdfs-on-the-server-with-pdf-js-and-node-canvas/)

[gm](https://github.com/aheckmann/gm)

### Mobile
[Android](https://github.com/bnsantos/android-tiling-example)
