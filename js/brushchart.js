Iris.define(["d3", "underscore", "charts/bar"], function (d3, _, BarChart) {
    var BrushChart = BarChart.extend({
        defaults: {
            margin: { top: 10, right: 10, bottom: 20, left: 10 },
            yPixels: 80
        },
        initialize: function (options) {
            var self = this;
            self.axis       = d3.svg.axis().orient("bottom");
            self.x = d3.scale.linear().domain([0, 1]).rangeRound([60, 500]);
            self.y = d3.scale.pow().exponent(.5).range([options.yPixels, 0]);
            self.id         = BrushChart.id++;
            self.brush      = d3.svg.brush();
            self.brushDirty = null;
            self.dimension  = options.dimension;
            self.group      = options.group;
            self.round      = null;
            self.axis.scale(self.x);
            self.brush.x(self.x);
            self.chart = function (div) {
                var width  = self.x.range()[1],
                    height = self.y.range()[0];

                self.y.domain([0, self.group.top(1)[0].value]);

                div.each(function () {
                    var div = d3.select(this),
                        g   = div.select("g");

                    // Create the skeletal chart.
                    if (g.empty()) {
                        div.select(".title")
                            .append("a")
                            .attr("href", "javascript:reset(" + self.id + ")")
                            .attr("class", "reset")
                            .text("reset")
                            .style("display", "none");

                        g = div.append("svg")
                            .attr("width",
                                width + options.margin.left +
                                        options.margin.right)
                            .attr("height",
                                height + options.margin.top +
                                         options.margin.bottom)
                            .append("g")
                            .attr("transform",
                                "translate(" + options.margin.left + "," +
                                     options.margin.top + ")");

                        g.append("clipPath")
                            .attr("id", "clip-" + self.id)
                            .append("rect")
                            .attr("width", width)
                            .attr("height", height);

                        g.selectAll(".bar")
                            .data(["background", "foreground"])
                            .enter()
                            .append("path")
                            .attr("class", function (d) { return d + " bar";})
                            .datum(self.group.all());

                        g.selectAll(".foreground.bar")
                            .attr("clip-path", "url(#clip-" + self.id + ")");

                        g.append("g")
                            .attr("class", "axis")
                            .attr("transform", "translate(0," + height + ")")
                            .call(self.axis);

                        // Initialize the brush component with pretty resize handles.
                        var gBrush = g.append("g").attr("class", "brush")
                            .call(self.brush);
                        gBrush.selectAll("rect").attr("height", height);
                        gBrush.selectAll(".resize").append("path")
                            .attr("d", resizePath);
                    }

                    // Only redraw the brush if set externally.
                    if (self.brushDirty) {
                        self.brushDirty = false;
                        g.selectAll(".brush").call(self.brush);
                        div.select(".title a")
                            .style("display",
                                self.brush.empty() ? "none" : null);
                        if (self.brush.empty()) {
                            g.selectAll("#clip-" + self.id + " rect")
                                .attr("x", 0)
                                .attr("width", width);
                        } else {
                            var extent = self.brush.extent();
                            g.selectAll("#clip-" + self.id + " rect")
                                .attr("x", self.x(extent[0]))
                                .attr("width",
                                    self.x(extent[1]) - self.x(extent[0])
                                );
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
                            "M", self.x(d.key), ",", height,
                            "V", self.y(d.value), "h", barWidth, "V", height
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
            var self = this;
            d3.select(this.options.element).style("height", 500);

            self.brush.on("brushstart.chart", function () {
                var div = d3.select(this.parentNode.parentNode.parentNode);
                div.select(".title a").style("display", null);
            });

            self.brush.on("brush.chart", function () {
                var g = d3.select(this.parentNode),
                    extent = self.brush.extent();
                if (self.round) g.select(".brush")
                    .call(brush.extent(extent = extent.map(self.round)))
                    .selectAll(".resize")
                    .style("display", null);
                g.select("#clip-" + self.id + " rect")
                    .attr("x", self.x(extent[0]))
                    .attr("width", self.x(extent[1]) - self.x(extent[0]));
                self.dimension.filterRange(extent);
            });

            self.brush.on("brushend.chart", function() {
                if (self.brush.empty()) {
                    var div = d3.select(this.parentNode.parentNode.parentNode);
                    div.select(".title a").style("display", "none");
                    div.select("#clip-" + self.id + " rect")
                        .attr("x", null)
                        .attr("width", "100%");
                    self.dimension.filterAll();
                }
            });

            d3.rebind(self.chart, self.brush, "on");
            d3.select(self.options.element).call(self.chart);
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