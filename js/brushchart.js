Iris.define(["d3", "underscore", "charts/bar"], function (d3, _, BarChart) {
    var defaults = {
        margin: { top: 10, right: 10, bottom: 20, left: 10 },
        yPixels: 80
    };
    var BrushChart = BarChart.extend({
        initialize: function (options) {
            this.axis       = d3.svg.axis().orient("bottom");
            this.x = d3.scale.linear().domain([0, 1]).rangeRound([60, 500]);
            this.y = d3.scale.pow().exponent(.5).range([options.yPixels, 0]);
            this.id         = BrushChart.id++;
            this.brush      = d3.svg.brush();
            this.brushDirty = null;
            this.dimension  = options.dimension;
            this.group      = options.group;
            this.round      = null;
            this.axis.scale(this.x);
            this.brush.x(this.x);
            this.chart = function (div) {
                var width  = x.range()[1],
                    height = y.range()[0];

                y.domain([0, group.top(1)[0].value]);

                div.each(function () {
                    var div = d3.select(this),
                        g   = div.select("g");

                    // Create the skeletal chart.
                    if (g.empty()) {
                        div.select(".title")
                            .append("a")
                            .attr("href", "javascript:reset(" + id + ")")
                            .attr("class", "reset")
                            .text("reset")
                            .style("display", "none");

                        g = div.append("svg")
                            .attr("width",
                                width + options.margin.left + options.margin.right)
                            .attr("height",
                                height + options.margin.top + options.margin.bottom)
                            .append("g")
                            .attr("transform",
                                "translate(" + options.margin.left + "," +
                                     options.margin.top + ")");

                        g.append("clipPath")
                            .attr("id", "clip-" + id)
                            .append("rect")
                            .attr("width", width)
                            .attr("height", height);

                        g.selectAll(".bar")
                            .data(["background", "foreground"])
                            .enter()
                            .append("path")
                            .attr("class", function (d) { return d + " bar";})
                            .datum(group.all());

                        g.selectAll(".foreground.bar")
                            .attr("clip-path", "url(#clip-" + id + ")");

                        g.append("g")
                            .attr("class", "axis")
                            .attr("transform", "translate(0," + height + ")")
                            .call(axis);

                        // Initialize the brush component with pretty resize handles.
                        var gBrush = g.append("g").attr("class", "brush").call(brush);
                        gBrush.selectAll("rect").attr("height", height);
                        gBrush.selectAll(".resize").append("path")
                            .attr("d", resizePath);
                    }

                    // Only redraw the brush if set externally.
                    if (brushDirty) {
                        brushDirty = false;
                        g.selectAll(".brush").call(brush);
                        div.select(".title a")
                            .style("display", brush.empty() ? "none" : null);
                        if (brush.empty()) {
                            g.selectAll("#clip-" + id + " rect")
                                .attr("x", 0)
                                .attr("width", width);
                        } else {
                            var extent = brush.extent();
                            g.selectAll("#clip-" + id + " rect")
                                .attr("x", x(extent[0]))
                                .attr("width", x(extent[1]) - x(extent[0]));
                        }
                    }

                    g.selectAll(".bar").attr("d", barPath);
                });

                function barPath(groups) {
                    var path = [],
                        i = -1,
                        n = groups.length,
                        d,
                        barWidth = 13;
                    while (++i < n) {
                        d = groups[i];
                        path.push(
                            "M", x(d.key), ",",
                            height, "V", y(d.value), "h", barWidth, "V", height
                        );
                    }
                    return path.join("");
                }

                function resizePath(d) {
                    var e = +(d == "e"),
                        x = e ? 1 : -1,
                        y = height / 3;
                    return "M" + (.5 * x) + "," + y +
                        "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6) +
                        "V" + (2 * y - 6) +
                        "A6,6 0 0 " + e + " " + (.5 * x) + "," + (2 * y) +
                        "Z" +
                        "M" + (2.5 * x) + "," + (y + 8) +
                        "V" + (2 * y - 8) +
                        "M" + (4.5 * x) + "," + (y + 8) +
                        "V" + (2 * y - 8);
                }
            }
        },
        render: function (options) {

            this.brush.on("brushstart.chart", function () {
                var div = d3.select(this.parentNode.parentNode.parentNode);
                div.select(".title a").style("display", null);
            });

            this.brush.on("brush.chart", function () {
                var g = d3.select(this.parentNode),
                    extent = brush.extent();
                if (round) g.select(".brush")
                    .call(brush.extent(extent = extent.map(round)))
                    .selectAll(".resize")
                    .style("display", null);
                g.select("#clip-" + id + " rect")
                    .attr("x", x(extent[0]))
                    .attr("width", x(extent[1]) - x(extent[0]));
                dimension.filterRange(extent);
            });

            this.brush.on("brushend.chart", function() {
                if (this.brush.empty()) {
                    var div = d3.select(this.parentNode.parentNode.parentNode);
                    div.select(".title a").style("display", "none");
                    div.select("#clip-" + id + " rect")
                        .attr("x", null)
                        .attr("width", "100%");
                    dimension.filterAll();
                }
            });

            d3.rebind(this.chart, this.brush, "on");
        },
        filter: function (range) {
            if (range) {
                this.brush.extent(range);
                this.dimension.filterRange(range);
            } else {
                this.brush.clear();
                this.dimension.filterAll();
            }
            this.brushDirty = true;
            return this;
        }
    });
    BrushChart.id = 0;
    return BrushChart;
});