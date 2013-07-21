// var input = "http://brie.cshl.edu/~olson/refData.json";
var input = "./refData.json";
var formatNumber = d3.format(",d");
function barChart() {
    if (!barChart.id) barChart.id = 0;

    var margin = { top: 10, right: 10, bottom: 20, left: 10 },
        x,
        y = d3.scale.pow().exponent(.5).range([80, 0]),
        id = barChart.id++,
        axis = d3.svg.axis().orient("bottom"),
        brush = d3.svg.brush(),
        brushDirty,
        dimension,
        group,
        round;

    function chart(div) {
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
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform",
                        "translate(" + margin.left + "," + margin.top + ")");

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

    brush.on("brushstart.chart", function () {
        var div = d3.select(this.parentNode.parentNode.parentNode);
        div.select(".title a").style("display", null);
    });

    brush.on("brush.chart", function () {
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

    brush.on("brushend.chart", function() {
        if (brush.empty()) {
            var div = d3.select(this.parentNode.parentNode.parentNode);
            div.select(".title a").style("display", "none");
            div.select("#clip-" + id + " rect")
                .attr("x", null)
                .attr("width", "100%");
            dimension.filterAll();
        }
    });

    chart.margin = function(_) {
        if (!arguments.length) return margin;
        margin = _;
        return chart;
    };

    chart.x = function(_) {
        if (!arguments.length) return x;
        x = _;
        axis.scale(x);
        brush.x(x);
        return chart;
    };

    chart.y = function(_) {
        if (!arguments.length) return y;
        y = _;
        return chart;
    };

    chart.dimension = function(_) {
        if (!arguments.length) return dimension;
        dimension = _;
        return chart;
    };

    chart.filter = function(_) {
        if (_) {
            brush.extent(_);
            dimension.filterRange(_);
        } else {
            brush.clear();
            dimension.filterAll();
        }
        brushDirty = true;
        return chart;
    };

    chart.group = function(_) {
        if (!arguments.length) return group;
        group = _;
        return chart;
    };

    chart.round = function(_) {
        if (!arguments.length) return round;
        round = _;
        return chart;
    };

    return d3.rebind(chart, brush, "on");
}

iris.require(["renderers/heatmap", "underscore", "jquery"],
function (Heatmap, _, $) {
    var BINS = 25;
    function log10(v) {
        return Math.log(v) / Math.log(10);
    }
    function byBin(v) {
        // return Math.round(Math.abs(v - 1/BINS/2) * BINS) / BINS;
        return Math.floor(v * 0.99 * BINS) / BINS;
    }
    function loadMethData(callback) {
        $.getJSON(input, function (data) {
            var meth = crossfilter(data);
            callback(meth);
        }).fail(function () {
            // TODO: Something more useful.
            console.log("Uhoh", arguments);
        });
    }
    loadMethData(function (cf) {
        var all   = cf.groupAll();
        var Dims = {
            wga:  { key: "WGA" },
            meth: { key: "CHG" }
        };
        function dimGroupPair(key) {
            var dim = cf.dimension(function (d) { return d[key]; });
            return {
                dim: dim,
                group: dim.group(byBin).reduceCount()
            };
        }
        for (var type in Dims) {
            var column = Dims[type];
            var pair = dimGroupPair(column.key);
            column.dim = pair.dim;
            column.group = pair.group;
        }

        var maxMeth = log10(Dims.wga.group.top(1)[0].value);
        var binLabels = _.pluck(Dims.wga.group.all(), "key");
        $("#status #total").text(formatNumber(cf.size()));

        function binValues(type1, type2) {
            var dim1 = Dims[type1].dim,
                dim2 = Dims[type2].dim,
                grp1 = Dims[type1].group,
                grp2 = Dims[type2].group,
                filtered =
                    cf.dimension(function (d) { return d[Dims[type2].key]; }),
                measures = filtered.group(byBin).reduceCount(),
                values = [],
                binStart = 0;
            grp1.all().forEach(function (m, i) {
                dim1.filter([binStart, m.key]);
                measures.all().forEach(function (v, j) {
                    values.push([j, i, log10(v.value)]);
                });
                binStart = m.key;
            });
            dim1.filterAll();
            return values;
        }

        var charts, chart, heatmap;
        
        function renderCharts() {
            chart.each(render);
            var values = binValues("meth", "wga");
            $("#status #selected").text(formatNumber(all.value()));
            heatmap.setData({
                rows:     binLabels,
                columns:  binLabels,
                matrix:   values,
                maxScore: maxMeth 
            });
            heatmap.render();
        }
        function render(method) { d3.select(this).call(method); }

        var wgaPair = dimGroupPair("WGA");
        charts = [
            barChart()
                .dimension(wgaPair.dim)
                .group(wgaPair.group)
                .x(d3.scale.linear()
                    .domain([0, 1])
                    .rangeRound([60, 500])
                ),
        ];
        chart = d3.selectAll(".chart")
            .data(charts)
            .each(function (chart) {
                chart.on("brush", renderCharts)
                    .on("brushend", renderCharts);
            });

        heatmap = new Heatmap({
            element: "#datavis",
            colorscheme: "Spectral",
            borderWidth: 0
        });
        charts[0].filter(null);
        renderCharts();

        window.filter = function (filters) {
            filters.forEach(function (d, i) { charts[i].filter(d); });
            renderCharts();
        };
        
        window.reset = function(i) {
            charts[i].filter(null);
            renderCharts();
        };
    });
});
