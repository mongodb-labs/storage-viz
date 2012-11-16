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

// Based on example code by Mike Bostock at http://mbostock.github.com/d3/ex/box.html

function boxChart() {
    // assumes datum has the form:
    // {
    //   count:
    //   kurtosis:
    //   max:
    //   mean:
    //   min:
    //   skewness:
    //   stddev:
    //   quantiles: { .01: _, .02: _, .09: _, .25: _, .50: _, .75: _, .91: _, .98: _ }
    // }

    base.property(chart, 'big', false);
    base.property(chart, 'domain', null);
    base.property(chart, 'scale', null);
    base.property(chart, 'width', 300);
    base.property(chart, 'height', 20);
    base.property(chart, 'fillBar', true);
    base.property(chart, 'showAxis', true);

    function chart(g) {
        g.each(function(data) {
            var g = d3.select(this);

            if (data.count == 0) {
                return;
            }

            // Compute the new x-scale.
            var domain = chart._domain || [data.min, data.max];
            var width = chart._width;
            var height = chart._height;
            var x = null;
            var ticks = null;
            if (data.min < data.max) {
                x = chart._scale || d3.scale.linear()
                                            .domain(domain)
                                            .range([0, width])
                                            .nice()
                                            .clamp(true);
                ticks = x.ticks(6);
            } else {
                x = d3.scale.linear()
                            .domain([Math.floor(data.min - data.min / 100),
                                     Math.ceil(data.max + data.max / 100)])
                            .range([0, width])
                            .nice()
                            .clamp(true);
                ticks = x.ticks(3);
            }

            // Update ticks
            // var boxTick = g.selectAll("text.box").data(x.ticks(8));

            // boxTick.enter().append("svg:text")
            //     .classed("box", true)
            //     .attr("x", x)
            //     .attr("dx", "0em")
            //     .attr("y", height + 15)
            //     .attr("text-anchor", "middle")
            //     .text(format);

            if (chart._fillBar) {
                var fillBar = g.selectAll("rect.fill-bar").data([data.mean]);

                fillBar.enter().append("svg:rect")
                    .classed("fill-bar", true)
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("width", x)
                    .attr("height", height);
            }

            if (chart._showAxis) {
                var xAxis = d3.svg.axis()
                    .scale(x)
                    .tickValues(ticks)
                    .tickSubdivide(1)
                    .orient("bottom");

                g.append("g")
                    .attr("transform", "translate(0, " + (height + 3) + ")")
                    .classed("x", true)
                    .classed("axis", true)
                    .call(xAxis);
            }
            // else {
            //     g.append("g")
            //         .attr("transform", "translate(0, " + (height + 1) + ")")
            //         .classed("x axis", true)
            //         .append("svg:path").attr("d", "M0,0H" + x(x.domain()[1]));
            // }

            // var rangeTicks = g.selectAll("line.tick").data(x.ticks(8));

            // rangeTicks.enter().append("svg:line")
            //     .classed("tick", true)
            //     .attr("x1", x)
            //     .attr("y1", height + 2)
            //     .attr("x2", x)
            //     .attr("y2", height + 5);

            if (data.quantiles) {
                // Update center line: the vertical line spanning the whiskers.
                var center = g.selectAll("line.center").data([[data.quantiles[.01], data.quantiles[.99]]]);

                center.enter().append("svg:line")
                    .classed("center", true)
                    .attr("y1", height / 2)
                    .attr("x1", function(d) { return x(d[0]); })
                    .attr("y2", height / 2)
                    .attr("x2", function(d) { return x(d[1]); });

                // Update innerquartile box.
                var box = g.selectAll("rect.box").data([[data.quantiles[.25], data.quantiles[.75]]]);

                box.enter().append("svg:rect")
                    .classed("box", true)
                    .attr("y", 0)
                    .attr("x", function(d) { return x(d[0]); })
                    .attr("height", height)
                    .attr("width", function(d) { return x(d[1]) - x(d[0]); });

                // Update median line.
                var medianLine = g.selectAll("line.median").data([data.quantiles[.5]]);

                medianLine.enter().append("svg:line")
                    .classed("median", true)
                    .attr("y1", 0)
                    .attr("x1", x)
                    .attr("y2", height)
                    .attr("x2", x);

                var median = g.selectAll("path.median").data([data.quantiles[.5]]);

                median.enter().append("svg:path")
                    .classed("median", true)
                    .attr("d", function(d) { return "M" + (x(d) - 6) + "," + height + "h12l-6,-6z" });

                // Update whiskers.
                var whisker = g.selectAll("line.whisker").data([data.quantiles[.01], data.quantiles[.99]]);

                whisker.enter().append("svg:line")
                    .classed("whisker", true)
                    .attr("y1", 0)
                    .attr("x1", x)
                    .attr("y2", height)
                    .attr("x2", x);
            }

            if (data.stddev > 0) {
                var stddev = g.selectAll("line.stddev")
                    .data([[data.mean - data.stddev, data.mean + data.stddev]]);

                stddev.enter().append("svg:path")
                    .classed("stddev", true)
                    .attr("d", function(d) { return "M" + x(d[0]) + ",6" + "v-6" + "H" + x(d[1]) + "v6" });
            }

            var mean = g.selectAll("path.mean").data([data.mean]);

            mean.enter().append("svg:path")
                .classed("mean", true)
                .attr("d", function(d) { return "M" + (x(d) - 6) + ",0" + "h12l-6,6Z" });

            // Update outliers.
            // var outlier = g.selectAll("circle.outlier")
            //     .data(outlierIndices, Number);

            // outlier.enter().insert("svg:circle", "text")
            //     .attr("class", "outlier")
            //     .attr("r", 5)
            //     .attr("cx", width / 2)
            //     .attr("cy", function(i) { return x0(d[i]); })

            // Update whisker ticks. These are handled separately from the box
            // ticks because they may or may not exist, and we want don't want
            // to join box ticks pre-transition with whisker ticks post-.
            // var whiskerTick = g.selectAll("text.whisker")
            //     .data(whiskerData || []);

            // whiskerTick.enter().append("svg:text")
            //     .attr("class", "whisker")
            //     .attr("dy", ".3em")
            //     .attr("dx", 6)
            //     .attr("x", width)
            //     .attr("y", x0)
            //     .text(format)
            //     .style("opacity", 1e-6)
            //   .transition()
            //     .duration(duration)
            //     .attr("y", x1)
            //     .style("opacity", 1);

            // whiskerTick.transition()
            //     .duration(duration)
            //     .text(format)
            //     .attr("y", x1)
            //     .style("opacity", 1);

            // whiskerTick.exit().transition()
            //     .duration(duration)
            //     .attr("y", x1)
            //     .style("opacity", 1e-6)
            //     .remove();
        });
    }

    return chart;
};

