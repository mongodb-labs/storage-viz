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
                   "&filter_analyze=pagesInRAM" +
                   // "<%=(extent) ? '&filter_extent=' + extent : ''%>" +
                   "<%=(granularity) ? '&filter_granularity=' + (granularity * 1024) : ''%>" +
                   "<%=(numberOfSlices) ? '&filter_numberOfSlices=' + numberOfSlices : ''%>";

var REQUEST_FORM_FIELDS = [
    { name: 'host', desc: 'host', type: 'text', default_: 'localhost:28017' },
    { name: 'database', desc: 'db', type: 'text', default_: 'test' },
    { name: 'collection', desc: 'collection', type: 'text', default_: 'test' },
    // { name: 'extent', desc: 'extent (opt)', type: 'text', default_: '' },
    { name: 'granularity', desc: 'granularity (Kb) (opt)', type: 'text', default_: '20' },
    { name: 'numberOfSlices', desc: 'number of slices (opt)', type: 'text', default_: '' }
]

function layoutHacks() {
    d3.selectAll('.slicesGraph')
        .style('max-width', window.document.documentElement.clientWidth - 150);
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

    var $extentsSummaryRow = d3.select('#extentsSummaryRow').style('display', 'none');
    var $extentsSummary = d3.select('#extentsSummary');
    $extentsSummary.selectAll('*').remove();

    var basicInfoRow = d3.select('#basicInfoRow');
    basicInfoRow.selectAll('*').remove();
    d3.selectAll('.extentRow').remove();

    var SUMMARY_BAR_WIDTH = 20;
    var BAR_HEIGHT = 70;
    var BAR_WIDTH = 4;

    if (_data.extents) {
        $extentsSummaryRow.style('display', null);

        basicInfoRow.append('div')
            .classed('grid-td', true)
            .html('page size: ' + base.fmt.suffix(_data.extents[0].pageBytes));
        basicInfoRow.append('div')
            .classed('grid-td', true)
            .html('each bar in summary refers to the ratio of pages in ram for an extent, ' +
                  'click on them to find the detailed view for the extent');


        var summaryX = function(d, i) { return (SUMMARY_BAR_WIDTH + 10) * i };

        $extentsSummary.append('svg')
            .attr('width', summaryX(null, _data.extents.length) + 1)
            .attr('height', BAR_HEIGHT + 20)
            .selectAll('g.extent')
            .data(_data.extents)
            .enter()
            .append('svg:g')
            .attr('width', SUMMARY_BAR_WIDTH)
            .attr('height', BAR_HEIGHT)
            .classed('extent', true)
            .attr('transform', function(d, i) { return 'translate(' + summaryX(d, i) + ', 0)' })
            .call(summaryBar().width(SUMMARY_BAR_WIDTH).height(BAR_HEIGHT))
            .on('click', function(datum, i) {
                d3.selectAll('.extentRow')
                    .classed('highlighted', false);
                d3.select('.extentRow-' + i)
                    .classed('highlighted', true)
                    .node().scrollIntoView();
            })
            .append('svg:text')
            .attr('x', SUMMARY_BAR_WIDTH / 2)
            .attr('y', BAR_HEIGHT + 15)
            .style('text-anchor', 'middle')
            .text(function(d, i) { return '' + (i + 1) });
        
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

        var extentChartDiv = extentRowEnter.append('div')
            .classed('grid-td extentChart', true);

        extentChartDiv.append('div')
            .classed('extentSize', true)
            .text(function(d, i) { return base.fmt.suffix(d.onDiskBytes) });

        extentChartDiv.append('svg')
            .attr('width', SUMMARY_BAR_WIDTH + 1)
            .attr('height', BAR_HEIGHT + 1)
            .call(summaryBar().width(SUMMARY_BAR_WIDTH).height(BAR_HEIGHT));

        extentChartDiv.append('div')
            .classed('extentPercent', true)
            .text(function(d, i) { return base.fmt.ratioToPercent(d.inMem) });

        extentRowEnter.append('div')
            .classed('grid-td slicesGraph', true)
            .append('svg')
            .attr('height', BAR_HEIGHT + 30)
            .attr('width', function(d) {
                return d.slices ? d.slices.length * BAR_WIDTH + 20 : 0
            })
            .append('g')
            .attr('transform', 'translate(10, 0)')
            .call(slicesInRAMPlot().sliceWidth(BAR_WIDTH).height(BAR_HEIGHT));


    } else {
        d3.select('#resultString').text('single extent mode is not supported yet');
    }

    layoutHacks();
};

function summaryBar() {

    base.property(chart, 'width', 20);
    base.property(chart, 'height', 80);

    function chart(g) {
        g.each(function(data) {
            var g = d3.select(this);

            g.append('rect')
                .classed('border', true)
                .attr('width', chart._width)
                .attr('height', chart._height);

            var summaryY = d3.scale.linear().domain([0, 1]).range([chart._height, 0]);
            var summaryHeight = summaryY.copy().range([0, chart._height]);

            g.selectAll('rect.inRAM')
                .data(function(d, i) { return [d.inMem] })
                .enter()
                .append('rect')
                .classed('inRAM', true)
                .attr('width', chart._width)
                .attr('height', summaryHeight)
                .attr('y', summaryY);
        });
    }

    return chart;
}

function slicesInRAMPlot() {

    base.property(chart, 'sliceWidth', 2);
    base.property(chart, 'height', 80);

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
                .tickSubdivide(1)
                .tickFormat(function(d) { return base.fmt.suffix(d * data.sliceBytes) })
                .orient('bottom');

            g.append('g')
                .attr('transform', 'translate(0, ' + (chart._height) + ')')
                .classed('x axis', true)
                .call(xAxis);

            var y = d3.scale.linear().domain([0, 1]).range([chart._height, 0]);
            var height = y.copy().range([0, chart._height]);

            g.selectAll('rect.slice')
                .data(function(d, i) { return d.slices })
                .enter()
                .append('rect')
                .classed('slice', true)
                .attr('x', function(d, i) { return x(i) })
                .attr('width', chart._sliceWidth)
                .attr('y', y)
                .attr('height', height);

            g.append('svg:path')
                .classed('frame', true)
                .attr('d', 'M0,' + chart._height + 'V0' + 'h' + x(length) + 'v' + chart._height);

        });
    }

    return chart;
}

setUp();

})();
