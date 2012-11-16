
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

(function() {

// TODO: node expansion from the visualizer can be re-enabled once the rest api can safely accept
//       a filter array.
var URL_TEMPLATE = "http://<%=host%>/<%=database%>/$cmd/?filter_indexStats=<%=collection%>" +
                   "&filter_index=<%=index%>"; //&filter_arr_expandNodes=<%=expandNodes%>";

var REQUEST_FORM_FIELDS = [
    { name: 'host', desc: 'host', type: 'text', default_: 'localhost:28017' },
    { name: 'database', desc: 'db', type: 'text', default_: 'test' },
    { name: 'collection', desc: 'collection', type: 'text', default_: 'test' },
    { name: 'index', desc: 'index', type: 'text', default_: '_id_' },
    // { name: 'expandNodes', desc: 'expand nodes (e.g. 0,2,3)', type: 'text', default_: '0' }
]

function layoutHacks() {
    d3.selectAll('.expanded-container').style('max-width',
                                              document.documentElement.clientWidth - 450);
}

function setUp() {
    var requestForm = d3.select('#requestForm');
    base.generateFormFields(requestForm, REQUEST_FORM_FIELDS, function() {
        var url = base.tmpl(URL_TEMPLATE, base.collectFormValues(requestForm, REQUEST_FORM_FIELDS));
        d3.select('#resultString').text('fetching ' + url + '...');
        base.jsonp(url, 'handleData');
    });
    d3.select(window).on('resize', layoutHacks);
}

var _data;

// expose so it can be invoked by the jsonp response script
this.handleData = function handleData(data) {
    _data = data.rows[0];
    if (!_data.ok) {
        d3.select('#resultString').text('error: ' + _data.errmsg);
        return;
    }
    d3.select('#resultString').text('executed command with params ' + JSON.stringify(data.query) +
                                    ', rendering');
    console.log(_data);

    _data.keyPattern = JSON.stringify(_data.keyPattern);
    d3.select('#resultString').text('executed command ' + JSON.stringify(data.query));

    var basicInfoRow = d3.select('#basicInfoRow');
    basicInfoRow.selectAll('*').remove();
    [
        'index "<%=name%>"',
        'key pattern: <%=keyPattern%>',
        'storage namespace: <%=storageNs%>',
        '<%=depth%> deep',
        'each bucket body is <%=bucketBodyBytes%> bytes',
        (_data.isIdIndex ? ' this is an _id index' : ' ')
    ].map(function(x) {
        basicInfoRow.append('div').classed('grid-td', true).text(base.tmpl(x, _data))
    });

    var dataArrays = [[_data.overall], _data.perLevel, _data.expandedNodes];
    dataArrays.map(function(arr) {
        // generate calculated data fields
    });

    var $curNodeStats = d3.select('#curNodeStats');
    $curNodeStats.selectAll('*').remove();
    $curNodeStats.datum(_data.overall).call(statsDisplay().big(true));

    var levelAndExpandedData = [];
    for (var d = 0; d < _data.perLevel.length; ++d) {
        levelAndExpandedData.push({
            level: _data.perLevel[d],
            expandedNodes: ((_data.expandedNodes && _data.expandedNodes[d]) ?
                            _data.expandedNodes[d] : [])
        });
    }

    // debugger;
    var $levels = d3.select('#levels');
    $levels.selectAll('*').remove();
    var levelEnter = $levels.selectAll('.level')
        .data(levelAndExpandedData)
        .enter()
        .append('div')
        .classed('level grid-tr', true);

    levelEnter.append('div')
        .classed('grid-td', true)
        .classed('left-table-header', true)
        .append('span')
        .text(function(d, i) { return 'depth ' + i });

    levelEnter.append('div')
        .datum(function(d) { return d.level })
        .classed('grid-td level-summary', true)
        .call(statsDisplay().big(false).width(300));

    levelEnter.append('div')
        .classed('grid-td expanded-container', true)
        .selectAll('.expanded-node')
        .data(function(d) { return d.expandedNodes })
        .enter()
        .append('div')
        .classed('expanded-node', true)
        .call(expandedDisplay());

    layoutHacks();
}

function expandedDisplay() {
    function chart(selection) {
        selection.each(function(data) {
            var $this = d3.select(this);
            $this.selectAll('*').remove();

            if (!data.nodeInfo) {
                $this.append('div').text('empty child');
                return;
            }

            var htmlTemplate = 'child #<b><%=childNum%></b>, <b><%=keyCount%></b> keys ' +
                               '(<b><%=usedKeyCount%></b> used)';
            if (data.nodeInfo.firstKey) {
                htmlTemplate += '<br/><%=JSON.stringify(firstKey)%> '
            }
            if (data.nodeInfo.lastKey) {
                htmlTemplate += '<br/>--&gt; <%=JSON.stringify(lastKey)%>';
            }

            $this.append('div')
                .classed('expanded-header', true)
                .html(base.tmpl(htmlTemplate, data.nodeInfo));

            $this.append('div').text('subtree stats');
            $this.append('div')
                .call(statsDisplay().big(false).width(280));
        });
    }

    return chart;
}

function statsDisplay() {

    function chart(selection) {
        selection.each(function(data) {
            var $this = d3.select(this);
            if (data.numBuckets == 0) {
                $this.append('div').html('<b>0</b> buckets');
                return;
            }
            $this.append('div').html(base.tmpl(
                '<b><%=numBuckets%></b> buckets' +
                ', on average <b><%=base.fmt.stat.percentAndErr(fillRatio)%></b> full' +
                '<br/><b><%=base.fmt.stat.percentAndErr(keyNodeRatio)%></b> key nodes' +
                ', <b><%=base.fmt.stat.percentAndErr(bsonRatio)%></b> bson keys'
            , data));
            var ratios = [
                { desc: '% full', data: data.fillRatio },
                { desc: '% bson keys', data: data.bsonRatio },
                { desc: '% key nodes', data: data.keyNodeRatio }
            ];

            var graphWidth = chart._width - 110;

            var ratiosSvg = $this.append('div').append('svg')
                .classed('boxplot', true)
                .attr('width', chart._width)
                .attr('height', 40 * ratios.length);

            var ratiosG = ratiosSvg
                .selectAll('g')
                .data(ratios);

            var ratioBoxChart = boxChart()
                .domain([0, 1])
                .showAxis(false)
                .width(graphWidth)
                .big(true);

            var ratiosEnter = ratiosG.enter()

            var y = function(d, i) { return (i * 25 + 10) };

            ratiosEnter.append('svg:text')
                .attr('x', 90)
                .attr('y', y)
                .attr('dy', 13)
                .attr('text-anchor', 'end')
                .text(function(d) { return d.desc });

            ratiosEnter.append('svg:g')
                .attr('transform', function(d, i) { return 'translate(100, ' + y(d, i) + ')' })
                .datum(function(d) { return d.data })
                .call(ratioBoxChart);

            var x = d3.scale.linear().domain([0, 1]).range([0, graphWidth]);
            var xAxis = d3.svg.axis()
                .scale(x)
                .tickValues(x.ticks(8))
                .orient('bottom');

            ratiosSvg.append('svg:g')
                .classed('x axis', true)
                .attr('transform', 'translate(100, ' + (ratios.length * 25 + 10) + ')')
                .call(xAxis);

            var counts = [
                { desc: 'used keys', data: data.usedKeyCount },
                { desc: 'keys', data: data.keyCount }
            ]

            var countBoxChart = ratioBoxChart
                .fillBar(false)
                .domain(null)
                .showAxis(true);

            var countsSvg = $this.append('div').append('svg')
                .classed('boxplot', true)
                .attr('width', chart._width)
                .attr('height', 40 * ratios.length);

            var countsG = countsSvg
                .selectAll('g')
                .data(counts);

            var countsEnter = countsG.enter();

            y = function(d, i) { return (i * 50 + 10) };

            countsEnter.append('svg:text')
                .attr('x', 90)
                .attr('y', y)
                .attr('dy', 13)
                .attr('text-anchor', 'end')
                .text(function(d) { return d.desc });

            countsEnter.append('svg:g')
                .attr('transform', function(d, i) { return 'translate(100, ' + y(d, i) + ')' })
                .datum(function(d) { return d.data })
                .call(countBoxChart);

        });
    }

    base.property(chart, 'big', false);
    base.property(chart, 'width', 450);

    return chart;
}

setUp();

})();
