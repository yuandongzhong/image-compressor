var fopn;
var pngs = [];
var cnum = 256;

function Go() {
  var dc = document.body;

  // File input
  fopn = document.createElement("input");
  fopn.setAttribute("type", "file");
  fopn.addEventListener("change", onFileDrop, false);
  dc.appendChild(fopn);
  fopn.setAttribute("style", "display:none");
  fopn.setAttribute("multiple", "");

  dc.addEventListener("dragover", cancel);
  dc.addEventListener("dragenter", cancel); //highlight);
  dc.addEventListener("dragleave", cancel); //unhighlight);
  dc.addEventListener("drop", onFileDrop);
}

function onFileDrop(e) {
  cancel(e);
  var files = e.dataTransfer ? e.dataTransfer.files : e.target.files;
  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    var r = new FileReader();
    r._file = file;
    r.onload = dropLoaded;
    r.readAsArrayBuffer(file);
    window.files = files;
  }
}

function dropLoaded(e) {
  if(e.target._file.type == 'image/png'){
    addPNG(e.target.result, e.target._file);
  }else{
    addOtherType(e.target.result, e.target._file);
  }
}

function showOpenDialog() {
  // show open dialog
  var evt = document.createEvent("MouseEvents");
  evt["initMouseEvent"](
    "click",
    true,
    true,
    document.defaultView,
    1,
    0,
    0,
    0,
    0,
    false,
    false,
    false,
    false,
    0,
    null
  );
  fopn.dispatchEvent(evt);
}

function cancel(e) {
  e.stopPropagation();
  e.preventDefault();
}

// **************
// Image processing
// **************

function addPNG(buff, file) {
  var rgba;
  var ofmt = "png";
  var mgc = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  var ubuff = new Uint8Array(buff);

  if (ubuff[0] == 0xff && ubuff[1] == 0xd8 && ubuff[2] == 0xff) {
    console.log("This file is JPG...please change it to PNG buddy");
  } else {
    for (var i = 0; i < 8; i++) if (mgc[i] != ubuff[i]) return;
    var img = UPNG.decode(buff);
    console.log(img)
    rgba = UPNG.toRGBA8(img)[0];
    w = img.width;
    h = img.height;
  }

  var png = {
    name: file.name,
    original_size: file.size,
    width: w,
    height: h,
    odata: buff,
    orgba: new Uint8Array(rgba),
    ndata: null,
    nrgba: null,
    ofmt: ofmt,
  };

  recompute(png);
}

function addOtherType(buff, file){

  new Compressor(file, {
    quality: 0.6,
    success(result) {
      console.log('压缩成功');
      console.log(result);

      var r = new FileReader();
      r._file = result;
      r.onload = function(e){

        var buff2 = e.target.result;
        var file2 = e.target._file
        var png = {
          name: file.name,
          original_size: file.size,
          odata: buff,
          // orgba: new Uint8Array(rgba),
          ndata: buff2,
          // nrgba: null,
          ofmt: file.type,
        };
        pngs.push(png)
        printResult(png);
      };
      r.readAsArrayBuffer(result);
    },
    error(err) {
      console.log(err.message);
    },
  });
}

function recompute(png) {
  var p = png;

  p.ndata = UPNG.encode([p.orgba.buffer], p.width, p.height, cnum);

  if (p.ofmt == "png" && p.ndata.byteLength > p.odata.byteLength)
    p.ndata = p.odata;
  var img = UPNG.decode(p.ndata);
  p.nrgba = new Uint8Array(UPNG.toRGBA8(img)[0]);
  // save(p.ndata, p.name);
  pngs.push(p)
  printResult(p);

}

function printResult(png) {
  var fileName = png.name;
  var fileSize = png.original_size;

  // Create link element
  var buff = png.ndata;
  var data = new Uint8Array(buff);
  var a = document.createElement("a");
  var blob = new Blob([data]);
  var url = window.URL.createObjectURL(blob);
  a.href = url;
  a.download = fileName;
  a.innerText = "download";

  var currentSize = data.byteLength;
  var compressRate = Math.ceil((1-currentSize / fileSize)*100)+'%';

  var datas = [fileName, filesize(fileSize), filesize(currentSize), a.outerHTML, compressRate];

  var table = document.getElementById("result-table");
  var tr = document.createElement("tr");

  for (var i = 0; i < datas.length; i++) {
    var td = document.createElement("td");
    td.innerHTML = datas[i];
    tr.appendChild(td);
  }

  table.appendChild(tr);
  document.querySelector('#download-all').style.display = 'block'
}


function downloadAll() {
  var links = document.querySelectorAll('#result-table a')
  for (link of links) {
    link.click();
  }
}

function save(buff, path)
{
  if(pngs.length==0) return;
  var data = new Uint8Array(buff);
  var a = document.createElement( "a" );
  var blob = new Blob([data]);
  var url = window.URL.createObjectURL( blob );
  a.href = url;  a.download = path;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function saveAll()
{

  var zip = new JSZip();
  var img = zip.folder("images");
  for(var i=0; i<pngs.length; i++){
    img.file(pngs[i].name, pngs[i].ndata)
  }

  zip.generateAsync({type:"blob"}).then(function(content) {
      saveAs(content, "images.zip");
  });

}

