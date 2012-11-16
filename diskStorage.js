// index.js

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

(function() {

var URL_TEMPLATE = "http://<%=host%>/<%=database%>/$cmd/?filter_storageDetails=<%=collection%>" +
                   "&filter_analyze=diskStorage" +
                   // "<%=(extent) ? '&filter_extent=' + extent : ''%>" +
                   "<%=(granularity) ? '&filter_granularity=' + (granularity * 1024) : ''%>" +
                   "<%=(numberOfSlices) ? '&filter_numberOfSlices=' + numberOfSlices : ''%>";

var REQUEST_FORM_FIELDS = [
    { name: 'host', desc: 'host', type: 'text', default_: 'localhost:28017' },
    { name: 'database', desc: 'db', type: 'text', default_: 'test' },
    { name: 'collection', desc: 'collection', type: 'text', default_: 'test' },
    // { name: 'extent', desc: 'extent (opt)', type: 'text', default_: '' },
    { name: 'granularity', desc: 'granularity (Kb) (opt)', type: 'text', default_: '2048' },
    { name: 'numberOfSlices', desc: 'number of slices (opt)', type: 'text', default_: '' }
]

function layoutHacks() {
    console.log('hacks');
    d3.selectAll('.extentGraph')
        .style('max-width', document.documentElement.clientWidth - 70);

}

function setUp() {
    var requestForm = d3.select('#requestForm');
    base.generateFormFields(requestForm, REQUEST_FORM_FIELDS, function() {
        var reqParams = base.collectFormValues(requestForm, REQUEST_FORM_FIELDS);
        console.log(reqParams);
        var url = base.tmpl(URL_TEMPLATE, reqParams);
        d3.select('#resultString').text('fetching ' + url + '...');
        base.jsonp(url, 'handleData');
    });

    var $extentSummaryRow = d3.select('#extentSummaryRow');
    var $spaceFiller = d3.select('#spaceFiller');

    d3.select(window).on('scroll', function(a) {
        if (window.scrollY > 85) {
            $extentSummaryRow.style('position', 'fixed');
            $extentSummaryRow.style('top', '0');
            $spaceFiller.style('min-height', $extentSummaryRow.node().clientHeight);
        } else {
            $extentSummaryRow.style('position', null);
            $extentSummaryRow.style('top', null);
            $spaceFiller.style('min-height', null);
        }
    });

    d3.select(window).on('resize', layoutHacks);
}

this.handleData = function handleData(data) {
    _data = data.rows[0];
    if (!_data.ok) {
        d3.select('#resultString').text('error: ' + _data.errmsg);
        return;
    }
    d3.select('#resultString').text('executed command with params ' + JSON.stringify(data.query) +
                                    ', rendering');
    console.log(_data);

    d3.select('#resultString').text('executed command ' + JSON.stringify(data.query));

    var basicInfoRow = d3.select('#basicInfoRow');
    basicInfoRow.selectAll('*').remove();

    var SUMMARY_BAR_WIDTH = 20;
    var BAR_HEIGHT = 120;
    var BAR_WIDTH = 6;

    var $extentSummary = d3.select('#extentSummary');
    $extentSummary.selectAll('*').remove();
    d3.select('#container').selectAll('.extentRow').remove();
    var $infoBox = d3.select('#infoBox');
    $infoBox.selectAll('*').remove();
    $infoBox.append('div').text('click on bars for details');

    var updateInfoBox = function(datum) {
        $infoBox.selectAll('*').remove();
        $infoBox.datum(datum).call(infoBox());
    };

    if (_data.extents) {
        $extentSummary.style('display', null);
        d3.select('#extentSummaryHeader').style('display', null);
        var summaryX = function(d, i) { return i * (SUMMARY_BAR_WIDTH + 10) };
        $extentSummary
            .append('svg')
            .attr('width', summaryX(null, _data.extents.length))
            .attr('height', BAR_HEIGHT + 1)
            .selectAll('g')
            .data(_data.extents)
            .enter()
            .append('svg:g')
            .classed('summaryBar', true)
            .attr('transform', function(d, i) { return 'translate(' + summaryX(d, i) + ', 0)' })
            .call(spaceUsageBar().width(SUMMARY_BAR_WIDTH).height(BAR_HEIGHT))
            .on('click', function(datum, i) {
                d3.selectAll('.extentRow')
                    .classed('highlighted', false);
                d3.select('.extentRow-' + i)
                    .classed('highlighted', true)
                    .node().scrollIntoView(false);
                updateInfoBox(datum);
            });

        var extentRowEnter = d3.select('#container')
            .selectAll('.extentRow')
            .data(_data.extents)
            .enter()
            .append('div')
            .attr('class', function(d, i) { return 'extentRow-' + i })
            .classed('grid-tr extentRow', true);

        extentRowEnter.append('div')
            .classed('grid-td left-table-header', true)
            .append('span')
            .text(function(d, i) { return 'extent ' + (i + 1) });

        var extentSummary = extentRowEnter.append('div')
            .classed('grid-td extentSummary', true);
        
        extentSummary.selectAll('div.onDiskBytes')
            .data(function(d) { return [d] })
            .enter()
            .append('div')
            .classed('onDiskBytes', true)
            .text(function(d) { return base.fmt.suffix(d.onDiskBytes) });
            
        extentSummary.append('svg')
            .attr('width', SUMMARY_BAR_WIDTH + 2)
            .attr('height', BAR_HEIGHT + 1)
            .selectAll('g.summaryBar')
            .data(function(d) { return [d] })
            .enter()
            .append('svg:g')
            .classed('summaryBar', true)
            .call(spaceUsageBar().width(SUMMARY_BAR_WIDTH).height(BAR_HEIGHT))
            .on('click', updateInfoBox);
        
        extentRowEnter.append('div')
            .classed('grid-td extentGraph', true)
            .append('svg')
            .attr('width', function(d, i) {
                return (d.slices ? d.slices.length : 0) * BAR_WIDTH + 40;
            })
            .attr('height', BAR_HEIGHT + 20)
            .append('g')
            .attr('transform', 'translate(10, 0)')
            .call(slicesUsagePlot().sliceWidth(BAR_WIDTH)
                                   .height(BAR_HEIGHT)
                                   .onClick(updateInfoBox));
    } else {
        d3.select('#resultString').text('single extent mode is not supported yet');
    }

    layoutHacks();
};

function slicesUsagePlot() {

    base.property(chart, 'sliceWidth', 10);
    base.property(chart, 'height', 80);
    base.property(chart, 'onClick', function() {});

    function chart(g) {
        g.each(function(data) {
            var g = d3.select(this);

            if (!data.slices) {
                return;
            }

            var length = data.slices.length;

            var x = d3.scale.linear().domain([0, length]).range([0, length * chart._sliceWidth]);

            var xAxis = d3.svg.axis()
                .scale(x)
                .tickValues(d3.range(0, data.slices.length, 16))
                .tickFormat(function(d) { return base.fmt.suffix(d * data.slices[0].onDiskBytes) })
                .orient('bottom');

            g.append('g')
                .attr('transform', 'translate(0, ' + chart._height + ')')
                .classed('x axis', true)
                .call(xAxis);

            g.selectAll('g.sliceBar')
                .data(function(d) { return (d.slices ? d.slices : []) })
                .enter()
                .append('svg:g')
                .classed('sliceBar', true)
                .attr('transform', function(d, i) { return 'translate(' + x(i) + ', 0)' })
                .call(spaceUsageBar().width(chart._sliceWidth - 1).height(chart._height))
                .on('click', chart._onClick);

            g.append('svg:path')
                .classed('frame', true)
                .attr('d', 'M0,' + chart._height + 'V0' + 'h' + x(length) + 'v' + chart._height);

        });
    }

    return chart;
}

function spaceUsageBar() {
    // assumes datum has the form:
    //      {
    //        numEntries:
    //        outOfOrderRecs:
    //        onDiskBytes:
    //        recBytes:
    //        bsonBytes:
    //        isCapped:
    // (opt)  freeRecsPerBucket: [arr]
    //      }

    base.property(chart, 'width', 6);
    base.property(chart, 'height', 100);

    function chart(g) {
        g.each(function(data) {
            var g = d3.select(this);

            var y = d3.scale.linear().domain([0, data.onDiskBytes]).range([chart._height, 0]);
            var yHeight = d3.scale.linear().domain([0, data.onDiskBytes]).range([0, chart._height]);

            g.append('rect')
                .classed('spaceUsageBar', true)
                .attr('height', chart._height)
                .attr('width', chart._width);

            g.selectAll('rect.recBytes')
                .data([data.recBytes])
                .enter().append('svg:rect')
                .classed('recBytes', true)
                .attr('y', y)
                .attr('height', yHeight)
                .attr('width', chart._width);

            g.selectAll('rect.bsonBytes')
                .data([data.bsonBytes])
                .enter().append('svg:rect')
                .classed('bsonBytes', true)
                .attr('y', y)
                .attr('height', yHeight)
                .attr('width', chart._width);

            g.append('rect')
                .classed('border', true)
                .attr('height', chart._height)
                .attr('width', chart._width);

        });
    }

    return chart;
}

function infoBox() {

    function chart(g) {
        g.each(function(data) {
            var g = d3.select(this);
            g.style('vertical-align', 'top');

            var summaryTable = g.append('table').style('display', 'inline-block');
            summaryTable.style('vertical-align', 'top');
            [
                ["size", "<%=base.fmt.ratioToPercent(1)%>",
                 "<%=base.fmt.suffixAndBytes(onDiskBytes)%>"],
                ["records", "", "<%=numEntries%>"],
                ["record size", "<%=base.fmt.ratioToPercent(recBytes / onDiskBytes)%>",
                 "<%=base.fmt.suffixAndBytes(recBytes)%>"],
                ["bson size", "<%=base.fmt.ratioToPercent(bsonBytes / onDiskBytes)%>",
                 "<%=base.fmt.suffixAndBytes(bsonBytes)%>"]
            ].map(function(x) {
                var row = summaryTable.append('tr');
                x.map(function(d) { row.append('td').text(base.tmpl("<%=''%>" + d, data)) });
            });

            var delRecDiv = g.append('div').style('display', 'inline-block');
            delRecDiv.style('border', '1px solid #aaa');
            delRecDiv.append('span').style('text-align', 'center')
                .style('font-weight', 'bold').text('deleted records');
            delRecDiv.append('br');
            var i = 0;
            data.freeRecsPerBucket.map(function(x) {
                var ddd = delRecDiv.append('div')
                    .style('display', 'inline-block')
                    .style('padding', '5px');
                ddd.append('span').text(base.fmt.suffix(Math.pow(2, i + 5)) + ": ");
                ddd.append('span').text(x);
                i++;
                if (i % 5 == 0) {
                    delRecDiv.append('br');
                }
            });
            row.append('td').text('a');
        });
    }

    return chart;
}

setUp();

})();
