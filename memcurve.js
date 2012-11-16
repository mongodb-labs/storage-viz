// memcurve.js

/**
*  Copyright (C) 2012 10gen Inc.
*
*  This program is free software: you can redistribute it and/or  modify
*  it under the terms of the GNU Affero General Public License, version 3,
*  as published by the Free Software Foundation.
*
*  This program is distributed in the hope that it will be useful,
*  but WITHOUT ANY WARRANTY; without even the implied warranty of
*  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
*  GNU Affero General Public License for more details.
*
*  You should have received a copy of the GNU Affero General Public License
*  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var _data;

/*function handleFiles(files) {*/
/*var reader = new FileReader();*/
/*var text = reader.readAsText(files[0]);*/
/*reader.onload = (function(file) {*/
/*_data = JSON.parse(file.target.result);*/
/*console.log(_data);*/
/*render(_data);*/
/*});*/
/*d3.select("#fileSelect").style({display: "none"});*/
/*}*/

function hilbert_d2xy(n, d) {
  var t = d;
  var x = 0, y = 0;
  var rx, ry;
  for (var s = 1; s < n; s = s * 2) {
    rx = 1 & (t >> 1);
    ry = 1 & (t ^ rx);
    var xy = rot(s, x, y, rx, ry);
    x = xy.x;
    y = xy.y;
    x += s * rx;
    y += s * ry;
    t = (t >> 2);
  }
  return {
    x: x,
    y: y
  };
}

function rot(n, x, y, rx, ry) {
    if (ry == 0) {
        if (rx == 1) {
            x = n - 1 - x;
            y = n - 1 - y;
        }
 
        //Swap x and y
        return {
          x: y,
          y: x
        };
    }
    return {
      x: x,
      y: y
    };
}

function render(data) {
  var canvas = document.getElementById("memcurvecanvas");
  var ctx = canvas.getContext("2d");
  var N = Math.pow(2, 9);
  var CNT = Math.pow(N, 2);
  console.log(CNT);
  var imgData = ctx.getImageData(0, 0, N, N);
  console.log(imgData.width + " " + imgData.height);
  var aaa = Math.floor(Math.random() * 100 * (Math.random() * 10));
  console.log(aaa);
  var up = true;
  for (var i = 0; i < CNT; ++i) {
    --aaa;
    if (aaa <= 0) {
      up = !up;
      aaa = Math.floor(Math.random() * 100 * (Math.random() * 10));
    }
    var pt = hilbert_d2xy(N, i);
    //var col = d3.hsl(Math.floor((1 - i / CNT) * 360), 1, 0.5).rgb();
    var pxid = (pt.x + pt.y * imgData.width) * 4;
    var val = 55 + Math.floor(i / CNT * 200);
    var col = {r: up ? 0 : 255, g: up ? 0 : 255, b: up ? val : 255, a: 255};
    imgData.data[pxid] = col.r;
    imgData.data[pxid + 1] = col.g;
    imgData.data[pxid + 2] = col.b;
    imgData.data[pxid + 3] = col.a;
  }
  ctx.putImageData(imgData, 0, 0);
}

$(function() { render(null) });
