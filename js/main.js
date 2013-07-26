var input = "http://brie.cshl.edu/~olson/refData.json";
// var input = "./refData.json";
var formatNumber = d3.format(",d");
iris.require(["renderers/heatmap", "underscore", "jquery", "js/brushchart"],
function (Heatmap, _, $, BrushChart) {
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
            BrushChart()
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

        window.reset = function (i) {
            charts[i].filter(null);
            renderCharts();
        };
    });
});
