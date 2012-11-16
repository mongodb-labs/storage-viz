
/*
Copyright (C) 2012 10gen Inc.

This program is free software: you can redistribute it and/or  modify
it under the terms of the GNU Affero General Public License, version 3,
as published by the Free Software Foundation.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

(function(){

d3.selection.prototype.value = function(val) {
    if (arguments.length < 1) return this.property('value');
    else this.property('value', val);
}

var base = this.base = {};

// Simple JavaScript Templating
// John Resig - http://ejohn.org/ - MIT Licensed
var cache = {};

base.tmpl = function Tmpl(str, data){
    // Figure out if we're getting a template, or if we need to
    // load the template - and be sure to cache the result.
    var fn = !/\W/.test(str) ?
        cache[str] = cache[str] :

        // Generate a reusable function that will serve as a template
        // generator (and which will be cached).
        new Function("obj",
            "var p=[],print=function(){p.push.apply(p,arguments);};" +

            // Introduce the data as local variables using with(){}
            "with(obj){p.push('" +

            // Convert the template into pure JavaScript
            str
              .replace(/[\r\t\n]/g, " ")
              .split("<%").join("\t")
              .replace(/((^|%>)[^\t]*)'/g, "$1\r")
              .replace(/\t=(.*?)%>/g, "',$1,'")
              .split("\t").join("');")
              .split("%>").join("p.push('")
              .split("\r").join("\\'")
        + "');}return p.join('');");

    // Provide some basic currying to the user
    return data ? fn( data ) : fn;
};

base.jsonp = function(url, callbackName) {
    var script = document.createElement('script');
    script.src = url + "&limit=1&jsonp=" + callbackName;
    document.getElementsByTagName('body')[0].appendChild(script);
};

base.generateFormFields = function(selection, fields, onClick) {
    fields.map(function(x) {
        selection.append('label').attr('for', x.name).text(x.desc);
        var input = selection.append('input').attr('name', x.name).attr('type', x.type);
        if (x.default_) input.value(x.default_);
    });
    selection.append('button').text('submit').on('click', onClick);
};

base.collectFormValues = function(selection, fields) {
    var params = {};
    fields.map(function(x) {
        params[x.name] = selection.select('input[name=' + x.name + ']').value();
    });
    return params;
};

base.property = function(obj, name, default_) {
    obj['_' + name] = default_;
    obj[name] = function(_) {
        if (!arguments.length) return obj['_' + name];
        else obj['_' + name] = _;
        return this;
    };
};

base.fmt = {
    percent: function(val) { return val.toFixed(3) }, //d3.format('.3p'),
    ratioToPercent: function(val) { return (val * 100).toFixed(1) + '%' },
    percentAndErr: function(val, err) {
        return this.percent(val) + ' (&plusmn;' + this.percent(err) + ')';
    },
    suffix: function(bytes) {
        if( bytes < 1024 )
            return Math.floor( bytes ) + "b";
        if( bytes < 1024 * 1024 )
            return Math.floor( bytes / 1024 ) + "kb";
        if( bytes < 1024 * 1024 * 1024 )
            return Math.floor( ( Math.floor( bytes / 1024 ) / 1024 ) * 100 ) / 100 + "Mb";
       return Math.floor( ( Math.floor( bytes / ( 1024 * 1024 ) ) / 1024 ) * 100 ) / 100 + "Gb";
    },
    suffixAndBytes: function(val) { return base.fmt.suffix(val) + ' (' + val + ' bytes)' }
}

base.fmt.stat = {
    percentAndErr: function(stat) { return base.fmt.percentAndErr(stat.mean, stat.stddev); }
}

})();
